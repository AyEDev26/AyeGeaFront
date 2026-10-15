# SPEC 10 — Administración de categorías y subcategorías

> **Status:** Borrador
> **Depends on:** SPEC 02 (patrón de listado + diálogo + store y permisos `catalogos.*`), SPEC 08 (patrón idéntico aplicado a proveedores), `UsersListPage.vue` y `UserFormDialog.vue` como referencia visual. Consume el endpoint `/periodicidades` pero **no** depende de que SPEC 09 esté implementada.
> **Date:** 2026-10-15
> **Objective:** Añadir una única pantalla de administración con dos pestañas (Categorías y Subcategorías), cada una con listado paginado y filtros, diálogo de alta/edición y borrado, que consume `/categorias`, `/subcategorias`, `/tipos-elemento-inventario` y `/periodicidades` de la API y replica el aspecto de la página de usuarios.

---

## Scope

**In:**

- `src/stores/categorias.ts`: store Pinia con el patrón de `proveedores.ts` / `ubicaciones.ts` (`items`, `meta`, `loading`, `filters`, `fetchCategorias`, `createCategoria`, `updateCategoria`, `deleteCategoria`, `fetchAllCategorias` que recorre páginas con `per_page=100` para alimentar selects). Reutiliza `PaginationMeta` de `@/stores/users`.
- `src/stores/subcategorias.ts`: mismo patrón (`fetchSubcategorias`, `createSubcategoria`, `updateSubcategoria`, `deleteSubcategoria`) más `fetchPeriodicidadOptions` (lectura de `GET /periodicidades` recorriendo páginas con `per_page=100`, solo `id`, `descripcion`, `meses`), sin crear aún el store de periodicidades de SPEC 09.
- `src/stores/tiposElemento.ts`: store de solo lectura sobre `GET /tipos-elemento-inventario` (listado completo sin paginar, cacheado tras la primera carga).
- `src/pages/admin/CategoriasListPage.vue`: `AdminPageWrapper wide align-top` + `GlassCard`, título `text-h5 text-teal-10 font-outfit`, `q-tabs` (Categorías | Subcategorías) bajo el título; cada pestaña con botón "Nuevo" `elegant-btn`, filtros `q-input` / `q-select` `outlined dense clearable elegant-input`, botones "Filtrar"/"Limpiar", `q-table flat bordered dense elegant-table`, acciones con botones redondos `flat round dense size="sm"` y tooltips, confirmación de borrado con `$q.dialog`, notificaciones `teal-9` / `red-9`. La pestaña activa se refleja en la query de la ruta (`?tab=subcategorias`) para poder enlazarla; por defecto, Categorías.
- `src/components/admin/CategoriaFormDialog.vue` y `src/components/admin/SubcategoriaFormDialog.vue`: diálogos con `GlassCard` para alta y edición.
- Listado paginado en servidor en ambas pestañas (`page`, `per_page`; opciones `[10, 15, 25, 50]`, por defecto 15). Cada pestaña mantiene su propia página, filtros y filas por página. Los datos de una pestaña se cargan al activarla por primera vez. La ordenación de columnas actúa solo sobre la página cargada (el backend ordena por nombre).
- **Categorías**
  - Filtros: `nombre` (parcial), `prefijo` (parcial), `tipo_elemento_inventario_id` (select con los tipos).
  - Columnas: `nombre`, `tipo` (descripción de `tipo_elemento_inventario`), `prefijo`, acciones.
  - Formulario: `tipo_elemento_inventario_id` (select obligatorio), `nombre` (obligatorio, máx. 255, único dentro de su tipo), `prefijo` (opcional, máx. 50).
- **Subcategorías**
  - Filtros: `nombre` (parcial), `prefijo` (parcial), `categoria_id` (select con todas las categorías), `tipo_elemento_inventario_id` (select con los tipos), `periodicidad_id` (select con las periodicidades).
  - Columnas: `nombre`, `categoria`, `periodicidad` (descripción, o `—` si es nula), `prefijo`, acciones.
  - Formulario: `categoria_id` (select obligatorio), `nombre` (obligatorio, máx. 50, único dentro de su categoría), `periodicidad_id` (select opcional, con opción vacía = sin periodicidad), `prefijo` (opcional, máx. 3).
