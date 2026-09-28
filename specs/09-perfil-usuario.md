# SPEC 09 — Página "Mi perfil" (autoservicio de datos propios)

> **Status:** Aprobado
> **Depends on:** SPEC 01, SPEC 03, SPEC 04, SPEC 06, SPEC 08
> **Date:** 2026-08-31
> **Objective:** Agregar una página `/perfil` que permita a cualquier usuario autenticado editar su propio nombre, email, password y avatar, sin depender de ningún permiso de administración.

---Paso

## Por qué existe esta spec

SPEC 01 dejó explícitamente fuera "cambio de password estando autenticado / edición de perfil (el backend no expone endpoint para ello hoy)". SPEC 03 solo cubre que un **admin** (con `usuarios.editar`) edite a **otros** usuarios desde `UserFormDialog.vue`. SPEC 06 agregó subida de avatar, pero también explícitamente fuera de alcance: "subida de avatar desde una pantalla de 'mi perfil' fuera del panel admin — hoy no existe esa pantalla". Esta spec cierra ese hueco.

El backend (`GET /docs?api-docs.json`, revisado el 2026-08-31) sigue sin exponer un endpoint dedicado de perfil ni de cambio de password: no existen `PATCH /profile`, `POST /change-password` ni similares. Los únicos endpoints disponibles sobre un usuario son `PUT /users/{user}` (acepta `name`, `email`, `password`, `password_confirmation`, `is_active`, `roles`) y `POST /users/{user}/avatar`, los mismos que ya usa SPEC 03/06 para que un admin edite a un tercero. Esta spec reutiliza esos dos endpoints apuntando al propio `id` del usuario logueado, en vez de esperar a que el backend agregue endpoints dedicados.

Dos límites del backend quedan aceptados tal cual, sin rodeos del lado frontend:

- `PUT /users/{user}` no pide `current_password` para cambiar el password — cualquiera con el JWT vigente puede cambiarlo solo con `password`+`password_confirmation`. El frontend no simula esa validación (sería fricción cosmética sin beneficio real).
- No hay verificación de email al cambiarlo — el cambio es inmediato.

---

## Scope

**In:**

- Ruta `/perfil` (`src/pages/ProfilePage.vue`), registrada como hija de `/` en `src/router/routes.ts` con `meta: { requiresAuth: true }` — **sin** `requiresPermission`: cualquier usuario autenticado accede a su propio perfil, sin importar sus permisos de administración.
- Acceso a la ruta haciendo click en el bloque de avatar/nombre/email del drawer en `src/layouts/MainLayout.vue` (el bloque `.profile-block` ya tiene estilos `:hover` preparados sin uso).
- Nuevas acciones en `src/stores/auth.ts` (no en `src/stores/users.ts`, ver Decisiones):
  - `updateProfile(payload: UpdateProfilePayload)`: `PUT /users/{id}` sobre el propio `user.value.id`, con `name`/`email`/`password`/`password_confirmation` opcionales (password vacío = no cambiar, mismo patrón que `UserFormDialog.vue`). El payload **nunca** incluye `roles` ni `is_active`.
  - `uploadOwnAvatar(file: File)`: `POST /users/{id}/avatar` sobre el propio `user.value.id`, multipart.
  - Ambas, al resolver con éxito, llaman a `fetchMe()` para refrescar `auth.user` (y por lo tanto el drawer de `MainLayout`) sin recargar la página.
- Campo `lastLoginAt: string | null` agregado a `AuthUser` y a la interfaz interna `UserResource` de `src/stores/auth.ts` (el backend ya lo expone en `UserResource.last_login_at`, hoy ignorado por este store).
- Componente compartido `src/components/common/AvatarUploader.vue`, extraído del bloque de avatar que hoy vive embebido en `src/components/admin/UserFormDialog.vue`: recibe `avatarUrl`, `email` (fallback iniciales/color), `disabled` y una función `uploadFn: (file: File) => Promise<void>` por prop; valida en el cliente tipo (`image/jpeg`/`png`/`webp`) y tamaño (máx. 2MB) antes de invocar `uploadFn`, y muestra su propio estado de carga y notificaciones de éxito/error.
- `UserFormDialog.vue` refactorizado para usar `AvatarUploader.vue` internamente (con `uploadFn` apuntando a `usersStore.uploadAvatar`), preservando exactamente el comportamiento ya aprobado en SPEC 06 (gateo por `usuarios.editar`, oculto en modo alta).
- `ProfilePage.vue`: `GlassCard` centrado (mismo patrón visual que `BusinessConfigPage.vue`), con:
  - `AvatarUploader` (sin gateo por permiso — el propio usuario siempre puede cambiar su avatar), con `uploadFn` apuntando a `authStore.uploadOwnAvatar`.
  - Campos nombre y email (reglas de validación equivalentes a `UserFormDialog.vue`).
  - Password + confirmación, ambos opcionales — en blanco significa "no cambiar" (igual que edición en `UserFormDialog.vue`).
  - Botón "Guardar" que llama a `authStore.updateProfile` con los campos modificados.
  - Sección de solo lectura: chips con los roles del usuario (`auth.user.roles`) y fecha de último acceso (`auth.user.lastLoginAt`, formateada).
