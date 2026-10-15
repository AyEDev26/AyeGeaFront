# SPEC 08 — Administración de proveedores

> **Status:** Aprobado
> **Depends on:** SPEC 02 (patrón de listado + diálogo + store y permisos `catalogos.*`), `UsersListPage.vue` y `UserFormDialog.vue` como referencia visual
> **Date:** 2026-10-15
> **Objective:** Añadir una pantalla de administración de proveedores (listado paginado con filtros por nombre y teléfono, diálogo de alta/edición y borrado) que consume `/proveedores` de la API y replica el aspecto de la página de usuarios.

---

## Scope

**In:**

- `src/stores/proveedores.ts`: store Pinia con el mismo patrón que `departamentos.ts` / `users.ts` (`items`, `meta`, `loading`, `fetchProveedores`, `createProveedor`, `updateProveedor`, `deleteProveedor`). Reutiliza `PaginationMeta` de `@/stores/users`.
- `src/pages/admin/ProveedoresListPage.vue`: `AdminPageWrapper wide align-top` + `GlassCard`, título `text-h5 text-teal-10 font-outfit`, botón "Nuevo" `elegant-btn`, filtros `q-input outlined dense clearable elegant-input`, botones "Filtrar"/"Limpiar", `q-table flat bordered dense elegant-table`, acciones con botones redondos `flat round dense size="sm"` y tooltips, confirmación de borrado con `$q.dialog`, notificaciones `teal-9` / `red-9`.
- `src/components/admin/ProveedorFormDialog.vue`: diálogo con `GlassCard` para alta y edición.
- Listado paginado en servidor (`page`, `per_page`; opciones `[10, 15, 25, 50]`, por defecto 15). La ordenación de columnas actúa solo sobre la página cargada (el backend ordena por nombre).
- Filtros: `nombre` y `telefono` (búsqueda parcial, ambos de la API). "Filtrar" vuelve a la página 1; "Limpiar" vacía ambos y recarga.
- Columnas: `nombre`, `direccion`, `telefono`, acciones.
- Formulario: `nombre` (obligatorio, máx. 100), `direccion` (opcional, máx. 255), `telefono` (opcional, máx. 100).
- Ruta `admin/proveedores` en `src/router/routes.ts` (hija de `MainLayout`, `requiresAuth: true`, `requiresPermission: 'catalogos.ver'`).
- Permisos de acciones en UI: botón "Nuevo", editar y eliminar condicionados a `catalogos.crear`, `catalogos.editar` y `catalogos.eliminar`.
- `src/layouts/MainLayout.vue`: nuevo `q-item` "Proveedores" (icono `local_shipping`, `to="/admin/proveedores"`, clases `drawer-item` / `drawer-item--active`) en la sección de Administración, junto a Usuarios, visible con `catalogos.ver`. La condición `v-if` de la cabecera de la sección ya incluye `hasOrganizationAccess` (que contiene `catalogos.ver`), por lo que no debe cambiar; se comprueba en la implementación.
- Textos en `src/i18n/es/index.ts` y `src/i18n/en-US/index.ts` (`admin.proveedores`, `admin.proveedorForm`, `layout.nav.proveedores`).
- Errores del backend con `getApiErrorMessage` (incluido el 409 si el borrado tiene dependencias).

**Out of scope (for future specs):**

- Permisos propios `proveedores.*` (se usan `catalogos.*`; cambiarlos sería otra spec).
- Pantalla de detalle (`GET /proveedores/{id}`): todo se ve en listado y diálogo.
- Tarjeta en el hub de Organización, cambios en `OrganizationHubPage.vue` o en `organizationPaths`.
- Relación de proveedores con inventario, categorías u otras entidades.
- Ordenación en servidor, exportación, importación masiva.
- Componentes genéricos compartidos con las demás pantallas.

---

## Data model

Contrato con la API (`https://aye.ayegea.es/api/documentation/`), endpoint `/proveedores`. Listado: `{ data: { items, meta: { current_page, last_page, per_page, total } } }`.

```ts
// Tipo de dominio (camelCase)
interface Proveedor {
  id: number;
  nombre: string;
  direccion: string | null;
  telefono: string | null;
}

// Payload create/update (snake_case, igual que la API)
// { nombre, direccion?, telefono? }

// Query del listado
// { page, per_page, nombre?, telefono? }
```

Convenciones:

- Al editar, `direccion` y `telefono` vaciados se envían como `null` (la API los declara `nullable`), como en SPEC 02. Los strings vacíos nunca se envían.
- `created_at` / `updated_at` no se mapean.

---

## Implementation plan

