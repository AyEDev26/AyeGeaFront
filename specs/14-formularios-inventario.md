# SPEC 14 — Formularios de alta y edición de inventario: vehículos, maquinaria y EPIs

> **Status:** Aprobado
> **Depends on:** SPEC 13 (listados de inventario, `InventarioListTable.vue`, store `elemsInventario.ts`, rutas `inventario/*`), SPEC 10 (categorías, subcategorías y tipos de elemento), SPEC 09 (periodicidades), SPEC 08 (proveedores). Usa los stores existentes de delegaciones, ubicaciones y departamentos.
> **Date:** 2026-10-23
> **Objective:** Añadir tres pantallas con formulario para crear y editar elementos de inventario (vehículos, maquinaria y EPIs), con selectores alimentados por los endpoints auxiliares de la API y por `users/selector`, además de borrado y subida de imagen desde el listado y el formulario.

---

## Scope

**In:**

- **Rutas** en `src/router/routes.ts` (hijas de `MainLayout`, `requiresAuth: true`):
  - `inventario/vehiculos/nuevo` y `inventario/vehiculos/:id/editar` → `VehiculoFormPage.vue`
  - `inventario/maquinaria/nuevo` y `inventario/maquinaria/:id/editar` → `MaquinariaFormPage.vue`
  - `inventario/epis/nuevo` y `inventario/epis/:id/editar` → `EpiFormPage.vue`
  - `nuevo` exige `elementos_inventario.crear`; `:id/editar` exige `elementos_inventario.editar`.
- **Páginas finas** en `src/pages/inventario/`: cada una solo declara su tipo (`tipoElementoInventarioId` 1, 2 o 3) y el componente base. Una misma página sirve para alta (sin `:id`) y edición (con `:id`).
- **Componente base** `src/components/inventario/InventarioForm.vue`: `AdminPageWrapper` + `GlassCard`, título `text-h5 text-teal-10 font-outfit`, campos `q-input` / `q-select` `outlined dense elegant-input`, botones "Guardar" / "Cancelar". Secciones: datos generales, ubicación y proveedor, fechas y baja, bloque específico del tipo, imagen.
- **Campos comunes** (todos los de la API): `nombre` (obligatorio, máx. 250), `descripcion` (máx. 250), `referencia` (máx. 20, única), `categoria_id` (obligatorio, solo categorías del tipo), `subcategoria_id` (dependiente de la categoría), `estado_id`, `fecha_alta`, `fecha_baja`, `motivo_baja` (máx. 255), `delegacion_id`, `ubicacion_id` (dependiente de la delegación), `departamento_id`, `localizacion` (máx. 255), `comentario` (máx. 255), `proveedor_id`, `n_serie` (máx. 45).
- **Bloque Vehículo** (`vehiculo`): `matricula` (máx. 10), `marca` (45), `modelo` (45), `fecha_compra`, `ultima_revision`, `proxima_revision`, `estado_revision_id`, `renting`, `precio`, `kms_actuales`, `horas_actuales`, `responsable_id`, `vehiculo_especial`, `tipo_funcionamiento_id`, `critico`.
- **Bloque Maquinaria** (`maquinaria`): `marca` (45), `modelo` (45), `fecha_compra`, `ultima_revision`, `proxima_revision`, `estado_revision_id`, `cod_inversion` (100), `precio`, `responsable_id`, `vehiculo_id` (vehículo en el que está montada), `periodicidad_id`, `critico`. `en_vehiculo` no es un campo del formulario: se envía `true` si hay `vehiculo_id` y `false` si no.
- **Bloque EPI** (`epi`): `stock_minimo`.
- **Selectores y fuentes de datos:**
  - Estado del elemento: `GET /estados` (Activo/Inactivo).
  - Estado de revisión: `GET /estados-revision`.
  - Tipo de funcionamiento: `GET /tipos-funcionamiento` (solo vehículos).
  - Responsable: `GET /users/selector` (campos `id`, `name`).
  - Categorías y subcategorías, delegaciones, ubicaciones, departamentos, proveedores y periodicidades: los `fetchAll*` de los stores existentes (se añaden los que falten, como en SPEC 13).
  - Vehículo (solo maquinaria): elementos de `GET /elems-inventario?tipo_elemento_inventario_id=1`, recorriendo todas las páginas con `per_page=100`, mostrando referencia/matrícula y nombre.
  - Dependencias: al cambiar la categoría se limpia la subcategoría; al cambiar la delegación se limpia la ubicación; la ubicación solo lista las de la delegación elegida.
