# SPEC 06 — Subida de avatar de usuario

> **Status:** Aprobado
> **Depends on:** SPEC 01, SPEC 03, SPEC 04
> **Date:** 2026-08-30
> **Objective:** Permitir subir (o reemplazar) el avatar de un usuario desde `UserFormDialog.vue` y reflejarlo tanto en la tabla de usuarios como en el bloque de perfil de `MainLayout.vue`.

---

## Por qué existe esta spec

SPEC 03 dejó explícitamente fuera de alcance "subida/gestión de avatar de usuario (`POST /users/{user}/avatar`)". SPEC 04 ya preparó el terreno visual: `MainLayout.vue` muestra el avatar del usuario logueado (foto vía `avatarUrl` o iniciales con color determinista de `src/utils/avatar.ts`), y `AuthUser`/`UserResource` ya incluyen el campo `avatarUrl`. El backend (`GET /docs?api-docs.json`, revisado el 2026-08-30) expone `POST /users/{user}/avatar` (multipart, campo `avatar` requerido, responde `{ success, message, data: UserResource }`), usable por un admin sobre cualquier usuario o por el propio usuario sobre sí mismo. No existe endpoint para eliminar un avatar ya subido — solo "sube o reemplaza". Esta spec cierra el hueco: agrega la subida al formulario de usuario ya existente y la visualización correspondiente donde el proyecto ya muestra avatares.

---

## Scope

**In:**

- Acción `uploadAvatar(userId: number, file: File)` en `src/stores/users.ts`, contra `POST /users/{user}/avatar` (multipart/form-data, campo `avatar`), que tras una respuesta exitosa refresca `items` con `fetchUsers(meta.currentPage, meta.perPage)`.
- Campo `avatarUrl: string | null` agregado a la interfaz `AdminUser` de `src/stores/users.ts` y a su `mapUser` (el backend ya lo devuelve en `UserResource`, hoy ignorado por este store).
- En `UserFormDialog.vue`, **solo en modo edición** (usuario existente): un bloque de avatar arriba del formulario con el avatar actual (foto si `avatarUrl`, iniciales+color determinista si no, reutilizando `getAvatarInitials`/`getAvatarColor` de `src/utils/avatar.ts`) y un selector de archivo (`q-file` o botón + input oculto) para elegir una imagen nueva.
- Subida inmediata al seleccionar el archivo (sin botón de confirmación aparte): valida en el cliente que sea `image/jpeg`, `image/png` o `image/webp` y que pese como máximo 2MB antes de llamar al backend; si no cumple, muestra error y no llama a la API.
- En modo alta ("Nuevo usuario") el bloque de avatar no se muestra — el usuario aún no tiene `id`.
- El campo de avatar (selector de archivo) solo se muestra habilitado si el usuario logueado tiene `usuarios.editar`; sin ese permiso se oculta el selector y solo se ve el avatar actual de solo lectura.
- Tras una subida exitosa, si el `id` del usuario editado coincide con `authStore.user.id`, se llama a `authStore.fetchMe()` para que `MainLayout.vue` refleje el nuevo avatar sin esperar al próximo login.
- Notificación (Quasar `Notify`) de éxito tras subir, y de error (`getApiErrorMessage`) ante `403`/`422`/cualquier fallo de red, sin cerrar el diálogo.
- Columna "Avatar" en `UsersListPage.vue` (tabla `q-table`), primera columna antes de "Nombre": miniatura circular (`q-avatar` pequeño) con foto si `avatarUrl`, o iniciales+color si no.
- Estado de "subiendo" (spinner/disable) sobre el selector de archivo mientras la llamada a `uploadAvatar` está en curso, para evitar doble envío.

**Out of scope (for future specs):**

- Eliminar/quitar un avatar ya subido (el backend no expone ningún endpoint para esto).
- Recorte/edición de imagen (crop, zoom) antes de subir — se sube el archivo tal cual lo elige el usuario.
- Subida de avatar desde una pantalla de "mi perfil" fuera del panel admin — hoy no existe esa pantalla; la única vía es `UserFormDialog.vue` en modo edición.
- Subida de avatar durante el alta de un usuario nuevo (el campo no aparece hasta que el usuario existe y tiene `id`).
- Un permiso dedicado para avatar — se reutiliza `usuarios.editar`.
- Drag-and-drop del archivo — se usa el selector de archivo estándar de `q-file`.
- Internacionalización (i18n) de los textos de esta funcionalidad.

---

## Data model

```ts
// src/stores/users.ts (Pinia store "users") — extensión de AdminUser existente
interface AdminUser {
  id: number;
  name: string;
  email: string;
  isActive: boolean;
  isLocked: boolean;
  avatarUrl: string | null; // nuevo
  lastLoginAt: string | null;
  roles: string[];
  permissions: string[];
}
```

