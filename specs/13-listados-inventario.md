# SPEC 13 — Listados de inventario: vehículos, maquinaria y EPIs

> **Status:** Aprobado
> **Depends on:** SPEC 10 (stores de categorías, subcategorías y tipos de elemento), SPEC 08 (patrón de listado paginado con filtros), `ProveedoresListPage.vue` y `UsersListPage.vue` como referencia visual. Usa stores de delegaciones, ubicaciones, departamentos y proveedores ya existentes.
> **Date:** 2026-10-23
> **Objective:** Añadir tres pantallas de solo lectura (Vehículos, Maquinaria y EPIs) que listan los elementos de inventario de cada tipo con paginación en servidor y filtros, replicando el aspecto de las tablas de administración existentes.

---

## Scope

**In:**

- **Rutas** en `src/router/routes.ts` (hijas de `MainLayout`, `requiresAuth: true`, `requiresPermission: 'elementos_inventario.ver'`):
  - `inventario/vehiculos` → `VehiculosListPage.vue`
  - `inventario/maquinaria` → `MaquinariaListPage.vue`
  - `inventario/epis` → `EpisListPage.vue`
- **Páginas finas** en `src/pages/inventario/`: cada una solo declara su tipo (`tipoElementoInventarioId` 1, 2 o 3), título y el componente base.
- **Componente base** `src/components/inventario/InventarioListTable.vue`: `AdminPageWrapper wide align-top` + `GlassCard`, título `text-h5 text-teal-10 font-outfit`, filtros `q-input` / `q-select` `outlined dense clearable elegant-input`, botones "Filtrar"/"Limpiar", `q-table flat bordered dense elegant-table`, notificaciones de error `red-9`. Parametrizado por tipo (columnas y filtros propios). Sin botón "Nuevo" ni acciones por fila.
- **Store** `src/stores/elemsInventario.ts`: patrón de `proveedores.ts` (`items`, `meta`, `loading`, `filters`, `fetchElems(tipoId)`), con estado independiente por tipo (cada pantalla conserva su página, filtros y filas por página). Reutiliza `PaginationMeta` de `@/stores/users`.
- **Paginación en servidor:** `page`, `per_page`; opciones `[10, 15, 25, 50]`, por defecto 15. `tipo_elemento_inventario_id` se envía siempre fijo por pantalla. La ordenación de columnas actúa solo sobre la página cargada (el backend ordena por nombre).
- **Filtros** (`GET /elems-inventario`):
  - En las tres: `nombre`, `referencia`, `n_serie` (parciales), `estado_id` (select: Activo = 1 / Inactivo = 0, vacío por defecto = ambos), `categoria_id`, `subcategoria_id`, `delegacion_id`, `ubicacion_id`, `departamento_id`, `proveedor_id`.
  - Solo en vehículos: `matricula` (parcial).
  - Categoría se limita a las del tipo de la pantalla. Subcategoría depende de la categoría elegida: sin categoría muestra las subcategorías de las categorías del tipo; al cambiar de categoría se limpia la subcategoría.
- **Columnas:**
  - Comunes: `referencia`, `nombre`, `categoría`, `subcategoría`, `delegación`, `ubicación`, `estado` (chip verde Activo / gris Inactivo).
  - Vehículos añade: `matrícula`, `marca / modelo`, `próxima revisión`.
  - Maquinaria añade: `marca / modelo`, `próxima revisión`.
  - EPIs añade: `stock mínimo`.
  - Valores nulos como `—`. Fechas formateadas según el idioma activo.
- **Selects de filtro:** reutilizar los `fetchAll*` existentes (categorías, delegaciones, ubicaciones); añadir `fetchAll` a los stores de departamentos y proveedores y `fetchAll` filtrable por categoría/tipo a categorías y subcategorías donde falte. Se cargan al montar la pantalla.
- **Menú lateral** (`src/layouts/MainLayout.vue`): tres `q-item` sueltos (sin cabecera de grupo) "Vehículos" (`directions_car`), "Maquinaria" (`construction`) y "EPIs" (`health_and_safety`) entre "Manual de usuario" y "Administración", con clases `drawer-item` / `drawer-item--active`, visibles con `elementos_inventario.ver`.
- **i18n** (`es` y `en-US`): `inventario.*` (títulos, filtros, columnas, estados, vacío) y `layout.nav.vehicles` / `machinery` / `epis`.
- Errores del backend con `getApiErrorMessage`. Estado vacío y de carga como en las demás tablas.

