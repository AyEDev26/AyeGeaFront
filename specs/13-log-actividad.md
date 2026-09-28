# SPEC 13 — Página de log de actividad con paginación y filtros en servidor

> **Status:** Aprobado
> **Depends on:** SPEC 01, SPEC 03
> **Date:** 2026-09-04
> **Objective:** Añadir una página `/admin/actividad` que liste el log de actividad del sistema (`GET /activity-log`) con paginación y filtros resueltos en servidor.

---

## Por qué existe esta spec

El backend ya expone `GET /activity-log` (paginado, con filtros por `log_name`, `description`, `causer_id`, `created_from`/`created_to`), pero el frontend no tiene ninguna pantalla que lo consuma. Esta spec introduce un dominio nuevo (store + página), reutilizando el patrón de tabla paginada ya establecido en `UsersListPage.vue`/`useUsersStore` (SPEC 03), y añade un permiso nuevo porque el log de actividad es información sensible que no encaja en los grupos de permisos existentes (`usuarios.*`, `configuracion.*`).

---

## Scope

**In:**

- Nuevo store `src/stores/activityLog.ts` con estado `items`, `meta` (paginación) y `loading`, y una acción `fetchLogs(page, perPage, filters)` que llama a `GET /activity-log` mapeando filtros a los query params reales del backend (`log_name`, `description`, `causer_id`, `created_from`, `created_to`, `per_page`, `page`).
- Nueva página `src/pages/admin/ActivityLogPage.vue`:
  - `q-table` paginada en servidor (mismo patrón `v-model:pagination` + `@request` que `UsersListPage.vue`), columnas: fecha (`created_at` formateada), descripción, causante (nombre del usuario o "Sistema" si `causer` es `null`), y una columna de log/evento (chip con `log_name` y `event`).
  - Barra de filtros combinables sobre la tabla: texto libre para `log_name` (coincidencia exacta, tal como exige el backend), texto libre para `description` (búsqueda parcial), selector de causante, y rango de fechas (`created_from`/`created_to`).
  - Selector de causante: `q-select` con `use-input` (buscador con debounce) que consulta usuarios por nombre y filtra por `causer_id` al elegir uno; no requiere que el usuario conozca el id manualmente.
  - Botón para limpiar todos los filtros y recargar la primera página sin ellos.
  - Aplicar un filtro (o limpiar filtros) siempre recarga desde la página 1; cambiar de página conserva los filtros activos.
  - Manejo de error 422 (rango de fechas inválido, `created_to` anterior a `created_from`) mostrando el mensaje del backend vía `$q.notify` + `getApiErrorMessage`, igual que el resto de páginas admin.
- Nuevo método `searchUsersByName(name: string): Promise<AdminUser[]>` en `src/stores/users.ts` que llama a `GET /users?name=...&per_page=10` y devuelve el resultado mapeado, sin tocar `items`/`meta`/`loading` del store (estado independiente, pensado solo para alimentar el selector de causante).
- Nueva ruta `admin/actividad` en `src/router/routes.ts` → `ActivityLogPage.vue`, con `meta: { requiresAuth: true, requiresPermission: 'actividad.ver' }`.
- Nuevo ítem de menú "Log de actividad" en la sección Admin del drawer de `MainLayout.vue`, visible solo si `auth.hasPermission('actividad.ver')`, e incluido en la condición que muestra la sección Admin completa.
- Claves i18n nuevas bajo `admin.activityLog.*` (título, columnas, filtros, placeholder de causante, texto "Sistema", errores) y `layout.nav.activityLog`, en `src/i18n/es/index.ts` y `src/i18n/en-US/index.ts`.

**Out of scope (for future specs):**

- Exportar el log (CSV/PDF) — no se pidió.
- Diálogo de detalle mostrando `properties`, `subject_type`, `subject_id` en crudo — la tabla se queda con las columnas resumidas acordadas.
- Catálogo/dropdown de valores posibles de `log_name` — el backend no expone un endpoint de valores distintos; el filtro es texto libre de coincidencia exacta.
- Persistir los filtros o la paginación en la URL (query params de Vue Router) — igual que `UsersListPage.vue`, el estado vive solo en el componente mientras dura la visita.
- Cualquier acción de escritura sobre el log (no existe endpoint de borrado/edición en el backend).
- Alta/gestión del permiso `actividad.ver` en el catálogo de permisos del backend — se asume que el backend lo expondrá vía `GET /permissions` como cualquier otro permiso; esta spec solo consume `auth.hasPermission('actividad.ver')` en el frontend.

