# SPEC 18 — Duplicar elemento de inventario: vehículos, maquinaria y EPIs

> **Status:** Aprobado
> **Depends on:** SPEC 14 (formularios de inventario, `InventarioForm.vue`, store `elemsInventario.ts` con `fetchElem` / `createElem`), SPEC 15 (carpeta «Información» dentro de `InventarioTabs`, edición en `inventario/*/:id/editar`), SPEC 16 (barra de acciones con el botón «Generar PDF»).
> **Date:** 2026-10-24
> **Objective:** Añadir a la carpeta «Información» de la edición de vehículos, maquinaria y EPIs un botón «Duplicar» que pida la referencia del nuevo elemento y cree, con los demás datos guardados del original, un elemento nuevo del mismo tipo, abriendo después su pantalla de edición.

---

## Scope

**In:**

- **Botón «Duplicar»** en la barra de acciones de `InventarioForm.vue` (junto a «Generar PDF», «Cancelar» y «Guardar»), visible solo en modo edición (con `:id`) y solo si el usuario tiene el permiso `elementos_inventario.crear`. Se desactiva durante el guardado del formulario.
- **Diálogo de referencia** (`q-dialog`, estilo de los `*FormDialog.vue` existentes) con un único campo «Referencia» y botones «Cancelar» / «Duplicar»:
  - **Obligatoria** (en el alta normal es opcional), con las mismas reglas de longitud que el formulario (máx. 20 caracteres, `maxLengthRules(20)`).
  - Vacía de inicio (no se propone la referencia del original).
  - Si el servidor responde 422 por la referencia (p. ej. duplicada), el error se muestra en el propio campo y el diálogo sigue abierto. Otros errores se notifican en `red-9` con `getApiErrorMessage` / mensaje genérico, sin cerrar el diálogo.
- **Origen de datos:** los datos **guardados en el servidor** (`GET /elems-inventario/{id}` vía `fetchElem`), no el estado actual del formulario. Los cambios sin guardar no se copian; se avisa en la tooltip del botón.
- **Datos que se copian:** todos los de la carpeta «Información» del original (`detail.form`) salvo los que se reinician:
  - `referencia` → la introducida en el diálogo.
  - `nSerie` → `null`.
  - `vehiculo.matricula` → `null` (solo vehículos).
  - `fechaBaja` y `motivoBaja` → `null`.
  - `estadoId` → `1` (valor por defecto del alta normal).
  - `fechaAlta` → fecha actual (`YYYY-MM-DD`).
  - Imagen → no se copia; el nuevo elemento nace sin imagen.
  - Se copia **todo el bloque específico del tipo** (vehículo, maquinaria o EPI) con sus fechas de compra/revisión, contadores, responsable, periodicidad, etc., salvo la matrícula.
- **Creación:** `createElem(tipoId, form)` con el formulario resultante (`POST /elems-inventario`). Al terminar: notificación de éxito y navegación a `/inventario/<tipo>/<nuevoId>/editar` (carpeta «Información»), usando `router.push`.
- **Estado de carga:** el botón del diálogo muestra `loading` mientras se carga el detalle y se crea el elemento; el diálogo no se puede cerrar durante ese tiempo.
- **Código nuevo:**
  - `src/components/inventario/InventarioDuplicarDialog.vue`: diálogo con el campo de referencia; recibe `tipoId` y el `id` del original; emite el cierre/éxito.
  - Función pura de transformación `buildDuplicateForm(detailForm, referencia, tipoId)` (en el propio diálogo o en un módulo `src/utils/`) que aplica las reglas de arriba; sin dependencias de Vue, para poder verificarla de forma aislada.
- **Cambios en componentes existentes:** `InventarioForm.vue` añade el botón y monta el diálogo; sin cambios en las páginas `VehiculoFormPage.vue`, `MaquinariaFormPage.vue` y `EpiFormPage.vue`.
- **i18n** (`es` y `en-US`): `inventario.duplicar.*` (etiqueta del botón, tooltip, título y texto del diálogo, etiqueta del campo, «Referencia obligatoria», éxito y error genérico).

**Out of scope (for future specs):**

