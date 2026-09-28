# SPEC 03 — Gestión de usuarios y roles

> **Status:** Implementado
> **Depends on:** SPEC 01
> **Date:** 2026-08-30
> **Objective:** Implementar las pantallas de administración de usuarios (listado, alta, edición, baja, desbloqueo y asignación de roles) y de roles/permisos (ver permisos de cada rol y asignárselos/quitárselos) contra la API Laravel existente, protegidas por un guard de permisos.

---

## Por qué existe esta spec

El backend Laravel expone endpoints de `Users` y `Roles` (`GET /docs?api-docs.json`, revisado el 2026-08-30) que **no permiten crear ni eliminar roles o permisos** — se siembran a mano en el backend. Lo único gestionable desde el frontend es: el CRUD de usuarios, la asignación de roles a un usuario, y la asignación/remoción de permisos a un rol ya existente. SPEC 01 ya guarda `roles` y `permissions` del usuario logueado en el store de auth pero dejó explícitamente fuera "guards de autorización por rol/permiso en rutas o componentes"; esta spec es la primera que necesita esos guards, porque son justo las pantallas que deben protegerse.

---

## Scope

**In:**

- Getter `hasPermission(permission: string): boolean` añadido al store `auth` existente (`src/stores/auth.ts`), basado en el array `permissions` ya persistido por SPEC 01.
- Store `src/stores/users.ts`: listado paginado de usuarios (`GET /users?per_page=`), alta (`POST /users`), edición (`PUT /users/{user}`), baja (`DELETE /users/{user}`), desbloqueo (`POST /users/{user}/unlock`).
- Store `src/stores/roles.ts`: listado de roles (`GET /roles`), catálogo de permisos (`GET /permissions`), asignar permisos a un rol (`POST /roles/{role}/permissions`), quitar permisos de un rol (`DELETE /roles/{role}/permissions`).
- Ruta `/admin/usuarios` con `UsersListPage.vue`: tabla paginada (server-side, ligada a `meta` de la respuesta) con nombre, email, estado activo, estado bloqueado y roles de cada usuario.
- Diálogo `UserFormDialog.vue` (crear y editar en el mismo componente): nombre, email, password + confirmación (password obligatorio solo al crear, opcional al editar — en blanco significa "no cambiar"), y un multi-select de roles poblado desde el store `roles`. Al guardar, el array de roles se manda completo en el `PUT` (reemplaza los roles actuales del usuario).
- Switch de activar/desactivar por fila en la tabla (llama `PUT /users/{user}` solo con `is_active`).
- Botón "Desbloquear" por fila, visible únicamente cuando `is_locked === true`.
- Confirmación (`q-dialog`) antes de eliminar un usuario.
- Ruta `/admin/roles` con `RolesPermissionsPage.vue`: selector de rol (poblado desde el store `roles`) y, al elegir uno, un checklist con todos los permisos del catálogo, marcados los que ya tiene ese rol; cada marcar/desmarcar dispara de inmediato `POST` o `DELETE` a `/roles/{role}/permissions` solo con el permiso tocado (no hay endpoint de reemplazo completo).
- Guard de router: además del `requiresAuth` de SPEC 01, las rutas `/admin/usuarios` y `/admin/roles` llevan `meta: { requiresPermission: 'usuarios.ver' }`; si el usuario autenticado no tiene ese permiso, se le redirige a `/` con una notificación de error.
- Botones de acción por fila/pantalla gateados por permiso puntual: crear → `usuarios.crear`; editar, activar/desactivar, desbloquear, asignar roles y gestionar permisos de un rol → `usuarios.editar`; eliminar → `usuarios.eliminar`. El botón/control se oculta (no solo se deshabilita) si falta el permiso.
- Ítems de navegación "Usuarios" y "Roles y permisos" en el layout principal, visibles solo si `hasPermission('usuarios.ver')`.
- En la fila del usuario actualmente logueado, los controles de eliminar y desactivar aparecen deshabilitados.
- Notificaciones (Quasar `Notify`) para errores de estas pantallas: `403` (no autorizado), `422` (validación, incluye "alguno de los roles/permisos indicados no existe").

**Out of scope (for future specs):**

