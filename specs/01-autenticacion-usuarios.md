# SPEC 01 — Autenticación de usuarios (login, 2FA, recuperación de password)

> **Status:** Aprobado
> **Depends on:**
> SPEC 02
> **Date:** 2026-08-30
> **Objective:** Implementar el flujo de autenticación completo (login, verificación 2FA por email, recuperación y reseteo de password, logout y renovación de token) contra la API Laravel existente.

---

## Por qué existe esta spec

Este es el primer spec de funcionalidad del proyecto base CoreStarter: define cómo cualquier proyecto derivado gestionará la sesión de usuario, ya que la autenticación es transversal al resto de funcionalidades. El backend Laravel ya expone JWT con 2FA opcional según regla de negocio (`2fa_activo`), así que el frontend debe adaptarse a una respuesta de login condicional en vez de asumir un único camino feliz.

---

## Scope

**In:**

- Pantalla de login (email + password) contra `POST /login`.
- Manejo de la respuesta condicional de 2FA: si `two_factor_required: true`, se redirige a la pantalla de verificación de código sin guardar token.
- Pantalla de verificación 2FA (`POST /login/verify-2fa`) con reenvío de código (`POST /login/resend-2fa`, cooldown de 30s en la UI).
- Pantalla "Olvidé mi password" (`POST /forgot-password`) con mensaje genérico de confirmación.
- Pantalla de reset de password (`POST /reset-password`), accesible vía link de email con `token` y `email` como query params.
- Store de Pinia `auth` que guarda `user` (incluye `roles` y `permissions` del `UserResource`), `accessToken`, `tokenType` y `expiresAt`.
- Persistencia de la sesión en `localStorage`.
- Guard de Vue Router: las rutas protegidas redirigen a `/login?redirect=<ruta-original>` si no hay sesión válida; tras login exitoso, vuelve a esa ruta (o a `/` si no había ninguna).
- Interceptor HTTP: adjunta `Authorization: Bearer <token>` en cada request; ante un `401`, intenta `POST /refresh` una vez y reintenta la petición original; si el refresh también falla, hace logout automático.
- Logout (`POST /logout`) que invalida el JWT en backend y limpia store + `localStorage`.
- Restauración de sesión al recargar la página: si hay token en `localStorage`, se llama a `GET /me` para validarlo y repoblar el store; si falla, se limpia la sesión.
- Notificaciones (Quasar `Notify`) para todos los errores de auth: `401` credenciales inválidas, `403` usuario inactivo, `423` cuenta bloqueada, `422` código 2FA o token de reset inválido/expirado, `429` throttle de forgot-password.

**Out of scope (for future specs):**

- Scaffolding del proyecto Quasar/TS/Pinia/Router/Axios (spec previo separado, ver "Depends on").
- Registro de usuarios (el backend no expone endpoint de registro).
- Cambio de password estando autenticado / edición de perfil (el backend no expone endpoint para ello hoy).
- Guards de autorización por rol/permiso en rutas o componentes (este spec solo guarda `roles`/`permissions` en el store; consumirlos en guards queda para un spec de autorización futuro).
- Gestión de avatar de usuario.
- Refresco proactivo de token por temporizador (se decidió estrategia reactiva; ver Decisiones).
- Internacionalización (i18n) de los textos de las pantallas de auth.

---

## Data model

```ts
// src/stores/auth.ts (Pinia store "auth")
interface AuthUser {
  id: number;
  name: string;
  email: string;
  isActive: boolean;
  isLocked: boolean;
  avatarUrl: string | null;
  roles: string[];
  permissions: string[];
}

interface AuthState {
  user: AuthUser | null;
  accessToken: string | null;
  tokenType: string | null; // "bearer"
  expiresAt: number | null; // Date.now() + expires_in*1000, informativo (no dispara timers)
  twoFactorPendingEmail: string | null; // email en espera de código 2FA, null si no hay verificación pendiente
}
```

Persistencia: `accessToken`, `tokenType`, `expiresAt` y `user` se serializan a `localStorage` bajo la clave `auth:v1` en cada cambio relevante del store (login, verify 2FA, refresh, logout). El sufijo `:v1` permite migrar el formato más adelante sin colisionar con datos antiguos.

---

## Implementation plan