- Duplicar desde los listados o duplicación masiva.
- Copiar la imagen del original.
- Copiar datos de las carpetas relacionadas (Alertas, Tareas, Mantenimientos, Costes, etc.), que aún son skeletons (SPEC 15).
- Copiar el estado actual del formulario con cambios sin guardar.
- Abrir el formulario `nuevo` precargado para revisar antes de crear.
- Generar la referencia automáticamente o proponer una por defecto.
- Permiso propio de duplicación (`elementos_inventario.duplicar`): se usa `crear`.
- Duplicar a otro tipo de elemento o a otra organización.

---

## Data model

Esta feature no introduce datos persistentes ni endpoints nuevos: usa `GET /elems-inventario/{id}` y `POST /elems-inventario` ya existentes. Solo una transformación en memoria:

```ts
// buildDuplicateForm(detailForm: ElemInventarioForm, referencia: string, tipoId: TipoElemInventarioId): ElemInventarioForm
// Devuelve una copia profunda de detailForm con:
{
  ...detailForm,
  referencia,               // la del diálogo, ya recortada (trim)
  nSerie: null,
  estadoId: 1,
  fechaAlta: 'YYYY-MM-DD',  // hoy
  fechaBaja: null,
  motivoBaja: null,
  vehiculo: { ...detailForm.vehiculo, matricula: null }, // solo tipoId === 1
}
```

Convenciones:

- Copia profunda del formulario para no compartir objetos con el original.
- `createElem` y `buildPayload` no se modifican; la imagen no entra en el payload (se sube aparte con `uploadImagen`, que aquí no se llama).
- La fecha de hoy se calcula en local, con el mismo formato que usa el formulario para `fechaAlta`.

---

## Implementation plan

1. **i18n.** Añadir `inventario.duplicar.*` en `es` y `en-US`. Verificación: type-check sin errores.
2. **Transformación.** Implementar `buildDuplicateForm` con las reglas de reinicio. Verificación: con un formulario de ejemplo de cada tipo, el resultado conserva los demás campos y reinicia `nSerie`, `matricula`, baja, estado y fecha de alta, sin mutar el original.
3. **Diálogo.** Crear `InventarioDuplicarDialog.vue`: campo de referencia obligatoria, carga del detalle con `fetchElem`, `createElem`, manejo de 422 en el campo y de otros errores, y navegación al nuevo elemento. Verificación: duplicar un elemento real de cada tipo crea uno nuevo con los datos esperados.
4. **Botón en `InventarioForm.vue`.** Añadir «Duplicar» a la barra de acciones, solo en edición y con `elementos_inventario.crear`, y montar el diálogo. Verificación manual en `/#/inventario/<tipo>/<id>/editar`; en `nuevo` el botón no aparece.
5. **Casos límite.** Probar referencia duplicada (422), referencia vacía y de más de 20 caracteres, original con campos vacíos, usuario sin permiso `crear`, fallo de red al crear y ambos idiomas. Verificación: sin errores sin controlar y el original no se modifica.

---

## Acceptance criteria

- [ ] En `/#/inventario/vehiculos/<id>/editar`, `/maquinaria/<id>/editar` y `/epis/<id>/editar` aparece el botón «Duplicar» en la carpeta «Información»; no aparece en `nuevo` ni en el resto de carpetas.
- [ ] El botón no aparece para un usuario sin el permiso `elementos_inventario.crear`.
- [ ] Al pulsarlo se abre un diálogo que pide la referencia, vacía de inicio; sin ella no se puede confirmar.
- [ ] Una referencia de más de 20 caracteres se rechaza en el diálogo.
- [ ] Al confirmar se envía un único `POST /elems-inventario` con el tipo del original y los datos guardados del original, con la referencia indicada.
- [ ] El nuevo elemento tiene `nSerie` vacío, `matricula` vacía (vehículos), sin fecha ni motivo de baja, estado por defecto (`estadoId = 1`) y `fechaAlta` igual a la fecha de hoy.
- [ ] El nuevo elemento conserva el resto de campos del original, incluido todo el bloque específico del tipo (salvo matrícula).
- [ ] El nuevo elemento no tiene imagen y no se hace ninguna petición de subida de imagen.
- [ ] Tras crear, se muestra una notificación de éxito y se navega a `/#/inventario/<tipo>/<nuevoId>/editar` con la carpeta «Información» activa.
- [ ] Si el servidor rechaza la referencia con un 422, el error aparece en el campo y el diálogo sigue abierto; otros errores se notifican en `red-9` y el botón vuelve a su estado normal.
- [ ] Durante la creación el botón del diálogo muestra `loading` y el diálogo no se cierra; no se pueden lanzar dos creaciones.
- [ ] El original no se modifica y los cambios sin guardar del formulario no se copian al duplicado.
- [ ] El listado del tipo muestra el nuevo elemento al volver a él (la caché del store se invalida con `createElem`).
- [ ] El botón es coherente con los demás botones del formulario (`no-caps`, `elegant-btn`, colores teal) en temas Clásico y Claro y en ancho móvil.
- [ ] Todos los textos nuevos existen en `es` y `en-US`.
- [ ] `pnpm lint` y el type-check pasan sin errores nuevos.