- **Alta:** `POST /elems-inventario` con `tipo_elemento_inventario_id` fijo por página y solo el bloque del tipo. **Edición:** carga con `GET /elems-inventario/{id}` y guarda con `PUT /elems-inventario/{id}` (el tipo no se puede cambiar; si el `id` no es del tipo de la ruta se muestra error y se vuelve al listado).
- **Borrado:** `DELETE /elems-inventario/{id}` desde el listado, con diálogo de confirmación (permiso `elementos_inventario.eliminar`).
- **Imagen:** `POST /elems-inventario/{id}/imagen` (multipart, campo `imagen`; jpeg, png o webp, máx. 5 MB, validado en cliente). En edición se muestra la `imagenUrl` actual y se puede reemplazar; en alta la imagen elegida se sube tras crear el elemento.
- **Listado** (`InventarioListTable.vue`): botón "Nuevo" (visible con `elementos_inventario.crear`) y columna de acciones con "Editar" (`elementos_inventario.editar`) y "Eliminar" (`elementos_inventario.eliminar`). Es el cambio a la SPEC 13, que no tenía acciones.
- **Store** `src/stores/elemsInventario.ts`: añadir `fetchElem(id)`, `createElem`, `updateElem`, `deleteElem` y `uploadImagen`. Tras crear, editar o borrar, el estado en caché del tipo se invalida para recargar el listado.
- **Stores auxiliares:** nuevo `src/stores/auxiliaresInventario.ts` con `fetchEstados`, `fetchEstadosRevision` y `fetchTiposFuncionamiento`; `fetchUsersSelector` en `src/stores/users.ts` (o en el store auxiliar si encaja mejor al implementar).
- **Tras guardar** con éxito: notificación de éxito y vuelta al listado del tipo. Errores 422 de la API se muestran en el campo correspondiente cuando se pueden mapear; el resto con `getApiErrorMessage` en `red-9`. El formulario conserva los datos si falla.
- **i18n** (`es` y `en-US`): `inventario.form.*` (títulos de alta/edición, secciones, etiquetas, validaciones, confirmaciones, imagen) y las acciones del listado.

**Out of scope (for future specs):**

- Pantalla de detalle de solo lectura y filas clicables.
- Mantenimientos, revisiones, historial de responsables y flujos de baja más allá de editar `fecha_baja` / `motivo_baja`.
- Ordenación en servidor, exportación, importación masiva.
- Duplicar elementos, edición masiva y borrado múltiple.
- Selects con búsqueda en servidor y autocompletado.
- Recorte o edición de imágenes; varias imágenes por elemento.
- Cambiar el tipo de un elemento ya creado.

---

## Data model

Contrato con la API: `POST` / `PUT /elems-inventario` con campos comunes y un bloque `vehiculo`, `maquinaria` o `epi` (ver `ElemInventarioVehiculoInput`, `ElemInventarioMaquinariaInput`, `ElemInventarioEpiInput`). Los auxiliares devuelven `{ data: [{ id, descripcion }] }`; `users/selector` devuelve `{ data: [{ id, name }] }`.

```ts
// Estado del formulario (camelCase); el store lo mapea a snake_case al enviar
interface ElemInventarioForm {
  nombre: string;
  descripcion: string | null;
  referencia: string | null;
  categoriaId: number | null;
  subcategoriaId: number | null;
  estadoId: 0 | 1; // por defecto 1
  fechaAlta: string | null; // date-time
  fechaBaja: string | null;
  motivoBaja: string | null;
  delegacionId: number | null;
  ubicacionId: number | null;
  departamentoId: number | null;
  localizacion: string | null;
  comentario: string | null;
  proveedorId: number | null;
  nSerie: string | null;
  vehiculo?: {
    matricula: string | null; marca: string | null; modelo: string | null;
    fechaCompra: string | null; ultimaRevision: string | null; proximaRevision: string | null;
    estadoRevisionId: number | null; renting: boolean; precio: number | null;
    kmsActuales: number | null; horasActuales: number | null; responsableId: number | null;
    vehiculoEspecial: boolean; tipoFuncionamientoId: number | null; critico: boolean;
  };
  maquinaria?: {
    marca: string | null; modelo: string | null; fechaCompra: string | null;
    ultimaRevision: string | null; proximaRevision: string | null; estadoRevisionId: number | null;
    codInversion: string | null; precio: number | null; responsableId: number | null;
    vehiculoId: number | null; periodicidadId: number | null; critico: boolean;
  };
  epi?: { stockMinimo: number | null };
}

interface DescripcionOption { id: number; descripcion: string } // auxiliares
interface UserSelectorOption { id: number; name: string }       // users/selector
```