No se introduce ningún store ni tabla nueva. `uploadAvatar` es una acción más de `src/stores/users.ts`; su respuesta (`data: UserResource`) no se usa directamente para actualizar el estado local — se prefiere refrescar con `fetchUsers()` (mismo patrón que `createUser`/`updateUser`/`deleteUser`/`unlockUser` en SPEC 03), para mantener una única fuente de verdad tras cualquier mutación.

No se persiste nada de esto en `localStorage` más allá de lo que ya persiste `authStore` (SPEC 01) para el usuario logueado.

---

## Implementation plan

1. Agregar `avatarUrl: string | null` a la interfaz `AdminUser`, a `UserResource` (interna del store) y a `mapUser` en `src/stores/users.ts`. Prueba manual: en Vue Devtools, tras `fetchUsers()`, cada `AdminUser` en `items` trae su `avatarUrl` real del backend.
2. Agregar la acción `uploadAvatar(userId: number, file: File)` en `src/stores/users.ts`, que arma un `FormData` con el campo `avatar` y hace `POST /users/{userId}/avatar` con `Content-Type: multipart/form-data`; al resolver, llama a `fetchUsers(meta.currentPage, meta.perPage)`. Prueba manual: llamar a la acción desde Devtools con un `File` válido y confirmar que `items` refleja el `avatarUrl` nuevo tras la llamada.
3. En `UserFormDialog.vue`, agregar el bloque de avatar (avatar actual + selector de archivo) visible solo cuando `isEditMode` es verdadero, ubicado arriba del campo "Nombre". Sin lógica de subida todavía — solo la UI y el estado visual del avatar actual (foto o iniciales+color reutilizando `getAvatarInitials`/`getAvatarColor`). Prueba manual: abrir "editar usuario" y ver el avatar actual del usuario (foto o iniciales); abrir "nuevo usuario" y confirmar que el bloque no aparece.
4. Ocultar el selector de archivo (dejando solo el avatar de solo lectura) cuando `!auth.hasPermission('usuarios.editar')`, siguiendo el mismo patrón de permiso puntual de SPEC 03. Prueba manual: con un usuario sin `usuarios.editar`, el diálogo de edición muestra el avatar pero no el selector.
5. Implementar la validación client-side al elegir un archivo (tipo `image/jpeg`/`image/png`/`image/webp`, tamaño máximo 2MB): si falla, `Notify` de error y no se llama a la API. Prueba manual: elegir un archivo `.pdf` o una imagen de más de 2MB y confirmar que aparece la notificación de error sin llamada de red (verificable en la pestaña Network).
6. Conectar el selector de archivo a `uploadAvatar`: al elegir un archivo válido, subir de inmediato, mostrando un estado de carga sobre el selector mientras está en curso. Prueba manual end-to-end contra el backend real: elegir una imagen válida en "editar usuario", confirmar que el avatar se actualiza en el diálogo tras la respuesta.
7. Tras una subida exitosa, si `props.user.id === authStore.user?.id`, llamar a `authStore.fetchMe()`. Prueba manual: loguearse como un admin, editarse a sí mismo desde `UsersListPage`, subir un avatar nuevo y confirmar que el drawer de `MainLayout` lo muestra sin recargar la página ni volver a loguearse.
8. Manejar errores de `uploadAvatar` (`403`/`422`/red): `Notify` de error con `getApiErrorMessage`, sin cerrar el diálogo ni perder el resto de los datos del formulario. Prueba manual: forzar un error (ej. desconectar la red o usar un usuario sin permiso) y confirmar que aparece la notificación y el diálogo sigue abierto y usable.
9. Agregar la columna "Avatar" (primera columna) en `UsersListPage.vue`, con miniatura circular usando `avatarUrl` o iniciales+color. Prueba manual: la tabla de usuarios muestra la miniatura correcta para usuarios con y sin avatar subido.

---

## Acceptance criteria