---

## Decisions taken and discarded

- **Datos guardados en el servidor** (decisión del usuario) frente al estado actual del formulario: el duplicado parte de un elemento real, no de una edición a medias ni de datos posiblemente inválidos. Mismo criterio que la SPEC 16.
- **Se vacían `nSerie`, matrícula, baja e imagen** (decisión del usuario): son datos propios de cada unidad (o únicos) que, copiados, generarían duplicados o un elemento nacido «de baja».
- **Estado por defecto y fecha de alta = hoy** (decisión del usuario) frente a copiarlos: un elemento nuevo es una unidad nueva en alta.
- **Se copia todo el bloque específico del tipo salvo matrícula** (decisión del usuario) frente a vaciar revisiones y contadores: cumple el «mismos datos de Información» de la petición; el usuario corrige lo que difiera tras crear.
- **Referencia obligatoria en el diálogo** (decisión del usuario) aunque en el alta es opcional: el motivo del botón es dar una referencia propia al nuevo elemento. Error del servidor inline.
- **Creación directa y apertura de la edición** (decisión del usuario) frente a abrir `nuevo` precargado (exige pasar datos entre rutas) o volver al listado: se llega enseguida al nuevo elemento para ajustarlo y, más adelante, subir su imagen.
- **Botón en la barra de acciones de «Información» con permiso `crear`** (decisión del usuario) frente a la cabecera de página: acompaña a «Generar PDF», solo existe donde hay datos que copiar y el permiso refleja que se crea un elemento.
- **Sin permiso nuevo:** `elementos_inventario.crear` ya existe y describe exactamente la acción.
- **Imagen no copiada:** copiarla exigiría descargarla y volver a subirla (con el riesgo de CORS visto en la SPEC 16); se deja para otra spec si se necesita.
- **El estado de la spec se escribe en español** (`Aprobado`), siguiendo las SPEC anteriores.

---

## Identified risks

- **Restricciones únicas del backend no conocidas:** además de la referencia, puede haber otros campos únicos (p. ej. `n_serie`, matrícula) o reglas de negocio sobre el estado. Mitigación: se vacían los conocidos; cualquier 422 en otro campo se notifica con su mensaje y se revisa en el paso 3 con datos reales.
- **Forma real de `fetchElem` / `buildPayload`:** el mapeo ya existe (SPEC 14); si el detalle no trae algún campo del bloque específico, el duplicado lo perdería. Verificar en el paso 3 comparando original y copia.
- **Ids de selects obsoletos:** categoría, proveedor o responsable del original pueden haberse desactivado, y el servidor rechazar el duplicado. Mitigación: error mostrado con `getApiErrorMessage`; no se reintenta ni se vacían campos de forma silenciosa.
- **Doble clic / doble envío:** crearía dos elementos. Mitigación: `loading` y diálogo no descartable durante la petición.
- **Cambios sin guardar no incluidos:** el usuario puede esperar que se copien. Mitigación: tooltip del botón («Duplica el elemento con los datos guardados»).
- **Permisos asimétricos:** un usuario con `editar` pero sin `crear` no ve el botón; es el comportamiento deseado.

---

## What is **not** in this spec

- Duplicar desde el listado o de forma masiva.
- Copia de la imagen del original.
- Copia de datos de las carpetas relacionadas (Alertas, Mantenimientos, Costes…).
- Formulario `nuevo` precargado para revisar antes de crear.
- Generación o sugerencia automática de la referencia.
- Permiso propio de duplicación.

Cada uno de esos puntos, si se aborda, va en su propia spec.