Convenciones:

- Los campos de texto vacíos se envían como `null`, no como string vacío. Los booleanos siempre se envían.
- `tipo_elemento_inventario_id` solo se envía en el alta.
- La matrícula se normaliza en el backend (mayúsculas, sin espacios ni guiones); el formulario no la transforma.
- La spec no crea endpoints; consume los existentes. Los nombres exactos de los bloques en `GET /elems-inventario/{id}` (p. ej. `proxima_revision`, `responsable_id`) se confirman en el paso 2 contra una respuesta real y se ajusta el mapeo.

---

## Implementation plan

1. **i18n.** Añadir las claves `inventario.form.*` y de acciones en `es` y `en-US`. Verificación: type-check sin errores.
2. **Stores.** Crear `auxiliaresInventario.ts`; añadir `fetchUsersSelector`, `fetchElem`, `createElem`, `updateElem`, `deleteElem` y `uploadImagen` con el mapeo camelCase ↔ snake_case, y los `fetchAll` que falten. Verificación: type-check; cada llamada lanza el endpoint esperado.
3. **Componente base (campos comunes).** Crear `InventarioForm.vue` con las secciones comunes, selects dependientes, validaciones y guardado de alta/edición sin bloques específicos. Verificación: alta y edición de un EPI sin stock mínimo desde un montaje de prueba.
4. **Bloques por tipo.** Añadir los bloques de vehículo, maquinaria y EPI, con sus selects (estados de revisión, tipo de funcionamiento, responsable, vehículo, periodicidad). Verificación: payload con el bloque correcto por tipo.
5. **Imagen.** Añadir subida/reemplazo con validación de formato y tamaño y vista de la imagen actual. Verificación: subir una imagen en edición y en alta.
6. **Páginas y rutas.** Crear las tres páginas finas y las seis rutas con sus permisos. Verificación manual en `/#/inventario/<tipo>/nuevo` y `/#/inventario/<tipo>/<id>/editar`.
7. **Acciones en el listado.** Añadir "Nuevo", "Editar" y "Eliminar" con confirmación en `InventarioListTable.vue`, e invalidar el caché del tipo. Verificación manual: crear, editar y borrar un elemento de cada tipo y ver el listado actualizado.

---

## Acceptance criteria

- [ ] `/#/inventario/vehiculos/nuevo`, `/maquinaria/nuevo` y `/epis/nuevo` cargan sin errores en consola y muestran el formulario del tipo correspondiente.
- [ ] `/#/inventario/<tipo>/<id>/editar` carga el elemento y rellena todos los campos; si el `id` no existe o es de otro tipo, se notifica el error y se vuelve al listado.
- [ ] Sin `elementos_inventario.crear` el guard redirige en `nuevo`; sin `elementos_inventario.editar` redirige en `:id/editar`.
- [ ] Los botones "Nuevo", "Editar" y "Eliminar" del listado solo aparecen con `crear`, `editar` y `eliminar` respectivamente.
- [ ] El alta envía `POST /elems-inventario` con `tipo_elemento_inventario_id` = 1, 2 o 3 según la pantalla y solo el bloque `vehiculo`, `maquinaria` o `epi` correspondiente.
- [ ] La edición envía `PUT /elems-inventario/{id}` sin `tipo_elemento_inventario_id`.
- [ ] `nombre` y `categoria_id` son obligatorios; no se puede guardar sin ellos y se muestra el mensaje bajo el campo.
- [ ] Los límites de longitud de la API (`nombre` 250, `referencia` 20, `matricula` 10, `n_serie` 45, etc.) se validan en cliente.
- [ ] El select de categoría solo lista categorías del tipo; el de subcategoría solo las de la categoría elegida y se limpia al cambiar esta.
- [ ] El select de ubicación solo lista ubicaciones de la delegación elegida y se limpia al cambiar la delegación.
- [ ] Los selects de estado, estado de revisión y tipo de funcionamiento se cargan desde `GET /estados`, `/estados-revision` y `/tipos-funcionamiento`; el de responsable desde `GET /users/selector` y muestra `name`.
- [ ] El formulario de maquinaria permite elegir un vehículo; se envía `en_vehiculo: true` con `vehiculo_id`, y `en_vehiculo: false` sin él.
- [ ] En alta, `estado_id` es 1 por defecto.
- [ ] Un error 422 se muestra en el campo afectado cuando el mensaje lo identifica; el formulario no pierde los datos introducidos.
- [ ] Tras guardar con éxito se muestra notificación y se vuelve al listado del tipo con el elemento reflejado.
- [ ] Subir una imagen jpeg, png o webp ≤ 5 MB llama a `POST /elems-inventario/{id}/imagen` y se muestra en la edición; otro formato o tamaño se rechaza en cliente antes de enviar.
- [ ] En alta con imagen seleccionada, la imagen se sube tras crear el elemento; si la subida falla, el elemento queda creado y se notifica el error de la imagen.
- [ ] Eliminar pide confirmación; al aceptar llama a `DELETE /elems-inventario/{id}` y el listado se recarga sin el elemento; al cancelar no se llama.
- [ ] Los formularios usan `GlassCard`, `elegant-input` y botones como las demás pantallas, en temas Clásico y Claro y en ancho móvil.
- [ ] Todos los textos nuevos existen en `es` y `en-US`.
- [ ] `pnpm lint` y el type-check pasan sin errores nuevos.

