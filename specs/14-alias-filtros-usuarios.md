# SPEC 14 — Alias de usuario y filtrado/ordenación en `/admin/usuarios`

> **Status:** Implementado
> **Depends on:** SPEC 03
> **Date:** 2026-09-04
> **Objective:** Añadir el campo `alias` a la gestión de usuarios (columna, alta y edición) e implementar en `/admin/usuarios` una barra de filtros combinables resueltos en servidor (`name`, `email`, `alias`, `is_active`, `roles`) junto con ordenación local por columna, ya que el backend no expone ningún parámetro de ordenación en servidor para este listado.

---

## Por qué existe esta spec

SPEC 03 dejó explícitamente fuera de alcance "buscador o filtros sobre el listado de usuarios" porque en ese momento `GET /users` solo documentaba `per_page`. Se revisó el swagger real (`http://80.240.127.117:8081/docs?api-docs.json`, revisado el 2026-09-04) y `GET /users` ahora expone `name`, `email`, `alias` (todos con coincidencia parcial), `is_active` (booleano) y `roles` (nombre exacto de un rol) como filtros de servidor. El mismo swagger confirma que `UserResource` ya trae un campo `alias` (string, máx. 20 caracteres, nullable, se autogenera al crear si no se manda, editable después vía `PUT /users/{user}`) que el frontend todavía no consume en ningún lado. Por otro lado, se revisó el swagger completo y **no existe ningún parámetro de orden** (`sort`/`order_by` o equivalente) en `GET /users` ni en el resto de la API: el backend no soporta ordenación en servidor hoy.

---

## Scope

**In:**

- Campo `alias: string | null` añadido a `AdminUser` y a la interfaz interna `UserResource` en `src/stores/users.ts`, mapeado 1:1 desde el backend (ya viene en camelCase/snake_case idéntico: `alias`).
- Nueva interfaz `UsersFilters` en `src/stores/users.ts`: `{ name?: string; email?: string; alias?: string; isActive?: boolean; role?: string }`, mapeada a los query params reales (`name`, `email`, `alias`, `is_active`, `roles`).
- `fetchUsers(page, perPage, filters)` en `src/stores/users.ts` acepta un tercer parámetro `filters: UsersFilters = {}`, lo recuerda internamente (nuevo estado `filters` en el store) y lo manda como query params junto a `page`/`per_page`.
- Las acciones que refrescan el listado tras una mutación (`createUser`, `updateUser`, `deleteUser`, `unlockUser`, `uploadAvatar`) reutilizan los filtros actualmente aplicados (el nuevo estado `filters` del store) en vez de recargar sin filtros, para no perder el filtrado activo tras crear/editar/eliminar/desbloquear/subir avatar.
- `alias` añadido a `CreateUserPayload` (opcional) y `UpdateUserPayload` (opcional) en `src/stores/users.ts`.
- `UserFormDialog.vue`: nuevo `q-input` para `alias`, opcional, con `maxlength="20"` y una regla de validación que rechaza más de 20 caracteres. Si se deja en blanco (al crear o al editar), no se manda el campo `alias` en el payload — igual criterio que el campo password al editar ("en blanco = no tocar"/"dejar que el backend autogenere").
- `UsersListPage.vue`:
  - Nueva columna `alias` en la tabla (entre `email` y `isActive`).
  - Barra de filtros sobre la tabla, con el mismo patrón visual/funcional ya usado en `ActivityLogPage.vue` (SPEC 13): inputs de texto para `name`/`email`/`alias`, un `q-select` de 3 estados para `is_active` (Todos/Activos/Inactivos), un `q-select` para `roles` (poblado desde `rolesStore.roles`, con opción para "Todos"/sin filtro), y botones "Filtrar"/"Limpiar".
  - Aplicar filtros (o limpiarlos) siempre recarga desde la página 1; cambiar de página conserva los filtros activos (mismo patrón que SPEC 13).
  - Columnas `name`, `email`, `alias` e `isActive` marcadas como `sortable: true`. Como el backend no soporta ordenación en servidor, el clic en el header de estas columnas **no** dispara una petición al backend: ordena localmente solo las filas ya cargadas de la página actual, vía un `computed` que aplica `pagination.sortBy`/`pagination.descending` sobre `usersStore.items`. `onRequest` detecta si el disparo fue solo un cambio de orden (mismo `page`/`rowsPerPage` que `usersStore.meta` actual) y en ese caso no llama al backend.
  - `onMounted` también llama a `rolesStore.fetchRoles()` para poblar el `q-select` de roles del filtro (independiente de que `UserFormDialog.vue` también lo haga).