- Notificaciones (Quasar `Notify`) de éxito y de error (`getApiErrorMessage`) para `updateProfile` y para la subida de avatar.
- Claves i18n nuevas bajo el namespace `profile.*` en `src/i18n/es/index.ts` y `src/i18n/en-US/index.ts`, para `ProfilePage.vue`. Las claves de avatar hoy namespaced bajo `admin.userForm.avatar*` se mueven a un namespace común `common.avatarUploader.*`, reutilizado tanto por `UserFormDialog.vue` como por `ProfilePage.vue`.

**Out of scope (for future specs):**

- Verificación de email al cambiarlo (el backend no expone ese flujo) — el cambio de email es inmediato y sin confirmación.
- Pedir "password actual" antes de permitir cambiar el password. El backend no lo valida (no existe campo `current_password` documentado); se acepta la limitación tal cual (ver Decisiones).
- Editar los propios roles o el propio estado `is_active` desde esta pantalla — el payload de `updateProfile` nunca los incluye, aunque el endpoint `PUT /users/{user}` los acepte.
- Eliminar/quitar un avatar ya subido — mismo límite ya documentado en SPEC 06 (el backend no expone esa operación).
- Activar/desactivar 2FA propio, o cualquier configuración de seguridad más allá de nombre/email/password/avatar — no hay endpoints para ello hoy.
- Eliminar la propia cuenta.
- Un ítem de navegación dedicado "Mi perfil" en el drawer — el acceso es únicamente por click en el bloque de avatar (ver Decisiones).
- Historial de cambios de perfil o auditoría de ediciones.

---

## Data model

```ts
// src/stores/auth.ts — extensión de AuthUser y UserResource existentes
interface AuthUser {
  id: number;
  name: string;
  email: string;
  isActive: boolean;
  isLocked: boolean;
  avatarUrl: string | null;
  lastLoginAt: string | null; // nuevo
  roles: string[];
  permissions: string[];
}

// nuevas acciones del store "auth"
interface UpdateProfilePayload {
  name?: string;
  email?: string;
  password?: string;
  password_confirmation?: string;
  // deliberadamente sin roles/is_active — ver Decisiones
}
// updateProfile(payload: UpdateProfilePayload): Promise<void>
//   PUT /users/{user.value.id}  →  fetchMe()
// uploadOwnAvatar(file: File): Promise<void>
//   POST /users/{user.value.id}/avatar (multipart)  →  fetchMe()
```

```ts
// src/components/common/AvatarUploader.vue — props
interface AvatarUploaderProps {
  avatarUrl: string | null;
  email: string; // fallback para iniciales/color determinista
  disabled?: boolean; // oculta/deshabilita el selector, deja el avatar de solo lectura
  uploadFn: (file: File) => Promise<void>;
}
// emite: 'uploaded' tras una subida exitosa (uploadFn resuelto sin excepción)
```

No se agrega ningún store nuevo ni tabla en el backend. `updateProfile`/`uploadOwnAvatar` viven en `src/stores/auth.ts` (no en `src/stores/users.ts`) porque las acciones de `users.ts` refrescan con `fetchUsers()` (`GET /users`), un endpoint de administración; un usuario sin `usuarios.ver` no podría llamarlo. `auth.ts` refresca con `fetchMe()` (`GET /me`), disponible para cualquier usuario autenticado.

---

## Implementation plan