1. **i18n.** Añadir las claves en `es` y `en-US`. Verificación: type-check sin errores.
2. **Store.** Crear `stores/proveedores.ts` con mapeo y CRUD. Verificación: type-check; `fetchProveedores` lanza `GET /proveedores` con `page`, `per_page` y filtros.
3. **Diálogo.** Crear `ProveedorFormDialog.vue` con validaciones. Verificación: nombre vacío o campos por encima del máximo no envían petición.
4. **Página y ruta.** Crear `ProveedoresListPage.vue` y la ruta `admin/proveedores`. Verificación manual en `/#/admin/proveedores`: listar, filtrar, paginar, crear, editar, borrar.
5. **Menú lateral.** Añadir el ítem "Proveedores" en `MainLayout.vue`. Verificación manual: aparece con `catalogos.ver`, se marca activo en la ruta y no aparece sin el permiso.

---

## Acceptance criteria

- [ ] `/#/admin/proveedores` carga la página sin errores en consola.
- [ ] Un usuario sin `catalogos.ver` es redirigido por el guard al intentar abrirla.
- [ ] La página usa `GlassCard`, `q-table` con `elegant-table`, `dense`, `flat`, `bordered`, y filtros con `elegant-input`, con el mismo aspecto que `UsersListPage.vue` en temas Clásico y Claro y en ancho móvil.
- [ ] Cambiar de página o de filas por página lanza `GET /proveedores` con `page` y `per_page` y conserva los filtros aplicados.
- [ ] "Filtrar" lanza `GET` con `nombre` y/o `telefono` informados y vuelve a la página 1; "Limpiar" vacía ambos y recarga sin ellos.
- [ ] La tabla muestra nombre, dirección y teléfono; los valores nulos se muestran de forma neutra (p. ej. `—`).
- [ ] "Nuevo", editar y eliminar solo aparecen con `catalogos.crear`, `catalogos.editar` y `catalogos.eliminar`.
- [ ] Crear un proveedor válido notifica en `teal-9`, cierra el diálogo y aparece en el listado.
- [ ] Editar precarga los valores; guardar actualiza la fila y notifica éxito. Vaciar dirección o teléfono y guardar envía `null` para ese campo.
- [ ] Nombre vacío, nombre >100, dirección >255 o teléfono >100 muestran error de validación y no envían petición.
- [ ] Borrar pide confirmación; al confirmar, el registro desaparece y se notifica éxito. Un error del backend (p. ej. 409) se muestra en `red-9` con su mensaje y el registro permanece.
- [ ] El menú lateral muestra "Proveedores" con `catalogos.ver`, lo marca activo en `/admin/proveedores`, y los demás ítems no cambian.
- [ ] Todos los textos nuevos existen en `es` y `en-US`.
- [ ] `pnpm lint` y el type-check pasan sin errores nuevos.

---

## Decisions

- **Yes:** permisos `catalogos.*` (decisión del usuario). Evita depender de permisos nuevos en el backend; la API no documenta permisos, así que se confirma al implementar que un usuario con `catalogos.*` puede llamar a `/proveedores`.
- **No:** permisos propios `proveedores.*`. Más granular, pero requiere alta en backend y en la pantalla de roles.
- **Yes:** ítem propio en la sección Administración, junto a Usuarios. No toca el hub ni SPEC 06/07.
- **No:** tarjeta en el hub de Organización; los proveedores no forman parte de la estructura organizativa.
- **Yes:** filtros por `nombre` y `telefono`, los dos que admite la API.
- **Yes:** columnas nombre, dirección y teléfono (los tres campos editables).
- **Yes:** enviar `null` en campos opcionales vaciados al editar, igual que SPEC 02.
- **Yes:** store, página y diálogo propios replicando el patrón existente; no se crean componentes genéricos.
- **No:** pantalla de detalle; el listado y el diálogo cubren todos los campos.
- **Yes:** el estado se escribe en español (`Borrador`), siguiendo las SPEC anteriores.

---

## Risks

| Risk                                                                            | Mitigation                                                                                                        |
| ------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------- |
| El backend exige un permiso distinto de `catalogos.*` para `/proveedores` (403) | Verificarlo en el paso 4 con un usuario de prueba; si difiere, ajustar la spec (permisos propios en otra spec).   |
| La sección Administración no se muestra a un usuario con solo `catalogos.ver`   | Comprobar en el paso 5 que `hasOrganizationAccess` ya cubre ese caso; si no, ampliar la condición de la cabecera. |
| El icono `local_shipping` no encaja con el resto del menú                       | Cambio trivial de icono durante la revisión visual.                                                               |
| Ordenación solo sobre la página cargada puede confundir                         | Mismo comportamiento ya aceptado en Users y SPEC 02.                                                              |

---

## What is **not** in this spec

- Permisos `proveedores.*` propios.
- Pantalla de detalle, exportación o importación.
- Integración con hub de Organización o con otras entidades.
- Ordenación en servidor.
- Componentes genéricos compartidos.

Cada uno de esos puntos, si se aborda, va en su propia spec.