- Crear o eliminar roles y permisos (el backend no expone esos endpoints; se gestionan por seeders).
- Subida/gestión de avatar de usuario (`POST /users/{user}/avatar`).
- Buscador o filtros sobre el listado de usuarios (`GET /users` solo admite `per_page`, sin parámro de búsqueda documentado).
- Permitir que un admin se elimine o desactive a sí mismo desde esta pantalla.
- Refresco en tiempo real de `roles`/`permissions` del propio usuario logueado si otro admin se los cambia en caliente (se actualiza recién en el próximo login o `fetchMe()`).
- Internacionalización (i18n) de los textos de estas pantallas.
- Un permiso dedicado tipo `roles.ver`/`roles.editar` — se reutiliza el módulo `usuarios.*` para gatear ambas pantallas (ver Decisiones).

---

## Data model

```ts
// src/stores/users.ts (Pinia store "users")
interface AdminUser {
  id: number;
  name: string;
  email: string;
  isActive: boolean;
  isLocked: boolean;
  lastLoginAt: string | null;
  roles: string[];
  permissions: string[];
}

interface PaginationMeta {
  currentPage: number;
  lastPage: number;
  perPage: number;
  total: number;
}

interface UsersState {
  items: AdminUser[];
  meta: PaginationMeta;
  loading: boolean;
}
```

```ts
// src/stores/roles.ts (Pinia store "roles")
interface Role {
  id: number;
  name: string;
  permissions: string[];
}

interface PermissionItem {
  id: number;
  name: string; // ej: "usuarios.ver"
}

interface RolesState {
  roles: Role[];
  permissions: PermissionItem[];
  loading: boolean;
}
```

No se persiste nada de esto en `localStorage`: se recarga desde el backend cada vez que se entra a `/admin/usuarios` o `/admin/roles`.

---

## Implementation plan

**Regla de paginación:** toda tabla que liste elementos debe usar paginación server-side (`q-table` con `:rows-per-page-options`, `v-model:pagination` ligado a `page`/`per_page` y al `meta` de la respuesta) siempre que el método del API del que obtiene los datos la soporte. `GET /users` sí la soporta (`per_page`, respuesta con `meta.current_page`/`last_page`/`per_page`/`total`) y debe paginarse en servidor. `GET /roles` y `GET /permissions` **no** exponen ningún parámetro de paginación en el swagger actual: se traen completos y se listan/filtran en cliente (el catálogo de permisos se muestra como checklist, no como tabla paginada). Si en el futuro esos endpoints ganan paginación server-side, esta pantalla debe adoptarla en vez de seguir trayendo el listado completo.