- Los selects de categoría, tipo y periodicidad se cargan al abrir la pestaña/diálogo y se refrescan tras crear o borrar categorías.
- Ruta `admin/categorias` en `src/router/routes.ts` (hija de `MainLayout`, `requiresAuth: true`, `requiresPermission: 'catalogos.ver'`).
- Permisos de acciones en UI (ambas pestañas): botón "Nuevo", editar y eliminar condicionados a `catalogos.crear`, `catalogos.editar` y `catalogos.eliminar`.
- `src/layouts/MainLayout.vue`: nuevo `q-item` "Categorías" (icono `category`, `to="/admin/categorias"`, clases `drawer-item` / `drawer-item--active`) en la sección de Administración, junto a Usuarios y Proveedores, visible con `catalogos.ver`. Se comprueba en la implementación que la condición de la cabecera de la sección ya lo cubre.
- Textos en `src/i18n/es/index.ts` y `src/i18n/en-US/index.ts` (`admin.categorias`, `admin.categoriaForm`, `admin.subcategorias`, `admin.subcategoriaForm`, `layout.nav.categorias`).
- Errores del backend con `getApiErrorMessage` (incluidos el 422 por nombre duplicado y el 409 si el borrado tiene dependencias, p. ej. una categoría con subcategorías).

**Out of scope (for future specs):**

- Permisos propios `categorias.*` / `subcategorias.*` (se usan `catalogos.*`).
- Pantalla de administración de periodicidades (SPEC 09) y su store; aquí solo se leen para el select.
- CRUD de tipos de elemento de inventario (la API solo permite lectura).
- Pantallas de detalle (`GET /categorias/{id}`, `GET /subcategorias/{id}`).
- Tarjeta en el hub de Organización, cambios en `OrganizationHubPage.vue` o en `organizationPaths`.
- Uso de categorías en activos, inventario o mantenimientos.
- Vista jerárquica/anidada, ordenación en servidor, exportación, importación masiva.
- Componentes genéricos compartidos con las demás pantallas.

---

## Data model

Contrato con la API (`https://aye.ayegea.es/api/documentation/`). Listados: `{ data: { items, meta: { current_page, last_page, per_page, total } } }`; `/tipos-elemento-inventario`: `{ data: TipoElementoInventario[] }` sin paginar.

```ts
// Tipos de dominio (camelCase)
interface TipoElementoInventario {
  id: number;
  descripcion: string;
}

interface Categoria {
  id: number;
  tipoElementoInventarioId: number;
  tipoElementoInventario: { id: number; descripcion: string } | null;
  nombre: string;
  prefijo: string | null;
}

interface Subcategoria {
  id: number;
  categoriaId: number;
  categoria: { id: number; nombre: string; tipoElementoInventarioId: number } | null;
  nombre: string;
  periodicidadId: number | null;
  periodicidad: { id: number; descripcion: string; meses: number } | null;
  prefijo: string | null;
}

// Payloads create/update (snake_case, igual que la API)
// Categoría:    { tipo_elemento_inventario_id, nombre, prefijo? }
// Subcategoría: { categoria_id, nombre, periodicidad_id?, prefijo? }

// Queries del listado
// Categorías:    { page, per_page, nombre?, prefijo?, tipo_elemento_inventario_id? }
// Subcategorías: { page, per_page, nombre?, prefijo?, categoria_id?, tipo_elemento_inventario_id?, periodicidad_id? }
```

Convenciones:

- Al editar, `prefijo` (ambas) y `periodicidad_id` vaciados se envían como `null` (la API los declara `nullable`), como en SPEC 02 y SPEC 08. Los strings vacíos nunca se envían.
- Al crear, los campos opcionales vacíos se omiten.
- `created_at` / `updated_at` no se mapean.