1. Crear `src/stores/auth.ts` con el estado `AuthState` inicial (todo `null`) y los getters `isAuthenticated` (`!!accessToken`) e `isTwoFactorPending` (`!!twoFactorPendingEmail`). Sin acciones todavía. El store compila y no rompe nada existente.
2. Añadir la acción `login(email, password)`: llama a `POST /login`; si la respuesta trae `access_token`, guarda `user`+token y persiste en `localStorage`; si trae `two_factor_required: true`, guarda `twoFactorPendingEmail = email` sin token. Prueba manual: invocar la acción desde Vue Devtools contra el backend real con un usuario sin 2FA.
3. Añadir las acciones `verifyTwoFactor(code)`, `resendTwoFactor()`, `logout()`, `refreshToken()` y `fetchMe()`, cada una llamando a su endpoint correspondiente (`/login/verify-2fa`, `/login/resend-2fa`, `/logout`, `/refresh`, `/me`). `logout()` limpia store y `localStorage` incluso si la llamada al backend falla.
4. Añadir al boot de Axios existente (creado por el spec de scaffolding) un interceptor de request que adjunta `Authorization: Bearer <accessToken>` cuando hay sesión, y un interceptor de response que ante un `401` llama a `refreshToken()` una vez y reintenta la request original; si el refresh falla, llama a `logout()` y deja que el guard de router redirija.
5. Registrar las rutas `/login`, `/2fa`, `/forgot-password`, `/reset-password` en `src/router/routes.ts`, todas con `meta: { requiresAuth: false }`, y marcar el resto de rutas existentes con `meta: { requiresAuth: true }` por defecto.
6. Añadir el guard `router.beforeEach` en `src/router/index.ts`: si la ruta destino requiere auth y `!isAuthenticated`, redirige a `/login?redirect=<ruta-destino>`; si el store no tiene sesión pero hay token en `localStorage`, llama primero a `fetchMe()` para intentar restaurarla antes de decidir.
7. Crear `src/pages/auth/LoginPage.vue`: formulario email+password con validación básica (campos requeridos, formato email) y botón submit que llama a `login()`; si `isTwoFactorPending` pasa a `true` tras el submit, navega a `/2fa`; si hay token, navega a la ruta de `redirect` (o `/`). Errores `401`/`403`/`423` se muestran con `Notify` usando el mensaje que da el backend.
8. Crear `src/pages/auth/TwoFactorPage.vue`: input de código, botón "Verificar" (llama `verifyTwoFactor`) y botón "Reenviar código" con cooldown de 30s (deshabilitado con cuenta regresiva tras cada envío). Si se llega a esta ruta sin `twoFactorPendingEmail` en el store, redirige a `/login`.
9. Crear `src/pages/auth/ForgotPasswordPage.vue`: input de email y botón submit que llama a `POST /forgot-password`, mostrando siempre el mismo mensaje genérico de éxito vía `Notify`, sin redirigir automáticamente.
10. Crear `src/pages/auth/ResetPasswordPage.vue`: lee `token` y `email` de los query params de la ruta; formulario de password + confirmación; al enviar llama a `POST /reset-password`; en éxito redirige a `/login` con notificación; en `422` muestra notificación de token inválido/expirado.
11. Añadir una acción de logout en el layout principal existente (o un componente mínimo si el layout aún no expone uno) que llama a `logout()` y redirige a `/login`.
12. Prueba manual end-to-end completa contra el backend real (ver Acceptance criteria) cubriendo los dos caminos de login (con y sin 2FA), recuperación de password, expiración/refresh de token y logout.

---

## Acceptance criteria