---

## Data model

```ts
// src/stores/activityLog.ts (Pinia store "activityLog")
export interface ActivityLogEntry {
  id: number;
  logName: string | null;
  event: string | null;
  description: string;
  subjectType: string | null;
  subjectId: number | null;
  causerId: number | null;
  causer: { id: number; name: string; email: string } | null;
  properties: Record<string, unknown> | null;
  createdAt: string; // ISO date-time, tal como lo devuelve el backend
}

export interface ActivityLogFilters {
  logName?: string;
  description?: string;
  causerId?: number;
  createdFrom?: string; // 'YYYY-MM-DD'
  createdTo?: string; // 'YYYY-MM-DD'
}
```

`ActivityLogEntry` mapea 1:1 el `ActivityLogResource` real del backend (snake_case → camelCase), igual que `AdminUser`/`UserResource` en `src/stores/users.ts`. La paginación reutiliza la misma forma que `PaginationMeta` de `users.ts` (`currentPage`, `lastPage`, `perPage`, `total`), redefinida localmente en `activityLog.ts` para mantener cada store autocontenido (mismo criterio ya usado entre `users.ts` y `roles.ts`).

---

## Implementation plan

1. Crear `src/stores/activityLog.ts` con `ActivityLogEntry`, `ActivityLogFilters`, el mapeo desde `ActivityLogResource` crudo, y `fetchLogs(page = 1, perPage = 15, filters: ActivityLogFilters = {})` que llama a `GET /activity-log` con los params mapeados (`log_name`, `description`, `causer_id`, `created_from`, `created_to`, `page`, `per_page`) y guarda `items`/`meta`. Prueba manual: llamar `fetchLogs()` desde Vue Devtools o un `console.log` temporal y confirmar que trae datos reales del backend.
2. Añadir `searchUsersByName` a `src/stores/users.ts`, con su propio `ref` de estado de carga (p. ej. `searchingUsers`) independiente de `loading`. El store sigue compilando y el resto de sus consumidores (`UsersListPage.vue`, `UserFormDialog.vue`) no cambian.
3. Añadir las claves i18n `layout.nav.activityLog` y todo el bloque `admin.activityLog.*` (título, columnas `createdAt`/`description`/`causer`/`logEvent`, labels de filtros, placeholder del selector de causante, texto para causante nulo, mensaje de error de carga) en `es/index.ts` y `en-US/index.ts`.
4. Añadir la ruta `admin/actividad` en `src/router/routes.ts` apuntando a `ActivityLogPage.vue` (aún no creada) con `requiresPermission: 'actividad.ver'`.
5. Crear `src/pages/admin/ActivityLogPage.vue` con la tabla paginada en servidor (sin filtros todavía), reutilizando `AdminPageWrapper`/`GlassCard` como el resto de páginas admin, y cableada a `activityLog.fetchLogs` vía `@request`, igual que `onRequest` en `UsersListPage.vue`. Prueba manual: entrar a `/admin/actividad` y ver la primera página de resultados reales, cambiar de página y de tamaño de página y confirmar que pide la página correcta al backend.
6. Añadir la barra de filtros (log_name, description, rango de fechas) sobre la tabla, con un botón "Filtrar" que dispare `fetchLogs(1, perPage, filtrosActuales)` y uno "Limpiar" que resetee los filtros y recargue la página 1 sin ellos. Prueba manual: filtrar por `description` parcial y por rango de fechas contra el backend real, confirmar que los resultados combinan ambos filtros.
7. Añadir el selector de causante (`q-select` con `use-input`, debounce ~300ms) que llama a `usersStore.searchUsersByName` y, al elegir un usuario, agrega `causerId` a los filtros activos y vuelve a pedir la página 1. Prueba manual: buscar un usuario por nombre parcial, seleccionarlo, confirmar que el log se filtra por ese causante.
8. Manejar el error 422 del backend (rango de fechas inválido) mostrando el mensaje real vía `$q.notify`/`getApiErrorMessage`. Prueba manual: poner `created_to` anterior a `created_from` y confirmar que aparece la notificación de error en vez de romper la página.
9. Añadir el ítem "Log de actividad" en la sección Admin de `MainLayout.vue`, visible solo con `actividad.ver`, e incluir ese permiso en la condición que abre la sección completa. Prueba manual end-to-end: con un usuario que tenga `actividad.ver`, el ítem aparece y navega a `/admin/actividad`; con un usuario sin ese permiso, el ítem no aparece y la ruta redirige/bloquea igual que las demás rutas admin protegidas.