---

## Implementation plan

1. **i18n.** Añadir las claves en `es` y `en-US`. Verificación: type-check sin errores.
2. **Stores.** Crear `tiposElemento.ts`, `categorias.ts` y `subcategorias.ts` con mapeo y CRUD. Verificación: type-check; `fetchCategorias` / `fetchSubcategorias` lanzan `GET` con `page`, `per_page` y filtros; `fetchAllCategorias` y `fetchPeriodicidadOptions` recorren todas las páginas.
3. **Diálogo de categoría.** Crear `CategoriaFormDialog.vue` con validaciones. Verificación: tipo o nombre vacíos, nombre >255 o prefijo >50 no envían petición.
4. **Diálogo de subcategoría.** Crear `SubcategoriaFormDialog.vue` con validaciones. Verificación: categoría o nombre vacíos, nombre >50 o prefijo >3 no envían petición.
5. **Página y ruta.** Crear `CategoriasListPage.vue` con las dos pestañas y la ruta `admin/categorias`. Verificación manual en `/#/admin/categorias`: listar, filtrar, paginar, crear, editar y borrar en ambas pestañas; cambiar de pestaña conserva el estado de cada una.
6. **Menú lateral.** Añadir el ítem "Categorías" en `MainLayout.vue`. Verificación manual: aparece con `catalogos.ver`, se marca activo en la ruta y no aparece sin el permiso.

---

## Acceptance criteria

- [ ] `/#/admin/categorias` carga la página sin errores en consola, con la pestaña Categorías activa.
- [ ] `/#/admin/categorias?tab=subcategorias` abre directamente la pestaña Subcategorías; cambiar de pestaña actualiza la query.
- [ ] Un usuario sin `catalogos.ver` es redirigido por el guard al intentar abrirla.
- [ ] La página usa `GlassCard`, `q-table` con `elegant-table`, `dense`, `flat`, `bordered`, y filtros con `elegant-input`, con el mismo aspecto que `UsersListPage.vue` en temas Clásico y Claro y en ancho móvil.
- [ ] En ambas pestañas, cambiar de página o de filas por página lanza `GET` con `page` y `per_page` y conserva los filtros aplicados.
- [ ] Categorías: "Filtrar" lanza `GET /categorias` con `nombre`, `prefijo` y/o `tipo_elemento_inventario_id` informados y vuelve a la página 1; "Limpiar" vacía los filtros y recarga sin ellos.
- [ ] Subcategorías: "Filtrar" lanza `GET /subcategorias` con `nombre`, `prefijo`, `categoria_id`, `tipo_elemento_inventario_id` y/o `periodicidad_id` informados y vuelve a la página 1; "Limpiar" vacía los filtros y recarga sin ellos.
- [ ] La tabla de categorías muestra nombre, tipo y prefijo; la de subcategorías, nombre, categoría, periodicidad y prefijo; los valores nulos se muestran como `—`.
- [ ] "Nuevo", editar y eliminar solo aparecen con `catalogos.crear`, `catalogos.editar` y `catalogos.eliminar`, en ambas pestañas.
- [ ] Crear una categoría o subcategoría válida notifica en `teal-9`, cierra el diálogo y aparece en el listado.
- [ ] Editar precarga los valores (incluidos los selects); guardar actualiza la fila y notifica éxito. Vaciar prefijo (o periodicidad en subcategorías) y guardar envía `null` para ese campo.
- [ ] Categoría con tipo vacío, nombre vacío, nombre >255 o prefijo >50 muestra error de validación y no envía petición.
- [ ] Subcategoría con categoría vacía, nombre vacío, nombre >50 o prefijo >3 muestra error de validación y no envía petición.
- [ ] Crear con un nombre duplicado (dentro de su tipo o su categoría) muestra el mensaje del backend en `red-9` y mantiene el diálogo abierto.
- [ ] Borrar pide confirmación; al confirmar, el registro desaparece y se notifica éxito. Un error del backend (p. ej. 409 al borrar una categoría con subcategorías) se muestra en `red-9` con su mensaje y el registro permanece.
- [ ] Tras crear o borrar una categoría, el select de categorías de la pestaña Subcategorías refleja el cambio.
- [ ] El menú lateral muestra "Categorías" con `catalogos.ver`, lo marca activo en `/admin/categorias`, y los demás ítems no cambian.
- [ ] Todos los textos nuevos existen en `es` y `en-US`.
- [ ] `pnpm lint` y el type-check pasan sin errores nuevos.