**Out of scope (for future specs):**

- Alta, edición y borrado de elementos de inventario, subida de imagen (`POST /elems-inventario/{id}/imagen`).
- Pantalla de detalle (`GET /elems-inventario/{id}`) y filas clicables.
- Mantenimientos, revisiones, responsables y bajas (`fecha_baja`, `motivo_baja`).
- Ordenación en servidor, exportación, importación masiva.
- Filtros por `responsable`, `critico`, `renting` u otros no soportados por la API.
- Hub o tarjetas de inventario en la pantalla de Administración.

---

## Data model

Contrato con la API (`GET /elems-inventario`): `{ data: { items, meta: { current_page, last_page, per_page, total } } }`. Esta feature no crea endpoints; solo lee.

```ts
// Dominio (camelCase), mapeado desde ElemInventarioResource
interface ElemInventario {
  id: number;
  tipoElementoInventarioId: number; // 1 Vehículos, 2 Maquinaria, 3 EPIs
  referencia: string | null;
  nombre: string;
  categoria: { id: number; nombre: string } | null;
  subcategoria: { id: number; nombre: string } | null;
  delegacion: { id: number; nombre: string } | null;
  ubicacion: { id: number; nombre: string } | null;
  estadoId: 0 | 1; // 0 Inactivo, 1 Activo
  estado: { id: number; descripcion: string } | null;
  // Bloque según tipo (campos opcionales; solo se mapean los usados en columnas)
  vehiculo?: { matricula: string | null; marca: string | null; modelo: string | null; proximaRevision: string | null };
  maquinaria?: { marca: string | null; modelo: string | null; proximaRevision: string | null };
  epi?: { stockMinimo: number | null };
}

// Query del listado
// { tipo_elemento_inventario_id, page, per_page, nombre?, referencia?, n_serie?, estado_id?,
//   categoria_id?, subcategoria_id?, delegacion_id?, ubicacion_id?, departamento_id?, proveedor_id?,
//   matricula? /* solo tipo 1 */ }
```

Convenciones:

- Los filtros vacíos no se envían (nunca strings vacíos). `estado_id = 0` sí se envía.
- Los nombres exactos de los bloques `vehiculo` / `maquinaria` / `epi` en la respuesta se confirman en el paso 2 contra una respuesta real; si difieren de `ElemInventarioResource`, se ajusta el mapeo.

---

## Implementation plan

1. **i18n.** Añadir claves `inventario.*` y `layout.nav.*` en `es` y `en-US`. Verificación: type-check sin errores.
2. **Store.** Crear `elemsInventario.ts` con mapeo y `fetchElems` con estado por tipo. Verificación: type-check; la llamada lanza `GET /elems-inventario` con `tipo_elemento_inventario_id`, `page`, `per_page` y filtros informados.
3. **Stores de apoyo.** Añadir `fetchAll` en departamentos y proveedores, y variantes de categorías/subcategorías filtrables por tipo/categoría. Verificación: type-check; recorren todas las páginas con `per_page=100`.
4. **Componente base.** Crear `InventarioListTable.vue` con filtros, tabla, paginación y columnas por tipo. Verificación: renderiza con cada tipo en un montaje de prueba.
5. **Páginas y rutas.** Crear las tres páginas finas y las rutas con el permiso `elementos_inventario.ver`. Verificación manual en `/#/inventario/vehiculos`, `/maquinaria`, `/epis`: listar, filtrar, paginar.
6. **Menú lateral.** Añadir los tres ítems en `MainLayout.vue`. Verificación manual: aparecen con el permiso, se marcan activos en su ruta y no aparecen sin él.

---

## Acceptance criteria