---

## Acceptance criteria

- [ ] `/admin/actividad` carga la primera página real del log de actividad desde `GET /activity-log`, ordenado más reciente primero (orden que ya aplica el backend).
- [ ] Cambiar de página o de tamaño de página en la tabla dispara una nueva petición al backend con `page`/`per_page` correctos.
- [ ] Filtrar por `description` (texto parcial) devuelve solo entradas cuya descripción lo contiene.
- [ ] Filtrar por `log_name` (texto exacto) devuelve solo entradas con ese valor exacto.
- [ ] Filtrar por rango de fechas (`created_from`/`created_to`) devuelve solo entradas dentro del rango, ambos límites inclusive.
- [ ] Seleccionar un causante en el buscador filtra el log por `causer_id` y trae solo entradas de ese usuario.
- [ ] Combinar dos o más filtros a la vez (p. ej. descripción + rango de fechas) aplica todos simultáneamente.
- [ ] Cambiar de página con filtros activos conserva esos filtros en la siguiente petición.
- [ ] El botón "Limpiar filtros" resetea todos los filtros y recarga la página 1 sin ellos.
- [ ] Un rango de fechas inválido (`created_to` anterior a `created_from`) muestra una notificación de error con el mensaje del backend, sin romper la tabla.
- [ ] Una entrada sin `causer` (causer `null`) muestra "Sistema" (o su traducción) en la columna de causante.
- [ ] El ítem "Log de actividad" solo aparece en el drawer para usuarios con el permiso `actividad.ver`.
- [ ] Acceder a `/admin/actividad` sin el permiso `actividad.ver` se bloquea igual que el resto de rutas admin protegidas por permiso.

---

## Decisions

- **Sí:** selector de causante vía `q-select` con búsqueda (`GET /users?name=...`) en vez de un input numérico de id. Mejor UX; el usuario no tiene por qué conocer ids.
- **No:** exponer un input numérico para `causer_id`. Descartado por UX pobre frente a la alternativa del buscador.
- **No:** catálogo/dropdown de valores de `log_name`. El backend no expone un endpoint de valores distintos; añadir uno está fuera del alcance de esta spec de frontend. El filtro queda como texto libre de coincidencia exacta, documentando esa limitación en la propia UI (placeholder/hint).
- **Sí:** inputs de fecha nativos (`q-input type="date"`) para `created_from`/`created_to`. No existe ningún precedente de selector de fecha (`q-date`) en el resto del proyecto; usar el input nativo evita introducir un patrón nuevo de UI para una sola pantalla.
- **Sí:** permiso nuevo `actividad.ver` en vez de reutilizar `usuarios.ver` o `configuracion.ver`. El log de actividad es información sensible transversal (incluye acciones sobre usuarios, configuración, auth, etc.) y no pertenece a ninguno de esos dos grupos.
- **No:** diálogo de detalle con `properties`/`subject_type`/`subject_id` en crudo. Se prefirió el set de columnas resumido; si se necesita inspección técnica más adelante, es una spec aparte.
- **No:** exportar el log a CSV/PDF. No se pidió.
- **No:** persistir filtros o paginación en la URL. Se mantiene igual que `UsersListPage.vue`, que tampoco lo hace; el estado vive solo en el componente durante la visita.

---

## Risks

| Risk                                                                                              | Mitigation                                                                                                                                                                                                             |
| ------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| El backend aún no tiene el permiso `actividad.ver` dado de alta en su catálogo de roles/permisos. | El frontend solo consume `auth.hasPermission('actividad.ver')`; si el permiso no existe todavía, el ítem/ruta simplemente no se habilitan para nadie hasta que se asigne en el backend. No bloquea el resto de la app. |
| Buscar causante en cada tecla generaría demasiadas peticiones a `GET /users`.                     | Debounce (~300ms) antes de llamar a `searchUsersByName`, igual que cualquier buscador con `use-input` en Quasar.                                                                                                       |

---

## What is **not** in this spec

- Exportar el log (CSV/PDF).
- Diálogo de detalle con `properties`/`subject_type`/`subject_id` en crudo.
- Catálogo/dropdown de valores posibles de `log_name`.
- Persistencia de filtros o paginación en la URL.
- Cualquier acción de escritura sobre el log de actividad.
- Alta del permiso `actividad.ver` en el backend (se asume ya cubierta por la gestión de roles/permisos existente, SPEC 03).

Cada uno de estos, si se necesita, va en su propia spec.
