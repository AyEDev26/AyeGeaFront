# SPEC 15 — Alias en la edición del perfil de usuario ("Mi perfil")

> **Status:** Implementado
> **Depends on:** SPEC 09, SPEC 14
> **Date:** 2026-09-04
> **Objective:** Añadir el campo `alias` (editable, opcional, máx. 20 caracteres) al formulario de `/perfil`, reutilizando exactamente el mismo patrón de validación y el comportamiento "en blanco = no tocar" ya implementado para `alias` en `UserFormDialog.vue` (SPEC 14).

---

## Por qué existe esta spec

SPEC 09 creó la página `/perfil` (autoservicio de nombre, email, password y avatar) antes de que existiera el campo `alias` en el backend/frontend. SPEC 14 agregó `alias` a `AdminUser`/`UserResource` en `src/stores/users.ts` y al formulario de alta/edición de usuarios (`UserFormDialog.vue`), pero solo para el flujo donde un **admin** edita a otro usuario — `src/stores/auth.ts` (usado por `/perfil` para el propio usuario logueado) no se tocó y sigue sin el campo `alias`. Esta spec cierra ese hueco: cualquier usuario autenticado podrá editar su propio alias desde `/perfil`, sin depender de un admin.

---

## Scope

**In:**

- Campo `alias: string | null` añadido a `AuthUser` y a la interfaz interna `UserResource` de `src/stores/auth.ts`, mapeado 1:1 desde el backend en `mapUser` (mismo patrón ya usado en `src/stores/users.ts` por SPEC 14).
- `alias` añadido como campo opcional a `UpdateProfilePayload` en `src/stores/auth.ts`. `updateProfile()` no cambia su lógica interna — ya reenvía el payload recibido tal cual a `PUT /users/{user.value.id}`.
- `ProfilePage.vue`: nuevo `q-input` de `alias`, ubicado entre el campo "Nombre" y el campo "Password" (mismo orden que `UserFormDialog.vue`), opcional, con `maxlength="20"` y una regla de validación que rechaza más de 20 caracteres — la misma regla ya usada en `UserFormDialog.vue` (SPEC 14).
- `resetForm()` en `ProfilePage.vue` inicializa el campo alias desde `auth.user?.alias ?? ''`.
- El payload que arma `onSubmit()` en `ProfilePage.vue` incluye `alias` solo si el campo no está vacío tras `trim()` — si se deja en blanco (ya sea porque nunca se tocó o porque el usuario lo borró explícitamente), no se manda y el backend no toca el alias actual. Mismo criterio que el campo password en esta misma página y que el campo alias en `UserFormDialog.vue`.
- Claves i18n nuevas `profile.aliasLabel` y `profile.aliasTooLong` en `src/i18n/es/index.ts` y `src/i18n/en-US/index.ts`.

**Out of scope (for future specs):**

- Mostrar el alias como dato de solo lectura en el drawer de `MainLayout.vue` o en cualquier otra pantalla — esta spec solo agrega el campo editable en `/perfil`.
- Validar unicidad del alias en el cliente — igual que SPEC 14, no está documentada como restricción en el swagger; cualquier error de este tipo se muestra vía el manejo de errores 422 ya existente (`getApiErrorMessage`).
- Cualquier cambio a `UsersListPage.vue`, `UserFormDialog.vue` o al store `src/stores/users.ts` — ya cubiertos por SPEC 14, esta spec no los toca.
- Persistir el alias en `localStorage` o en cualquier estado fuera de `auth.user` — sigue viviendo únicamente en el store `auth`, igual que el resto de los datos de perfil.
- Hacer el campo `email` de `/perfil` editable — sigue siendo texto de solo lectura como hoy (comportamiento preexistente, no forma parte de esta spec).

---

## Data model

```ts
// src/stores/auth.ts (Pinia store "auth")
export interface AuthUser {
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

// Forma cruda del UserResource del backend (ver GET /api/documentation, schema UserResource).
interface UserResource {
  id: number;
  name: string;
  email: string;
  alias: string | null; // nuevo
  is_active: boolean;
  is_locked: boolean;
  avatarUrl: string | null;
  last_login_at: string | null;
  roles: string[];
  permissions: string[];
}

// Deliberadamente sin roles/is_active: un usuario nunca puede auto-otorgárselos vía /perfil.
export interface UpdateProfilePayload {
  name?: string;
  email?: string;
  alias?: string; // nuevo — opcional; si se omite, no se toca el alias actual
  password?: string;
  password_confirmation?: string;
}
```

No se agrega ningún store nuevo. `mapUser` gana una línea (`alias: resource.alias`); `updateProfile()` no cambia — ya reenvía cualquier campo presente en el payload recibido.

---

## Implementation plan