- Claves i18n nuevas bajo `admin.users.columns.alias`, `admin.users.filters.*` (labels de name/email/alias/is_active con sus 3 opciones/roles, placeholder del selector de rol, botones filtrar/limpiar), `admin.userForm.aliasLabel` y `admin.userForm.aliasTooLong`, en `src/i18n/es/index.ts` y `src/i18n/en-US/index.ts`.

**Out of scope (for future specs):**

- Ordenación real en servidor: el backend no expone ningún parámetro de orden; si en el futuro lo añade, esta pantalla debería migrar de ordenación local a server-side (ver Riesgos).
- Persistir filtros, paginación u orden en la URL (query params de Vue Router) — igual que `UsersListPage.vue`/`ActivityLogPage.vue` hoy, el estado vive solo en el componente durante la visita.
- Selección múltiple de roles en el filtro — el backend solo acepta un nombre de rol exacto por petición (`roles=admin`), no una lista.
- Validar unicidad del alias en el cliente — no está documentada como restricción en el swagger; cualquier error de este tipo se muestra vía el manejo de errores 422 ya existente (`getApiErrorMessage`).
- Cambios en la asignación de roles de un usuario, en el checklist de permisos de un rol, o en cualquier otra pantalla fuera de `/admin/usuarios` y su formulario.
- Exportar el listado filtrado (CSV/PDF).

---

## Data model

```ts
// src/stores/users.ts (Pinia store "users")
export interface AdminUser {
  id: number;
  name: string;
  email: string;
  alias: string | null; // nuevo
  isActive: boolean;
  isLocked: boolean;
  avatarUrl: string | null;
  lastLoginAt: string | null;
  roles: string[];
  permissions: string[];
}

export interface UsersFilters {
  name?: string;
  email?: string;
  alias?: string;
  isActive?: boolean;
  role?: string; // se manda como query param "roles" (nombre exacto de un rol)
}

export interface CreateUserPayload {
  name: string;
  email: string;
  alias?: string; // opcional; si se omite, el backend autogenera uno a partir de "name"
  password: string;
  password_confirmation?: string;
  roles: string[];
}

export interface UpdateUserPayload {
  name?: string;
  email?: string;
  alias?: string; // opcional; si se omite, no se toca el alias actual
  password?: string;
  password_confirmation?: string;
  is_active?: boolean;
  roles?: string[];
}
```

El store `users` gana un nuevo `ref<UsersFilters>` interno (p. ej. `filters`) que guarda la última combinación de filtros pasada a `fetchUsers`, reutilizada por `createUser`/`updateUser`/`deleteUser`/`unlockUser`/`uploadAvatar` al refrescar `items` tras su mutación. No se introduce ningún tipo nuevo de paginación: `PaginationMeta` no cambia.

---

## Implementation plan