1. Agregar `lastLoginAt: string | null` a `AuthUser` y a la interfaz interna `UserResource` en `src/stores/auth.ts`, mapeado en `mapUser`. Prueba manual: en Vue Devtools, tras un login real, `auth.user.lastLoginAt` refleja el valor que devuelve el backend.
2. Agregar a `src/stores/auth.ts` las acciones `updateProfile(payload)` y `uploadOwnAvatar(file)` (ver Data model), cada una llamando a `fetchMe()` al resolver con éxito. Prueba manual **contra el backend real, con un usuario sin `usuarios.editar`**: invocar `updateProfile({ name: 'Nuevo nombre' })` desde Vue Devtools y confirmar que responde 200 y `auth.user.name` se actualiza (valida que el backend permite auto-edición sin permisos de admin; ver Riesgos).
3. Extraer el bloque de avatar de `src/components/admin/UserFormDialog.vue` al nuevo componente `src/components/common/AvatarUploader.vue` (props/emit descritos en Data model), moviendo también la validación de tipo/tamaño. Prueba manual: `UserFormDialog.vue`, ahora usando `AvatarUploader` con `uploadFn` apuntando a `usersStore.uploadAvatar`, se comporta exactamente igual que antes del refactor (gateo por `usuarios.editar`, oculto en modo alta, spinner durante la subida).
4. Crear `src/pages/ProfilePage.vue`: `GlassCard` centrado con `AvatarUploader` (`uploadFn` → `authStore.uploadOwnAvatar`, sin `disabled`), campos nombre/email, password+confirmación opcionales, botón "Guardar" (`authStore.updateProfile`), y sección de solo lectura con chips de roles y fecha de último acceso. Prueba manual: navegar manualmente a `/#/perfil` muestra los datos reales del usuario logueado.
5. Registrar la ruta `perfil` (hija de `/`) en `src/router/routes.ts` con `meta: { requiresAuth: true }`, sin `requiresPermission`. Prueba manual: un usuario sin ningún permiso de admin puede entrar a `/#/perfil` sin ser redirigido.
6. Hacer clickeable el bloque `.profile-block` del drawer en `src/layouts/MainLayout.vue`, navegando a `/perfil` al hacer click. Prueba manual: click en el bloque de avatar/nombre del drawer navega a `/perfil`.
7. Agregar las claves `profile.*` en `src/i18n/es/index.ts` y `src/i18n/en-US/index.ts`; renombrar las claves de avatar existentes de `admin.userForm.avatar*` a `common.avatarUploader.*` y actualizar sus usos en `UserFormDialog.vue` y `AvatarUploader.vue`. Prueba manual: con el idioma en inglés (elegido antes de loguearse, ver SPEC 08), tanto `/#/perfil` como el diálogo de edición de usuario en `/#/admin/usuarios` muestran todo su texto traducido.
8. Prueba manual end-to-end final contra el backend real (ver Acceptance criteria): editar nombre/email/password propios desde `/perfil`, subir un avatar propio, confirmar reflejo inmediato en el drawer sin recargar, y repetir el flujo completo con un usuario sin `usuarios.ver`/`usuarios.editar` para confirmar que no aparece ningún `403`.

---

## Acceptance criteria

- [ ] Cualquier usuario autenticado, sin importar sus permisos, puede entrar a `/perfil` haciendo click en el bloque de avatar del drawer o navegando directamente a la URL.
- [ ] `/perfil` muestra el nombre, email, avatar, roles y fecha de último acceso reales del usuario logueado.
- [ ] Editar nombre y/o email y guardar actualiza esos datos en el backend y los refleja de inmediato en el drawer de `MainLayout` (sin recargar la página).
- [ ] Guardar con los campos de password en blanco no cambia el password.
- [ ] Completar password + confirmación (coincidentes) y guardar cambia el password; el usuario sigue logueado con la misma sesión tras el cambio.
- [ ] Elegir un avatar válido (jpeg/png/webp, ≤2MB) lo sube de inmediato y se refleja tanto en `/perfil` como en el drawer de `MainLayout` sin recargar.
- [ ] Elegir un archivo inválido (tipo no soportado o >2MB) muestra un error y no genera ninguna llamada de red.
- [ ] Un usuario sin `usuarios.ver` ni `usuarios.editar` puede completar todo el flujo anterior sin recibir ningún `403`.
- [ ] El payload enviado a `PUT /users/{id}` desde `/perfil` nunca incluye `roles` ni `is_active` (verificable en la pestaña Network).
- [ ] `UserFormDialog.vue` (edición de un usuario por un admin, SPEC 06) sigue funcionando exactamente igual que antes de este refactor.
- [ ] Cambiar el idioma en una pantalla de auth y luego entrar a `/perfil` muestra la página completamente traducida (español/inglés).
- [ ] Recargar la página después de editar el perfil o subir un avatar conserva los cambios (confirma que persistieron en el backend).

---

## Decisions