1. Añadir `alias: string | null` a `AuthUser` y a la interfaz interna `UserResource` en `src/stores/auth.ts`, y mapearlo en `mapUser`. Prueba manual: en Vue Devtools, tras un login real o un `fetchMe()`, confirmar que `auth.user.alias` trae el valor real del backend.
2. Añadir `alias?: string` a `UpdateProfilePayload` en `src/stores/auth.ts`. Prueba manual: llamar `auth.updateProfile({ alias: 'prueba' })` desde Devtools y confirmar en la pestaña de red que el body incluye `alias: "prueba"` y que la respuesta es 200.
3. En `ProfilePage.vue`, añadir el `q-input` de alias entre "Nombre" y "Password" (opcional, `maxlength="20"`, regla que rechaza más de 20 caracteres — mismo patrón que `UserFormDialog.vue`), inicializarlo en `resetForm()` desde `auth.user?.alias ?? ''`, e incluirlo en el payload de `onSubmit()` solo si no está vacío tras `trim()`. Prueba manual: el campo aparece precargado con el alias real del usuario logueado al entrar a `/perfil`.
4. Añadir las claves i18n `profile.aliasLabel` y `profile.aliasTooLong` en `src/i18n/es/index.ts` y `src/i18n/en-US/index.ts`.
5. Prueba manual end-to-end contra el backend real (ver Acceptance criteria): editar el alias propio y guardar, dejarlo en blanco y guardar (no se borra), escribir más de 20 caracteres (bloqueado en cliente), confirmar en Network que el payload nunca incluye `roles`/`is_active`, y repetir el flujo con un usuario sin ningún permiso de administración para confirmar que no aparece ningún `403`.

---

## Acceptance criteria

- [x] El formulario de `/perfil` muestra un campo alias precargado con el valor real del usuario logueado (vacío si es `null`).
- [x] El campo alias aparece entre "Nombre" y "Password".
- [x] Editar el alias propio y guardar lo actualiza en el backend; al recargar `/perfil` se ve el nuevo valor.
- [x] Guardar con el campo alias en blanco no borra ni cambia el alias actual.
- [x] Escribir más de 20 caracteres en el campo alias muestra el error de validación de cliente sin llegar a llamar al backend.
- [x] El payload enviado a `PUT /users/{id}` desde `/perfil` sigue sin incluir `roles` ni `is_active` (verificable en la pestaña Network), y sí incluye `alias` cuando corresponde.
- [x] Un usuario sin `usuarios.ver` ni `usuarios.editar` puede editar su propio alias desde `/perfil` sin recibir ningún `403`.
- [x] Cambiar el idioma (español/inglés) muestra el campo alias y su mensaje de validación traducidos.
- [x] `UserFormDialog.vue` (edición de alias por un admin, SPEC 14) sigue funcionando exactamente igual que antes de esta spec.

---

## Decisions

- **Sí:** alias editable en `/perfil` sin gateo por permiso — es dato propio del usuario, igual que nombre/password/avatar en esta misma pantalla (premisa central de SPEC 09). Decisión explícita del usuario.
- **Sí:** alias en blanco al guardar = no tocar el valor actual. Mismo patrón que el campo password en esta página y que el campo alias en `UserFormDialog.vue` (SPEC 14). Decisión explícita del usuario.
- **Sí:** reutilizar exactamente la misma validación de SPEC 14 (opcional, máx. 20 caracteres, bloqueado en cliente). Decisión explícita del usuario — evita reglas divergentes entre las dos pantallas donde se edita alias.
- **Sí:** campo posicionado entre "Nombre" y "Password", mismo orden que `UserFormDialog.vue`. Decisión explícita del usuario — consistencia visual entre ambas pantallas.
- **No:** validar unicidad del alias en el cliente. Mismo criterio que SPEC 14 — no está documentada como restricción; cualquier error se muestra vía el manejo de errores 422 ya existente.
- **No:** mostrar el alias en el drawer de `MainLayout.vue` u otra pantalla de solo lectura — fuera de alcance, ver Scope.

---

## Risks

| Risk                                                                                                                                                                                                                                                                                | Mitigation                                                                                                                                                                                      |
| ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| El backend podría rechazar `alias` en el payload de `PUT /users/{id}` cuando lo llama un usuario sin permisos de administración sobre sí mismo (no verificado explícitamente para este campo, aunque SPEC 09 ya validó que `name`/`email`/`password` funcionan sin permisos admin). | El paso 2 del plan de implementación valida esto contra el backend real antes de construir el resto del formulario; si el backend responde `403` o ignora el campo, la spec necesita revisarse. |
| Si el backend llegara a validar unicidad de `alias` en el futuro, un usuario podría chocar con el alias de otro al editar el propio desde `/perfil`.                                                                                                                                | Aceptado como límite conocido (ver Decisions) — se maneja vía el mensaje de error 422 ya existente, igual que en `UserFormDialog.vue`.                                                          |

---

## What is **not** in this spec

- Mostrar el alias como dato de solo lectura en el drawer o en cualquier otra pantalla.
- Validación de unicidad del alias en el cliente.
- Cambios en `UsersListPage.vue`, `UserFormDialog.vue` o en `src/stores/users.ts` (ya cubiertos por SPEC 14).
- Hacer editable el campo `email` de `/perfil`.

Cada uno de estos, si se necesita, va en su propia spec.