1. Añadir `alias: string | null` a `AdminUser` y a la interfaz interna `UserResource` en `src/stores/users.ts`, y mapearlo en `mapUser`. El store sigue compilando; `UsersListPage.vue`/`UserFormDialog.vue` no lo usan todavía. Prueba manual: en Vue Devtools, confirmar que `usersStore.items[0].alias` trae el valor real del backend tras un `fetchUsers()`.
2. Añadir `UsersFilters` a `src/stores/users.ts`, un `ref<UsersFilters>` interno (`filters`), y cambiar la firma de `fetchUsers` a `fetchUsers(page = 1, perPage = 15, filters: UsersFilters = {})`: guarda `filters` en el nuevo ref, mapea a los query params reales (`name`, `email`, `alias`, `is_active`, `roles`) omitiendo los que no vengan definidos, y los manda junto a `page`/`per_page`. Prueba manual: llamar `fetchUsers(1, 15, { name: 'algo' })` desde Devtools y confirmar en la pestaña de red que la petición incluye `?name=algo`.
3. Cambiar `createUser`, `updateUser`, `deleteUser`, `unlockUser` y `uploadAvatar` para que su refresco interno llame `fetchUsers(meta.value.currentPage, meta.value.perPage, filters.value)` en vez de sin filtros. Prueba manual: aplicar un filtro, editar un usuario que sigue cumpliendo el filtro, confirmar que la tabla se refresca sin perder el filtro activo.
4. Añadir `alias` a `CreateUserPayload` y `UpdateUserPayload`.
5. En `UserFormDialog.vue`, añadir el `q-input` de `alias` (opcional, `maxlength="20"`, regla que rechaza más de 20 caracteres), inicializarlo en `resetForm()` desde `props.user?.alias ?? ''`, e incluirlo en el payload de `createUser`/`updateUser` solo si no está vacío (trim). Prueba manual: crear un usuario dejando el alias en blanco y confirmar que el backend autogenera uno; editar ese usuario poniéndole un alias propio y confirmar que se guarda; intentar poner más de 20 caracteres y confirmar que la validación de cliente lo bloquea antes de llamar al backend.
6. En `UsersListPage.vue`, añadir la columna `alias` a `columns` (entre `email` e `isActive`).
7. Añadir la barra de filtros (name/email/alias como `q-input`, is_active como `q-select` de 3 estados, roles como `q-select` poblado desde `rolesStore.roles`) sobre la tabla, con el mismo patrón de `filters`/`appliedFilters`/`buildFilters()`/`onFilterClick`/`onClearClick` que `ActivityLogPage.vue`. Añadir `rolesStore.fetchRoles()` en `onMounted`. Prueba manual: filtrar por cada campo por separado y combinados (p. ej. `name` + `is_active`) contra el backend real, confirmar que los resultados son correctos y que "Limpiar" recarga la página 1 sin filtros.
8. Marcar `name`, `email`, `alias` e `isActive` como `sortable: true` en `columns`. Añadir un `computed` `sortedItems` que ordene `usersStore.items` según `pagination.value.sortBy`/`pagination.value.descending`, y usarlo en `:rows` del `q-table` en vez de `usersStore.items` directamente. Ajustar `onRequest` para que, si el `page`/`rowsPerPage` recibidos coinciden con los actuales de `usersStore.meta` (es decir, el disparo fue solo un cambio de orden), no llame a `usersStore.fetchUsers` — el `computed` ya reacciona al cambio de `pagination.sortBy` sin pedir nada al backend. Prueba manual: con varios usuarios cargados en una página, hacer clic en el header de `name`/`email`/`alias`/`isActive` y confirmar que la tabla se reordena sin disparar una petición nueva al backend (verificar en la pestaña de red), y que cambiar de página sí sigue disparando la petición real.
9. Añadir las claves i18n nuevas (`admin.users.columns.alias`, `admin.users.filters.*`, `admin.userForm.aliasLabel`, `admin.userForm.aliasTooLong`) en `es/index.ts` y `en-US/index.ts`.
10. Prueba manual end-to-end contra el backend real (ver Acceptance criteria): alta/edición de alias, cada filtro individual y combinaciones, paginación conservando filtros, ordenación local por columna, y que las mutaciones (toggle activo, eliminar, desbloquear, subir avatar) no rompen el filtrado activo.

---

## Acceptance criteria

- [x] La tabla de `/admin/usuarios` muestra una columna `alias` con el valor real de cada usuario (o vacío si es `null`).
- [x] Crear un usuario sin especificar alias lo deja con el alias autogenerado por el backend, visible en la tabla tras crearlo.
- [x] Crear o editar un usuario indicando un alias propio lo guarda y lo refleja en la tabla.
- [x] Editar un usuario dejando el campo alias en blanco no borra ni cambia su alias actual.
- [x] Escribir más de 20 caracteres en el campo alias del formulario muestra el error de validación de cliente sin llegar a llamar al backend.
- [x] Filtrar por `name` (parcial), `email` (parcial) o `alias` (parcial) por separado devuelve solo los usuarios que coinciden.
- [x] Filtrar por `is_active` (Activos/Inactivos) devuelve solo los usuarios en ese estado; "Todos" no manda el parámetro.
- [x] Filtrar por `roles` (un rol exacto elegido en el selector) devuelve solo los usuarios con ese rol asignado.
- [x] Combinar dos o más filtros a la vez (p. ej. `name` + `is_active`) aplica todos simultáneamente.
- [x] Cambiar de página con filtros activos conserva esos filtros en la siguiente petición al backend.
- [x] El botón "Limpiar" resetea todos los filtros y recarga la página 1 sin ellos.
- [x] Tras crear, editar, eliminar, desbloquear o subir avatar con un filtro activo, la tabla se refresca conservando ese filtro.
- [x] Hacer clic en el header de `name`, `email`, `alias` o `isActive` reordena las filas ya cargadas de la página actual, sin disparar una nueva petición al backend.
- [x] Cambiar de página (con o sin un orden de columna activo) sí dispara la petición real al backend con el `page`/`per_page` correctos.