- **Sí:** reutilizar `PUT /users/{user}` y `POST /users/{user}/avatar` apuntando al propio `id`, en vez de esperar endpoints dedicados de perfil. El backend no los expone hoy (`api-docs.json` revisado el 2026-08-31); son los mismos endpoints que ya usa SPEC 03/06 para que un admin edite a un tercero.
- **Sí:** el payload de `updateProfile` omite explícitamente `roles` e `is_active`, aunque el endpoint los acepte. Decisión explícita del usuario — evita que cualquier persona pueda auto-otorgarse roles o cambiar su propio estado activo, sin depender de que el backend lo valide.
- **No:** pedir "password actual" en el frontend antes de cambiar el password. El backend no lo valida (no hay `current_password` documentado); pedirlo sería fricción cosmética sin beneficio de seguridad real. Decisión explícita del usuario.
- **Sí:** las acciones de autoservicio (`updateProfile`, `uploadOwnAvatar`) viven en `src/stores/auth.ts`, no en `src/stores/users.ts`. Las acciones de `users.ts` refrescan con `fetchUsers()` (`GET /users`, endpoint de administración); un usuario sin `usuarios.ver` no podría llamarlo. `auth.ts` refresca con `fetchMe()`, disponible para cualquier usuario autenticado.
- **Sí:** extraer el bloque de avatar de `UserFormDialog.vue` a un componente compartido `AvatarUploader.vue`, en vez de duplicarlo en `ProfilePage.vue`. Decisión explícita del usuario — evita mantener dos copias de la misma validación de tipo/tamaño.
- **Sí:** ruta `/perfil` sin `requiresPermission` — cualquier usuario autenticado accede a su propio perfil, independientemente de sus permisos de administración. Es la premisa central de la spec.
- **Sí:** acceso mediante click en el bloque `.profile-block` del drawer (que ya tenía estilos `:hover` sin uso), en vez de agregar un ítem de navegación dedicado. Decisión explícita del usuario — más directo, sin sumar ruido al menú.
- **Sí:** incluir roles (chips) y fecha de último acceso como información de solo lectura en `/perfil`. Decisión explícita del usuario.
- **Sí:** incluir esta pantalla en el esquema i18n (`profile.*`, y unificar `common.avatarUploader.*`) desde ya, consistente con SPEC 08, que dejó migrada toda la app existente a `vue-i18n`.
- **No:** eliminar el avatar ya subido. Mismo límite ya documentado en SPEC 06 — el backend no expone esa operación.
- **No:** verificación de email al cambiarlo. El backend no expone ningún flujo de verificación; el cambio es inmediato, aceptado como límite conocido.

---

## Risks

| Riesgo                                                                                                                                                                                                                      | Mitigación                                                                                                                                                                                                                            |
| --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| El swagger no documenta explícitamente que `PUT /users/{user}` y `POST /users/{user}/avatar` permitan que un usuario sin permisos de admin edite/suba su propio avatar (solo declara `bearerAuth`, sin scope).              | El paso 2 del plan de implementación valida esto contra el backend real con un usuario sin `usuarios.editar` antes de construir el resto de la UI; si el backend responde `403`, la spec necesita revisarse con el equipo de backend. |
| Un futuro refactor podría reutilizar por error `usersStore.updateUser`/`uploadAvatar` (que requieren `usuarios.ver` para su refresh) en vez del `updateProfile`/`uploadOwnAvatar` de `auth.ts` dentro de `ProfilePage.vue`. | Los tipos quedan separados: `UpdateProfilePayload` (en `auth.ts`) no declara los campos `roles`/`is_active` que sí tiene `UpdateUserPayload` (en `users.ts`), dificultando la confusión a nivel de tipos.                             |
| Cambiar el propio email en `/perfil` cambia de inmediato el identificador de login, sin ningún paso de verificación (el backend no lo expone).                                                                              | Aceptado como límite del backend (ver Scope). Si el usuario se equivoca al escribir el nuevo email, un admin puede corregirlo manualmente desde `UsersListPage` (SPEC 03).                                                            |

---

## What is **not** in this spec

- Verificación de email al cambiarlo.
- Confirmación de "password actual" antes de cambiar el password.
- Edición de los propios roles o del propio estado `is_active`.
- Eliminar/quitar un avatar ya subido.
- Activar/desactivar 2FA u otra configuración de seguridad.
- Eliminar la propia cuenta.
- Ítem de navegación dedicado "Mi perfil" en el drawer.
- Historial de cambios o auditoría de ediciones de perfil.

Cada uno de estos, si se necesita, va en su propio spec.