---

## Decisions

- **Yes:** una sola página con dos pestañas y un único ítem de menú (decisión del usuario); subcategorías son hijas de categorías y se gestionan juntas.
- **No:** dos páginas separadas ni vista jerárquica anidada; más archivos/menú o contradicen el listado paginado por recurso de la API.
- **Yes:** pestaña activa en la query de la ruta (`?tab=`) para poder enlazarla. Estado independiente por pestaña.
- **Yes:** permisos `catalogos.*` (decisión del usuario), igual que SPEC 08/09. La API no documenta permisos para estos recursos; se confirma al implementar.
- **No:** permisos propios `categorias.*`; requieren alta en backend y en la pantalla de roles.
- **Yes:** `tipo_elemento_inventario_id` desde un store de solo lectura sobre `GET /tipos-elemento-inventario`, con filtro en ambas pestañas.
- **Yes:** `periodicidad_id` como select opcional alimentado desde `GET /periodicidades`, sin depender de SPEC 09. Se acepta una pequeña duplicación (`fetchPeriodicidadOptions`) que SPEC 09 podrá absorber después.
- **Yes:** `fetchAll*` con `per_page=100` para los selects, como ya hace `ubicaciones.ts`.
- **Yes:** filtros = todos los que admite la API para cada recurso.
- **Yes:** `null` en campos opcionales vaciados al editar, igual que SPEC 02 y SPEC 08.
- **Yes:** stores, página y diálogos propios replicando el patrón existente; no se crean componentes genéricos.
- **No:** pantallas de detalle; listado y diálogo cubren todos los campos.
- **Yes:** el estado se escribe en español (`Borrador`), siguiendo las SPEC anteriores.

---

## Risks

| Risk                                                                                              | Mitigation                                                                                                                  |
| ------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------- |
| El backend exige un permiso distinto de `catalogos.*` para `/categorias` o `/subcategorias` (403) | Verificarlo en el paso 5 con un usuario de prueba; si difiere, ajustar la spec.                                             |
| Un usuario con `catalogos.*` pero sin acceso a `/periodicidades` rompe el select de periodicidad  | Tratar el fallo de `fetchPeriodicidadOptions` como lista vacía con aviso, sin bloquear el diálogo ni la pestaña.            |
| La sección Administración no se muestra a un usuario con solo `catalogos.ver`                     | Comprobar en el paso 6 que `hasOrganizationAccess` ya cubre ese caso; si no, ampliar la condición de cabecera.              |
| Muchas categorías (>100) por tipo hacen incompleto o lento el select                              | `fetchAllCategorias` recorre todas las páginas; si resulta lento, hacer el select con búsqueda en servidor en otra spec.    |
| Una página con dos tablas y dos diálogos crece demasiado y se vuelve difícil de mantener          | Mantener la lógica por pestaña en la misma página con secciones claras; extraer a subcomponentes solo si pasa de ~400 líneas. |
| Ordenación solo sobre la página cargada puede confundir                                           | Mismo comportamiento ya aceptado en Users, SPEC 02, SPEC 08 y SPEC 09.                                                      |

---

## What is **not** in this spec

- Permisos `categorias.*` / `subcategorias.*` propios.
- Administración de periodicidades (SPEC 09) y de tipos de elemento.
- Pantallas de detalle, exportación o importación.
- Integración con el hub de Organización o con activos/inventario.
- Vista jerárquica y ordenación en servidor.
- Componentes genéricos compartidos.

Cada uno de esos puntos, si se aborda, va en su propia spec.