---

## Decisions taken and discarded

- **Página propia por tipo** (decisión del usuario) frente a diálogo modal: el formulario de vehículos tiene unos 30 campos y no cabe en un diálogo.
- **Componente base `InventarioForm.vue` + tres páginas finas** (decisión del usuario), igual que `InventarioListTable.vue`: evita duplicar los ~15 campos comunes tres veces.
- **Una página sirve para alta y edición** (ruta con o sin `:id`) frente a páginas separadas: misma estructura de formulario.
- **Todos los campos de la API** (decisión del usuario) frente a un subconjunto: el formulario es el único punto de entrada de datos y evita volver a tocar la pantalla.
- **Incluye borrado, imagen y campos de baja** (decisión del usuario), aunque la SPEC 13 los dejó fuera.
- **Permisos granulares** `elementos_inventario.crear` / `.editar` / `.eliminar` (decisión del usuario) frente a un único permiso de gestión.
- **Selects dependientes** (categoría → subcategoría, delegación → ubicación) frente a listas planas: evita errores 422 de coherencia.
- **Selects con todos los datos** para vehículo y demás listas (`fetchAll`), sin búsqueda en servidor: coherente con SPEC 13.
- **`en_vehiculo` derivado de `vehiculo_id`** y no editable: la API ya lo trata así.
- **Volver al listado tras guardar** (decisión del usuario) frente a quedarse en el formulario.
- **La imagen se sube en una segunda petición**, tras crear: la API la exige sobre un elemento ya existente.
- **El estado de la spec se escribe en español** (`Borrador`), siguiendo las SPEC anteriores.

---

## Identified risks

- **Permisos `elementos_inventario.crear` / `.editar` / `.eliminar` inexistentes en el backend** o sin alta en la pantalla de roles: nadie vería los botones. Verificar en el paso 6 con un usuario de prueba y, si no existen, pedir el alta en el backend.
- **Forma real de la respuesta de `GET /elems-inventario/{id}`** no confirmada para todos los campos de bloque: se valida en el paso 2.
- **Selects que requieren permisos de otros recursos** (`catalogos.ver`, `delegaciones.ver`, `usuarios.ver` para `users/selector`): un usuario puede recibir 403. Tratar el fallo de cada carga como lista vacía con aviso, sin bloquear el formulario.
- **Volumen de vehículos para el select de maquinaria** (> 100): `fetchAll` recorre páginas; si resulta lento, usar búsqueda en servidor en otra spec.
- **Alta con imagen en dos pasos:** si falla la subida, el elemento queda sin imagen; se notifica y se puede reintentar desde la edición.
- **Reglas cruzadas de la API** (p. ej. fechas de revisión, `fecha_baja` con estado): se devuelven como 422 y se muestran, sin duplicarlas en cliente salvo las de longitud y obligatoriedad.
- **Borrado irreversible** (elimina detalle e imagen): mitigado con confirmación explícita.

---

## What is **not** in this spec

- Detalle de solo lectura y filas clicables.
- Mantenimientos, revisiones e historial de responsables.
- Duplicado, edición masiva, borrado múltiple, importación y exportación.
- Selects con búsqueda en servidor.
- Edición de imágenes y galerías.
- Cambiar el tipo de un elemento existente.

Cada uno de esos puntos, si se aborda, va en su propia spec.