---

## Decisions

- **Sí:** filtros de servidor para `name`, `email`, `alias`, `is_active` y `roles`, reemplazando la exclusión explícita de SPEC 03 ("No buscador ni filtros"). El swagger real confirma que el backend ya los soporta hoy; la decisión de SPEC 03 quedó obsoleta.
- **Sí:** patrón de filtros con inputs + botones "Filtrar"/"Limpiar" (no filtrado instantáneo con debounce), igual que SPEC 13. Consistencia visual/funcional con la única otra pantalla de este proyecto que ya tiene filtros combinables, y evita peticiones excesivas al backend.
- **Sí:** filtro `is_active` con `q-select` de 3 estados (Todos/Activos/Inactivos) en vez de un toggle. Un toggle no permite ver solo los inactivos sin invertir la lógica.
- **Sí:** filtro `roles` con `q-select` poblado desde el catálogo ya cargado por `rolesStore.roles`, en vez de un input de texto libre. Evita que el usuario escriba mal el nombre exacto que el backend espera.
- **No:** ordenación en servidor. El swagger completo no documenta ningún parámetro de orden (`sort`/`order_by`); implementarla en servidor no es posible sin que el backend lo exponga primero.
- **Sí:** ordenación local (solo de las filas ya cargadas de la página actual) para `name`, `email`, `alias` e `isActive`, dejando claro (vía el comportamiento y esta spec) que no es un orden global sobre todo el listado. Se prefirió dar algo de utilidad de ordenación en vez de no ofrecer nada, ya que el catálogo de columnas se presta a ello.
- **Sí:** el alias se omite del payload si se deja en blanco (tanto al crear como al editar), igual criterio que el campo password al editar ("blanco = no tocar"). Consistente con la propia descripción del backend ("se autogenera si no se manda; editable después").
- **No:** validar unicidad del alias en el cliente. No está documentada como restricción; si el backend la aplica, se muestra vía el manejo de errores 422 ya existente.
- **Sí:** las acciones de mutación del store (`createUser`, `updateUser`, `deleteUser`, `unlockUser`, `uploadAvatar`) reutilizan los filtros activos al refrescar la tabla, en vez de recargar sin filtros. Evita que una acción puntual (p. ej. desbloquear un usuario) "resetee" visualmente un filtrado que el admin dejó activo a propósito.

---

## Risks

| Risk                                                                                                                                                             | Mitigation                                                                                                                                                                                          |
| ---------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| La ordenación local solo afecta a las filas cargadas de la página actual, lo que puede confundir a un admin que espere un orden global sobre todos los usuarios. | Es una limitación conocida y documentada (ver Decisions); si el backend añade `sort`/`order_by` a `GET /users` en el futuro, esta pantalla debe migrar a ordenación server-side en una spec aparte. |
| El backend podría no aceptar `roles` combinado con los demás filtros en la misma petición (no verificado en un entorno real, solo por swagger).                  | Si ocurre, se detecta en la prueba manual del paso 7 del plan de implementación antes de dar la spec por terminada; de fallar, se ajusta el mapeo de query params sin tocar el resto de filtros.    |

---

## What is **not** in this spec

- Ordenación real en servidor (el backend no la expone).
- Persistencia de filtros, paginación u orden en la URL.
- Selección múltiple de roles en el filtro.
- Validación de unicidad del alias en el cliente.
- Cambios en la asignación de roles de un usuario o en el checklist de permisos de un rol.
- Exportar el listado filtrado.

Cada uno de estos, si se necesita, va en su propia spec.