- [ ] Login con credenciales válidas de un usuario sin 2FA activo guarda el token, puebla el store con `user` (incluyendo `roles`/`permissions`) y redirige a la ruta `redirect` o a `/`.
- [ ] Login con credenciales válidas de un usuario con 2FA activo no guarda token, navega a `/2fa` y deja `twoFactorPendingEmail` seteado con el email usado.
- [ ] En `/2fa`, introducir el código correcto llama a `verify-2fa`, guarda el token y redirige igual que un login exitoso.
- [ ] En `/2fa`, introducir un código incorrecto o expirado muestra una notificación de error y no guarda token.
- [ ] El botón "Reenviar código" queda deshabilitado con cuenta regresiva durante 30s después de cada uso.
- [ ] Login con credenciales inválidas muestra notificación de error (401) y no guarda token.
- [ ] Login de un usuario inactivo muestra notificación específica (403) y no guarda token.
- [ ] Login de una cuenta bloqueada por intentos fallidos muestra notificación específica (423) y no guarda token.
- [ ] "Olvidé mi password" con cualquier email (registrado o no) muestra siempre el mismo mensaje genérico de confirmación.
- [ ] Reset de password con un token válido cambia el password y redirige a `/login` con notificación de éxito.
- [ ] Reset de password con un token inválido o expirado muestra notificación de error y no redirige.
- [ ] Navegar a una ruta protegida sin sesión redirige a `/login?redirect=<ruta-original>`; tras loguearse, vuelve exactamente a esa ruta.
- [ ] Recargar la página con un token válido en `localStorage` restaura la sesión (llamando a `/me`) sin pedir login de nuevo.
- [ ] Recargar la página con un token inválido/expirado en `localStorage` limpia la sesión y redirige a `/login`.
- [ ] Una respuesta `401` en cualquier llamada autenticada dispara un único intento de `/refresh`; si tiene éxito, la request original se reintenta de forma transparente; si falla, se ejecuta logout automático.
- [ ] Logout llama a `POST /logout`, limpia `user`/`accessToken` del store y de `localStorage`, y redirige a `/login`.

---

## Decisions

- **Sí:** persistencia del token en `localStorage`. El backend entrega el JWT en el body de la respuesta (no hay cookie httpOnly), así que `localStorage` es el patrón más simple para una SPA que además debe sobrevivir a cerrar el navegador.
- **No:** `sessionStorage` u opción "recordarme" con almacenamiento dual. Añade complejidad sin un requisito claro que lo justifique en este proyecto base.
- **Sí:** estrategia de refresh reactiva (al recibir `401`, un solo intento de `/refresh` + reintento). Más simple que un temporizador proactivo y no depende de que el reloj del cliente esté sincronizado con el del servidor.
- **No:** refresh proactivo por temporizador basado en `expires_in`. Se puede añadir después si se detectan cortes de sesión molestos en uso real; no hay evidencia de que se necesite ahora.
- **Sí:** guardar `roles` y `permissions` del `UserResource` en el store de auth aunque este spec no los consuma todavía. Evita tener que re-tocar el store en el futuro spec de autorización.
- **Sí:** el scaffolding del proyecto (Quasar CLI, TypeScript, Pinia, Router, Axios) se resuelve en un spec previo separado, no en este. Mantiene esta spec enfocada solo en el dominio de autenticación.
- **No:** registro de usuarios y cambio de password autenticado en este spec. El backend no expone endpoints para ninguno de los dos hoy (`GET /api/documentation`, tag `Auth`, revisado el 2026-08-30).
- **Sí:** errores de auth mostrados con `Notify` de Quasar (toast global) en vez de mensajes inline por campo. Consistente con el resto de la app base y evita duplicar lógica de mensajes por formulario.
- **Sí:** cooldown de 30s en el botón de reenvío de código 2FA. Evita spam de clics mientras el email aún no llega; el backend puede tener su propio throttle pero la UI no debe depender solo de eso.

---

## Risks

| Riesgo                                                                                                                           | Mitigación                                                                                                                                                                                                                                            |
| -------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `localStorage` deshabilitado o vacío (modo privado agresivo, límite de storage)                                                  | El store sigue funcionando en memoria durante la sesión de la pestaña; solo se pierde la persistencia entre recargas. No se añade fallback adicional en este spec.                                                                                    |
| El link de reset-password del email del backend no apunta exactamente a `/reset-password?token=&email=` del frontend             | Es una configuración del lado del backend (URL del frontend registrada en Laravel) fuera del alcance de este spec; debe verificarse manualmente en el entorno real antes de dar por cerrado el flujo.                                                 |
| Refresh y request original en carrera si el usuario dispara varias peticiones autenticadas a la vez justo cuando expira el token | Este spec no implementa cola/deduplicación de refresh; cada request en 401 dispara su propio intento de refresh. Aceptable para el proyecto base; revisar si aparecen problemas de rendimiento en un proyecto derivado con mucho tráfico concurrente. |

---

## What is **not** in this spec

- Scaffolding del proyecto Quasar/TypeScript/Pinia/Router/Axios (spec previo separado).
- Registro de usuarios.
- Cambio de password estando autenticado / edición de perfil.
- Guards de autorización por rol/permiso.
- Gestión de avatar.
- Refresh proactivo por temporizador.
- Internacionalización de textos.

Cada uno de estos, si se necesita, va en su propio spec.