- [ ] En modo "editar usuario", el diálogo muestra el avatar actual del usuario (foto si tiene `avatarUrl`, iniciales+color si no).
- [ ] En modo "nuevo usuario", el bloque de avatar no aparece.
- [ ] Con `usuarios.editar`, el selector de archivo está visible y habilitado en modo edición; sin ese permiso, el selector no aparece (solo el avatar de solo lectura).
- [ ] Elegir un archivo que no sea imagen (jpeg/png/webp) o que pese más de 2MB muestra un error y no genera ninguna llamada de red.
- [ ] Elegir una imagen válida dispara la subida de inmediato (sin botón adicional) y muestra un estado de carga mientras está en curso.
- [ ] Tras una subida exitosa, el avatar mostrado en el diálogo se actualiza con la imagen nueva y aparece una notificación de éxito.
- [ ] Si el usuario editado es el mismo que está logueado, el avatar del drawer en `MainLayout` se actualiza sin recargar la página.
- [ ] Si el usuario editado es distinto al logueado, el drawer de `MainLayout` no cambia (solo se actualiza el usuario objetivo).
- [ ] La tabla de `UsersListPage` muestra una columna de avatar con la miniatura correcta (foto o iniciales) para cada usuario.
- [ ] Una respuesta `403` o `422` al subir el avatar muestra una notificación de error legible; el diálogo permanece abierto y el resto de los datos del formulario no se pierde.
- [ ] Recargar la página después de subir un avatar exitosamente muestra el nuevo avatar (confirma que persistió en el backend).

---

## Decisions

- **Sí:** subida inmediata al elegir el archivo, sin botón de confirmación aparte. Decisión explícita del usuario al definir esta spec: es una llamada independiente del `PUT` general del formulario (como el patrón de toggles de permisos de SPEC 03), y evita dos flujos de guardado distintos en el mismo diálogo.
- **Sí:** ocultar el bloque de avatar en modo "nuevo usuario" en vez de mostrarlo deshabilitado o diferir la subida hasta después de crear el usuario. Decisión explícita del usuario: más simple, sin estados intermedios ni llamadas encadenadas.
- **Sí:** reutilizar el permiso `usuarios.editar` para gatear el selector de subida, en vez de un permiso dedicado. Consistente con el resto de acciones de edición del mismo formulario (SPEC 03); el backend solo exige `bearerAuth` + que sea admin o el propio usuario, pero el frontend ya usa `usuarios.editar` como el permiso que habilita editar a terceros desde este panel.
- **Sí:** refrescar `authStore` con `fetchMe()` cuando el usuario editado es el propio logueado, para que `MainLayout` se actualice sin esperar al próximo login. Decisión explícita del usuario, distinta de la limitación aceptada en SPEC 03 para roles/permisos (ahí sí se difiere al próximo login) porque aquí el usuario ve el resultado de su propia acción en el mismo diálogo que acaba de usar.
- **Sí:** validación client-side de tipo (`image/jpeg`/`image/png`/`image/webp`) y tamaño (máx. 2MB) antes de llamar al backend. El swagger no documenta restricciones, pero validar en el cliente da un error inmediato y legible en vez de depender de un `422` genérico del backend.
- **No:** endpoint/acción para eliminar un avatar ya subido. El backend no lo expone (`POST` "sube o reemplaza" es la única operación documentada); se deja para una spec futura si el backend agrega esa capacidad.
- **Sí:** agregar columna de avatar en `UsersListPage.vue`. Decisión explícita del usuario al definir esta spec, para que la tabla también refleje visualmente el nuevo dato disponible.
- **Sí:** tras `uploadAvatar`, refrescar con `fetchUsers()` en vez de aplicar directamente el `data: UserResource` de la respuesta del `POST`. Mismo criterio que SPEC 05 con `PATCH /config/business`: una única fuente de verdad, consistente con el resto de acciones de `src/stores/users.ts` (SPEC 03), que ya refrescan con `fetchUsers()` tras cada mutación.

---

## Risks

| Riesgo                                                                                                                                                           | Mitigación                                                                                                                                                                                                  |
| ---------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| El backend podría aplicar sus propias restricciones de tipo/tamaño de archivo (no documentadas en el swagger), distintas a las del cliente (2MB, jpeg/png/webp). | Manejar el `422` del backend con `Notify` de error legible (`getApiErrorMessage`) igual que cualquier otro error de validación; ajustar los límites del cliente si se detecta un caso real más restrictivo. |
| Un archivo de imagen grande sin comprimir podría tardar en subir en conexiones lentas, dejando el selector "cargando" un buen rato.                              | Aceptado como límite conocido de esta spec (ver Scope: no hay recorte/compresión de imagen); el spinner de carga ya comunica que la subida está en curso.                                                   |

---

## What is **not** in this spec

- Eliminar/quitar un avatar ya subido.
- Recorte o edición de imagen antes de subir.
- Subida de avatar desde una pantalla de "mi perfil" fuera del panel admin.
- Subida de avatar durante el alta de un usuario nuevo.
- Un permiso dedicado distinto de `usuarios.editar`.
- Drag-and-drop del archivo.
- Internacionalización de textos.

Cada uno de estos, si se necesita, va en su propio spec.
