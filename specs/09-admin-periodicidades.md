# SPEC 09 — Administración de periodicidades

> **Status:** Borrador
> **Depends on:** SPEC 02 (patrón de listado + diálogo + store y permisos `catalogos.*`), SPEC 08 (patrón idéntico aplicado a proveedores), `UsersListPage.vue` y `UserFormDialog.vue` como referencia visual
> **Date:** 2026-10-15
> **Objective:** Añadir una pantalla de administración de periodicidades (listado paginado con filtro por descripción, diálogo de alta/edición y borrado) que consume `/periodicidades` de la API y replica el aspecto de la página de usuarios.

---

## Scope

**In:**

- `src/stores/periodicidades.ts`: store Pinia con el mismo patrón que `proveedores.ts` / `departamentos.ts` (`items`, `meta`, `loading`, `fetchPeriodicidades`, `createPeriodicidad`, `updatePeriodicidad`, `deletePeriodicidad`). Reutiliza `PaginationMeta` de `@/stores/users`.
- `src/pages/admin/PeriodicidadesListPage.vue`: `AdminPageWrapper wide align-top` + `GlassCard`, título `text-h5 text-teal-10 font-outfit`, botón "Nuevo" `elegant-btn`, filtro `q-input outlined dense clearable elegant-input`, botones "Filtrar"/"Limpiar", `q-table flat bordered dense elegant-table`, acciones con botones redondos `flat round dense size="sm"` y tooltips, confirmación de borrado con `$q.dialog`, notificaciones `teal-9` / `red-9`.
- `src/components/admin/PeriodicidadFormDialog.vue`: diálogo con `GlassCard` para alta y edición.
- Listado paginado en servidor (`page`, `per_page`; opciones `[10, 15, 25, 50]`, por defecto 15). La ordenación de columnas actúa solo sobre la página cargada.
- Filtro: `descripcion` (búsqueda parcial, el único que admite la API). "Filtrar" vuelve a la página 1; "Limpiar" vacía el campo y recarga.
- Columnas: `descripcion`, `meses`, acciones. `meses = 0` se muestra como "Sin periodicidad" (texto i18n); el resto, como número.
- Formulario: `descripcion` (obligatorio, máx. 45, única en backend) y `meses` (obligatorio, entero ≥ 0; 0 = sin periodicidad en meses).
- Ruta `admin/periodicidades` en `src/router/routes.ts` (hija de `MainLayout`, `requiresAuth: true`, `requiresPermission: 'catalogos.ver'`).
- Permisos de acciones en UI: botón "Nuevo", editar y eliminar condicionados a `catalogos.crear`, `catalogos.editar` y `catalogos.eliminar`.
- `src/layouts/MainLayout.vue`: nuevo `q-item` "Periodicidades" (icono `schedule`, `to="/admin/periodicidades"`, clases `drawer-item` / `drawer-item--active`) en la sección de Administración, junto a Usuarios y Proveedores, visible con `catalogos.ver`. Se comprueba en la implementación que la condición de la cabecera de la sección ya lo cubre.
- Textos en `src/i18n/es/index.ts` y `src/i18n/en-US/index.ts` (`admin.periodicidades`, `admin.periodicidadForm`, `layout.nav.periodicidades`).
- Errores del backend con `getApiErrorMessage` (incluidos el 422 por descripción duplicada y el 409 si el borrado tiene dependencias).

**Out of scope (for future specs):**

- Permisos propios `periodicidades.*` (se usan `catalogos.*`).
- Pantalla de detalle (`GET /periodicidades/{id}`): todo se ve en listado y diálogo.
- Tarjeta en el hub de Organización, cambios en `OrganizationHubPage.vue` o en `organizationPaths`.
- Uso de periodicidades en activos, mantenimientos u otras entidades.
- Ordenación en servidor, exportación, importación masiva.
- Componentes genéricos compartidos con las demás pantallas.

---

## Data model

Contrato con la API (`https://aye.ayegea.es/api/documentation/`), endpoint `/periodicidades`. Listado: `{ data: { items, meta: { current_page, last_page, per_page, total } } }`.

```ts
// Tipo de dominio
interface Periodicidad {
  id: number;
  descripcion: string;
  meses: number; // 0 = sin periodicidad en meses
}

// Payload create/update (igual que la API)
// { descripcion, meses }

// Query del listado
// { page, per_page, descripcion? }
```

Convenciones:

- Ningún campo es nullable: no se envían `null` ni strings vacíos.
- `meses` se envía como número entero (no string).
- `created_at` / `updated_at` no se mapean.

---

## Implementation plan