1. Añadir el getter `hasPermission(permission: string): boolean` a `src/stores/auth.ts` (`(user?.permissions ?? []).includes(permission)`). Prueba manual: en Vue Devtools, con un usuario logueado, comprobar que el getter devuelve `true`/`false` según sus permisos reales.
2. Crear `src/stores/roles.ts` con estado inicial vacío y las acciones `fetchRoles()` y `fetchPermissions()` contra `GET /roles` y `GET /permissions`. El store compila y no rompe nada existente.
3. Añadir a `src/stores/roles.ts` las acciones `assignPermissions(roleId, permissions: string[])` y `removePermissions(roleId, permissions: string[])` contra `POST`/`DELETE /roles/{role}/permissions`, actualizando el rol correspondiente en `roles` con la respuesta (`data` es el `RoleResource` actualizado).
4. Crear `src/stores/users.ts` con estado inicial vacío y la acción `fetchUsers(page = 1, perPage = 15)` contra `GET /users`, guardando `items` y `meta`.
5. Añadir a `src/stores/users.ts` las acciones `createUser(payload)`, `updateUser(id, payload)`, `deleteUser(id)` y `unlockUser(id)` contra sus endpoints correspondientes, refrescando `items` tras cada mutación exitosa.
6. Registrar las rutas `/admin/usuarios` y `/admin/roles` en `src/router/routes.ts` con `meta: { requiresAuth: true, requiresPermission: 'usuarios.ver' }`.
7. Extender el guard `router.beforeEach` en `src/router/index.ts`: si `to.meta.requiresPermission` existe y `!authStore.hasPermission(to.meta.requiresPermission)`, mostrar `Notify` de error ("No tienes permiso para acceder a esta sección") y redirigir a `/`.
8. Añadir los ítems de navegación "Usuarios" y "Roles y permisos" en el layout principal existente, envueltos en un `v-if="authStore.hasPermission('usuarios.ver')"`.
9. Crear `src/pages/admin/UsersListPage.vue`: `q-table` paginada server-side contra `fetchUsers` (columnas nombre/email/activo/bloqueado/roles), switch de activo/inactivo por fila (`usuarios.editar`), botón "Desbloquear" visible solo si `isLocked` (`usuarios.editar`), botones editar (`usuarios.editar`) y eliminar con confirmación (`usuarios.eliminar`) por fila, y botón "Nuevo usuario" (`usuarios.crear`). La fila del usuario logueado deshabilita eliminar y el switch de activo.
10. Crear `src/components/admin/UserFormDialog.vue`: formulario de nombre/email/password+confirmación (password opcional al editar) y multi-select de roles (catálogo de `roles` store); al guardar llama `createUser` o `updateUser` según el modo, mandando el array de roles completo.
11. Crear `src/pages/admin/RolesPermissionsPage.vue`: `q-select` de rol (catálogo de `roles` store) y, al elegir uno, checklist de todos los `permissions` del catálogo con los del rol ya marcados; cada toggle llama de inmediato `assignPermissions`/`removePermissions` solo con el permiso tocado. Todo el checklist deshabilitado si falta `usuarios.editar`.
12. Prueba manual end-to-end completa contra el backend real (ver Acceptance criteria): CRUD de usuario, asignación de roles, asignación/remoción de permisos de un rol, y comportamiento del guard de permisos con un usuario sin `usuarios.ver`.

---

## Acceptance criteria

- [ ] Entrar a `/admin/usuarios` con un usuario que tiene `usuarios.ver` muestra la tabla paginada de usuarios reales del backend.
- [ ] Entrar a `/admin/usuarios` o `/admin/roles` con un usuario sin `usuarios.ver` redirige a `/` con una notificación de error, sin llegar a renderizar la pantalla.
- [ ] El botón "Nuevo usuario" no aparece si el usuario logueado no tiene `usuarios.crear`.
- [ ] Crear un usuario con nombre, email, password y al menos un rol lo agrega a la tabla sin recargar la página.
- [ ] Editar un usuario dejando el campo password en blanco no cambia su password.
- [ ] Editar el multi-select de roles de un usuario y guardar reemplaza exactamente esos roles en el backend (se refleja en la columna "roles" de la tabla).
- [ ] El switch de activo/inactivo de una fila llama al backend y refleja el nuevo estado sin recargar la página.
- [ ] El botón "Desbloquear" solo aparece en filas con `isLocked = true`, y al usarlo la fila pasa a `isLocked = false`.
- [ ] Eliminar un usuario pide confirmación antes de llamar al backend; al confirmar, desaparece de la tabla.
- [ ] En la fila del usuario actualmente logueado, los controles de eliminar y de activo/inactivo aparecen deshabilitados.
- [ ] Entrar a `/admin/roles`, elegir un rol, muestra el checklist de permisos con los correctos ya marcados.
- [ ] Marcar un permiso no marcado en el checklist lo asigna al rol (`POST /roles/{role}/permissions`) y queda reflejado tras la respuesta.
- [ ] Desmarcar un permiso marcado lo quita del rol (`DELETE /roles/{role}/permissions`) y queda reflejado tras la respuesta.
- [ ] Los ítems de navegación "Usuarios" y "Roles y permisos" no aparecen en el menú si el usuario logueado no tiene `usuarios.ver`.
- [ ] Una respuesta `403` o `422` de cualquiera de estos endpoints muestra una notificación de error legible y no deja la UI en un estado inconsistente (ej. checklist marcado pero el cambio no se guardó).

---

## Decisions