- [ ] `/#/inventario/vehiculos`, `/#/inventario/maquinaria` y `/#/inventario/epis` cargan sin errores en consola.
- [ ] Un usuario sin `elementos_inventario.ver` es redirigido por el guard al intentar abrirlas.
- [ ] Cada pantalla envía siempre `tipo_elemento_inventario_id` = 1, 2 y 3 respectivamente y solo muestra elementos de su tipo.
- [ ] Las pantallas usan `GlassCard`, `q-table` con `elegant-table`, `dense`, `flat`, `bordered` y filtros `elegant-input`, con el mismo aspecto que `ProveedoresListPage.vue` en temas Clásico y Claro y en ancho móvil.
- [ ] Cambiar de página o de filas por página lanza `GET` con `page` y `per_page` y conserva los filtros aplicados.
- [ ] "Filtrar" lanza `GET` con los filtros informados y vuelve a la página 1; "Limpiar" vacía los filtros y recarga sin ellos.
- [ ] Los filtros `nombre`, `referencia`, `n_serie`, `estado_id`, `categoria_id`, `subcategoria_id`, `delegacion_id`, `ubicacion_id`, `departamento_id` y `proveedor_id` existen en las tres pantallas; `matricula` solo en vehículos.
- [ ] El select de categoría solo lista categorías del tipo de la pantalla; el de subcategoría se restringe a la categoría elegida y se limpia al cambiar esta.
- [ ] Filtrar por estado Inactivo envía `estado_id=0`; con el select vacío no se envía `estado_id`.
- [ ] Las columnas coinciden con las definidas para cada tipo; nulos como `—`; el estado se muestra con chip verde (Activo) o gris (Inactivo).
- [ ] No hay botón "Nuevo", acciones por fila ni filas clicables.
- [ ] Un error del backend se notifica en `red-9` con su mensaje y la tabla no se rompe; sin resultados se muestra el estado vacío.
- [ ] Cambiar entre las tres pantallas conserva el estado (página y filtros) de cada una dentro de la sesión.
- [ ] El menú lateral muestra "Vehículos", "Maquinaria" y "EPIs" entre "Manual de usuario" y "Administración" solo con `elementos_inventario.ver`, cada uno activo en su ruta, y los demás ítems no cambian.
- [ ] Todos los textos nuevos existen en `es` y `en-US`.
- [ ] `pnpm lint` y el type-check pasan sin errores nuevos.

---

## Decisions taken and discarded

- **Solo listado** (decisión del usuario) frente a incluir borrado o CRUD: el alta/edición es compleja (bloques `vehiculo` / `maquinaria` / `epi`) y merece su propia spec.
- **Tres rutas con un componente base parametrizado** (decisión del usuario) frente a tres páginas duplicadas o una con pestañas: evita duplicar ~300 líneas por pantalla y mantiene un ítem de menú por tipo. Es la primera excepción al patrón de "página propia por pantalla", justificada por ser tres variantes del mismo recurso.
- **Tres ítems sueltos en el menú** (decisión del usuario) frente a grupo con cabecera o submenú.
- **Permiso `elementos_inventario.ver`** (decisión del usuario) frente a `catalogos.*` o solo autenticación.
- **Filtros = todos los de la API** (matrícula solo en vehículos) y **columnas comunes + específicas por tipo** (decisiones del usuario).
- **Subcategoría dependiente de la categoría** (decisión del usuario) frente a lista plana.
- **Estado sin filtrar por defecto** (decisión del usuario) para ver activos e inactivos, con chip en la columna.
- **Estado por tipo en el store** para que cada pantalla conserve su página y filtros.
- **El estado de la spec se escribe en español** (`Borrador`), siguiendo las SPEC anteriores.

---

## Identified risks

- **Permiso `elementos_inventario.ver` inexistente en el backend o sin alta en la pantalla de roles:** nadie vería las pantallas. Verificar en el paso 5 con un usuario de prueba y, si no existe, pedir el alta en el backend.
- **Selects que requieren permisos de otros recursos** (`catalogos.ver`, `delegaciones.ver`): un usuario con solo `elementos_inventario.ver` puede recibir 403. Tratar el fallo de cada carga como lista vacía con aviso, sin bloquear la pantalla.
- **Forma real de los bloques `vehiculo` / `maquinaria` / `epi`** no confirmada contra datos reales: se valida en el paso 2.
- **Volumen de datos en los selects** (>100 ubicaciones, categorías o subcategorías): `fetchAll*` recorre todas las páginas; si resulta lento, usar selects con búsqueda en servidor en otra spec.
- **Primer componente compartido de listados:** divergir del patrón actual puede confundir; se limita al ámbito de inventario y no se generaliza al resto de pantallas.
- **Ordenación solo sobre la página cargada:** mismo comportamiento ya aceptado en specs anteriores.

---

## What is **not** in this spec

- Alta, edición, borrado e imagen de elementos de inventario.
- Detalle de elemento y filas clicables.
- Mantenimientos, revisiones, responsables, bajas.
- Ordenación en servidor, exportación e importación.
- Componente de listado genérico para todo el proyecto.

Cada uno de esos puntos, si se aborda, va en su propia spec.