1. **i18n.** Añadir las claves en `es` y `en-US`. Verificación: type-check sin errores.
2. **Store.** Crear `stores/periodicidades.ts` con mapeo y CRUD. Verificación: type-check; `fetchPeriodicidades` lanza `GET /periodicidades` con `page`, `per_page` y filtro.
3. **Diálogo.** Crear `PeriodicidadFormDialog.vue` con validaciones. Verificación: descripción vacía o >45, y meses vacío, negativo o decimal no envían petición.
4. **Página y ruta.** Crear `PeriodicidadesListPage.vue` y la ruta `admin/periodicidades`. Verificación manual en `/#/admin/periodicidades`: listar, filtrar, paginar, crear, editar, borrar.
5. **Menú lateral.** Añadir el ítem "Periodicidades" en `MainLayout.vue`. Verificación manual: aparece con `catalogos.ver`, se marca activo en la ruta y no aparece sin el permiso.

---

## Acceptance criteria

- [ ] `/#/admin/periodicidades` carga la página sin errores en consola.
- [ ] Un usuario sin `catalogos.ver` es redirigido por el guard al intentar abrirla.
- [ ] La página usa `GlassCard`, `q-table` con `elegant-table`, `dense`, `flat`, `bordered`, y filtro con `elegant-input`, con el mismo aspecto que `UsersListPage.vue` en temas Clásico y Claro y en ancho móvil.
- [ ] Cambiar de página o de filas por página lanza `GET /periodicidades` con `page` y `per_page` y conserva el filtro aplicado.
- [ ] "Filtrar" lanza `GET` con `descripcion` informada y vuelve a la página 1; "Limpiar" vacía el campo y recarga sin él.
- [ ] La tabla muestra descripción y meses; `meses = 0` se muestra como "Sin periodicidad".
- [ ] "Nuevo", editar y eliminar solo aparecen con `catalogos.crear`, `catalogos.editar` y `catalogos.eliminar`.
- [ ] Crear una periodicidad válida notifica en `teal-9`, cierra el diálogo y aparece en el listado.
- [ ] Editar precarga los valores; guardar actualiza la fila y notifica éxito.
- [ ] Descripción vacía, descripción >45, meses vacío, meses negativo o meses decimal muestran error de validación y no envían petición.
- [ ] Crear con una descripción ya existente muestra el mensaje del backend en `red-9` y mantiene el diálogo abierto.
- [ ] Borrar pide confirmación; al confirmar, el registro desaparece y se notifica éxito. Un error del backend (p. ej. 409) se muestra en `red-9` con su mensaje y el registro permanece.
- [ ] El menú lateral muestra "Periodicidades" con `catalogos.ver`, lo marca activo en `/admin/periodicidades`, y los demás ítems no cambian.
- [ ] Todos los textos nuevos existen en `es` y `en-US`.
- [ ] `pnpm lint` y el type-check pasan sin errores nuevos.

---

## Decisions

- **Yes:** permisos `catalogos.*` (decisión del usuario), igual que SPEC 08. La API no documenta permisos, así que se confirma al implementar que un usuario con `catalogos.*` puede llamar a `/periodicidades`.
- **No:** permisos propios `periodicidades.*`; requieren alta en backend y en la pantalla de roles.
- **Yes:** ítem propio en la sección Administración, junto a Usuarios y Proveedores. No toca el hub ni SPEC 06/07.
- **Yes:** un único filtro `descripcion`, el que admite la API.
- **Yes:** `meses = 0` se muestra como "Sin periodicidad" por ser la semántica documentada en la API.
- **Yes:** store, página y diálogo propios replicando el patrón existente; no se crean componentes genéricos.
- **No:** pantalla de detalle; el listado y el diálogo cubren todos los campos.
- **Yes:** el estado se escribe en español (`Borrador`), siguiendo las SPEC anteriores.

---

## Risks

| Risk                                                                                 | Mitigation                                                                                                       |
| ------------------------------------------------------------------------------------ | ---------------------------------------------------------------------------------------------------------------- |
| El backend exige un permiso distinto de `catalogos.*` para `/periodicidades` (403)   | Verificarlo en el paso 4 con un usuario de prueba; si difiere, ajustar la spec.                                  |
| La sección Administración no se muestra a un usuario con solo `catalogos.ver`        | Comprobar en el paso 5 que `hasOrganizationAccess` ya cubre ese caso; si no, ampliar la condición de cabecera.   |
| `q-input type="number"` devuelve string o `null` al vaciarse                         | Convertir a entero antes de enviar y validar con regla explícita de entero ≥ 0.                                  |
| Ordenación solo sobre la página cargada puede confundir                              | Mismo comportamiento ya aceptado en Users, SPEC 02 y SPEC 08.                                                    |

---

## What is **not** in this spec

- Permisos `periodicidades.*` propios.
- Pantalla de detalle, exportación o importación.
- Integración con el hub de Organización o con otras entidades.
- Ordenación en servidor.
- Componentes genéricos compartidos.

Cada uno de esos puntos, si se aborda, va en su propia spec.