- **Sí:** un solo spec para usuarios y roles/permisos en vez de dos separados. Es un módulo de administración cohesivo de tamaño similar a SPEC 01, y ambas pantallas comparten el mismo guard de permiso.
- **Sí:** añadir el guard de permisos (`requiresPermission` + `hasPermission`) en este spec, aunque SPEC 01 lo dejó fuera. Estas son las primeras pantallas que realmente necesitan restringirse por permiso, y SPEC 01 ya deja `permissions` disponible en el store de auth para esto.
- **No:** subida de avatar en este spec. Consistente con la exclusión explícita de SPEC 01; se deja para un spec propio de perfil/avatar.
- **Sí:** asignar roles a un usuario vía multi-select + `PUT` que reemplaza el array completo, en vez de checkboxes con `POST`/`DELETE` incrementales. Es más simple de razonar en la UI del formulario (un solo estado "roles del usuario") y el endpoint `PUT /users/{user}` ya soporta reemplazo completo.
- **Sí:** para permisos de un rol, sí usar toggles con `POST`/`DELETE` incrementales (no un multi-select con guardado diferido), porque el backend **no** expone un endpoint de reemplazo completo para `roles/{role}/permissions` — solo sumar o quitar.
- **Sí:** reutilizar el permiso `usuarios.ver`/`usuarios.editar` también para gatear la pantalla de roles/permisos, en vez de inventar `roles.ver`/`roles.editar`. El swagger solo confirma permisos del módulo `usuarios.*`; asumir un módulo `roles.*` no confirmado generaría un guard que bloquea a todo el mundo hasta que alguien lo corrija en producción.
- **Sí:** guard de permiso a nivel de ruta **y** ocultar botones de acción según el permiso puntual (crear/editar/eliminar). Evita que la UI ofrezca acciones que el backend va a rechazar con `403`.
- **No:** buscador ni filtros en el listado de usuarios. `GET /users` no documenta ningún parámetro de búsqueda; un filtro client-side sobre una sola página cargada sería engañoso (no busca en todo el listado real).
- **Sí:** bloquear que el admin logueado se elimine o desactive a sí mismo desde esta pantalla (controles deshabilitados en su propia fila). Evita que un admin se bloquee a sí mismo por accidente sin necesidad de lógica de recuperación.
- **Sí:** selector de rol + checklist de permisos en vez de una matriz completa roles×permisos. Escala mejor si el catálogo de permisos crece (evita una tabla muy ancha) y es más simple de implementar con los endpoints disponibles (uno-a-la-vez, no hay "guardar matriz completa").
- **Sí:** formulario de usuario en un diálogo (`UserFormDialog.vue`) compartido entre alta y edición, en vez de páginas separadas. Es el patrón habitual de Quasar para formularios de CRUD cortos y evita duplicar validación entre dos componentes.
- **Sí:** ante un permiso insuficiente en el guard de router, redirigir a `/` con notificación en vez de mostrar una página de "403" dedicada. Más simple y suficiente para el proyecto base; una página de error dedicada se puede añadir después si se necesita.

---

## Risks

| Riesgo                                                                                                                                        | Mitigación                                                                                                                                                                                                    |
| --------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| El backend podría tener (o llegar a tener) un módulo de permisos `roles.*` independiente de `usuarios.*`, distinto de lo asumido en esta spec | Verificar en el entorno real qué permisos trae `GET /permissions` antes de dar por cerrada la spec; si existe `roles.*`, ajustar el `meta.requiresPermission` de `/admin/roles` sin tocar el resto del guard. |
| Si otro admin cambia los roles/permisos del usuario actualmente logueado, este no lo ve reflejado hasta su próximo login o `fetchMe()`        | Aceptado como límite conocido de este spec (ver Scope); no se implementa refresco en caliente del store de auth.                                                                                              |
| Checklist de permisos de un rol queda visualmente marcado/desmarcado antes de confirmar la respuesta del backend, si la llamada falla         | Revertir el estado visual del checkbox si la llamada a `assignPermissions`/`removePermissions` falla, mostrando la notificación de error correspondiente.                                                     |

---

## What is **not** in this spec

- Crear o eliminar roles y permisos.
- Subida/gestión de avatar de usuario.
- Buscador o filtros sobre el listado de usuarios.
- Auto-eliminación o auto-desactivación del admin logueado.
- Refresco en tiempo real de `roles`/`permissions` propios si otro admin los cambia.
- Internacionalización de textos.
- Un módulo de permisos `roles.*` independiente de `usuarios.*`.

Cada uno de estos, si se necesita, va en su propio spec.
