# SPEC 08 — Internacionalización multi-idioma (español/inglés)

> **Status:** Aprobado
> **Depends on:** SPEC 01, SPEC 03, SPEC 04, SPEC 05, SPEC 06, SPEC 07
> **Date:** 2026-08-31
> **Objective:** Agregar soporte multi-idioma (español e inglés) a toda la aplicación mediante `vue-i18n`, con un selector de idioma disponible únicamente en las pantallas de autenticación y con persistencia en `localStorage` para toda la sesión.

---

## Por qué existe esta spec

Toda la app tiene hoy sus textos hardcodeados en español, sin ninguna dependencia de i18n instalada (`package.json` no incluye `vue-i18n`). CLAUDE.md define este repo como un proyecto base reutilizable para futuros proyectos, por lo que soportar múltiples idiomas desde ahora evita reescribir esta capa más adelante. Esta spec introduce `vue-i18n` en modo Composition API (consistente con el resto del stack, que usa `<script setup>`), define la arquitectura de mensajes y migra **todos** los textos propios de la app (auth + panel admin) más los textos internos de los componentes de Quasar (paginación de `q-table`, selector de fecha, etc., vía los lang packs oficiales de Quasar).

El selector de idioma solo vive en las 4 pantallas de autenticación (`LoginPage`, `ForgotPasswordPage`, `ResetPasswordPage`, `TwoFactorPage`) — decisión explícita del usuario. Una vez logueado, el idioma elegido antes de entrar queda fijo durante toda la sesión autenticada; no hay forma de cambiarlo desde dentro del panel admin sin volver a pasar por una pantalla de auth (ej. cerrando sesión).

---

## Scope

**In:**

- Instalar `vue-i18n` (última versión estable compatible con Vue 3) y registrarlo vía un boot file de Quasar (`src/boot/i18n.ts`), en modo Composition API (`legacy: false`).
- Dos locales: `es` (español, idioma actual de la app) y `en-US` (inglés). Códigos elegidos para coincidir 1:1 con los lang packs propios de Quasar (`quasar/lang/es`, `quasar/lang/en-US`), evitando cualquier mapeo de códigos entre `vue-i18n` y Quasar.
- Estructura de mensajes en `src/i18n/es/index.ts` y `src/i18n/en-US/index.ts`, agregados desde `src/i18n/index.ts`, con claves namespaced por pantalla/módulo (`auth.login.*`, `auth.forgotPassword.*`, `auth.resetPassword.*`, `auth.twoFactor.*`, `layout.*`, `admin.users.*`, `admin.userForm.*`, `admin.roles.*`, `admin.businessConfig.*`, `errors.notFound.*`, `common.*` para textos compartidos como botones "Guardar"/"Cancelar").
- Store Pinia `src/stores/locale.ts` (mismo patrón que `auth.ts`, `config.ts`, etc.) que expone el locale activo y una acción `setLocale(locale)` que: actualiza `i18n.global.locale.value`, aplica el lang pack de Quasar correspondiente (`Quasar.lang.set(...)`) y persiste la elección en `localStorage` bajo la clave `ayecore:locale`.
- Idioma inicial (cuando no hay nada en `localStorage`): se detecta `navigator.language` — si empieza con `en`, arranca en `en-US`; en cualquier otro caso, arranca en `es`.
- Envío del idioma activo como parte del payload de `POST /login` (`{ email, password, locale }`), agregado en la acción `login(email, password)` de `src/stores/auth.ts`, leyendo el valor actual del store `locale.ts`. El backend hoy no contempla ese campo en su swagger, pero se envía igual para dejar la puerta abierta a que lo adopte más adelante (ej. para asociar el idioma al usuario/sesión que se está creando, o para el idioma de un eventual email de bienvenida).
- Componente `src/components/common/LanguageSwitcher.vue`, insertado explícitamente en `LoginPage.vue`, `ForgotPasswordPage.vue`, `ResetPasswordPage.vue` y `TwoFactorPage.vue` (no dentro de `AdminPageWrapper.vue`, ya que ese wrapper también lo usan pantallas del panel admin donde el selector no debe aparecer).
- Migración de **todos** los textos hardcodeados en español a claves i18n (`t('...')`), en:
  - Las 4 pantallas de auth (`LoginPage.vue`, `ForgotPasswordPage.vue`, `ResetPasswordPage.vue`, `TwoFactorPage.vue`), incluyendo mensajes de validación de campos (`q-input :rules`) y notificaciones `Notify`.
  - `MainLayout.vue` (header, drawer, secciones de navegación, bloque de perfil).
  - `IndexPage.vue` y `ErrorNotFound.vue`.
  - `UsersListPage.vue` y `UserFormDialog.vue` (tabla, diálogo, validaciones, notificaciones `Notify`).
  - `RolesPermissionsPage.vue`.
  - `BusinessConfigPage.vue`.
- Registro de los lang packs propios de Quasar (`quasar/lang/es`, `quasar/lang/en-US`) para que los textos internos de sus componentes (paginación de `q-table`, `q-date`, etc.) también cambien de idioma junto con el resto de la app.

**Out of scope (for future specs):**

- Traducir los mensajes de error que devuelve el backend (`getApiErrorMessage`, validaciones 422, mensajes de excepción). Quedan tal cual los envía la API, en el idioma que tenga configurado el backend hoy — está fuera del alcance de un proyecto frontend-only.
- Selector de idioma dentro del panel admin / `MainLayout.vue`. Decisión explícita del usuario: solo existe en las 4 pantallas de auth.
- Persistir la preferencia de idioma en el backend (por usuario) como un campo de perfil (ej. `UserResource.locale`). No hay endpoint documentado para esto; la persistencia sigue siendo 100% client-side vía `localStorage`, igual que el patrón de `auth.ts`. Enviar `locale` en el payload de `POST /login` (sí incluido en el scope) es informativo en cada intento de login, no una preferencia guardada en el backend — son dos cosas distintas.
- Que el backend efectivamente use el campo `locale` del payload de login para algo (asociarlo al usuario, traducir un email, etc.). Esta spec solo garantiza que el campo se envía; su consumo del lado backend queda fuera de un proyecto frontend-only.
- Enviar el idioma en `/forgot-password` o `/login/resend-2fa`. Al enviarse solo en el payload de `POST /login` (no como header en todas las requests), esos dos flujos —que no pasan por `POST /login`— no llevan el idioma activo; ver Riesgos.
- Formateo de fechas/números locale-aware (`Intl.DateTimeFormat`, etc.). Hoy la app no aplica ningún formateo de fechas propio; queda fuera de esta spec.
- Idiomas adicionales a español e inglés. La arquitectura de `src/i18n/<locale>/index.ts` queda preparada para agregar más locales en el futuro, pero esta spec solo entrega `es` y `en-US`.
- Prefijos de idioma en la URL (ej. `/en/login`). El router sigue en modo hash tal como está hoy; el idioma se maneja enteramente vía estado de la app, no vía rutas.
- Cambiar el idioma de los mensajes de error de red genéricos que no vienen del backend (timeouts, `ECONNABORTED`, etc.) — si existen hoy hardcodeados, se migran igual que cualquier otro string cliente (sí están en el `Scope`), pero no se introduce lógica nueva de manejo de errores.

---

## Data model

```ts
// src/i18n/es/index.ts
export default {
  common: {
    save: 'Guardar',
    cancel: 'Cancelar',
    // ...
  },
  auth: {
    login: {
      title: 'Iniciar sesión',
      emailLabel: 'Correo electrónico',
      // ...
    },
    forgotPassword: {/* ... */},
    resetPassword: {/* ... */},
    twoFactor: {/* ... */},
  },
  layout: {/* nav, drawer, profile */},
  admin: {
    users: {/* UsersListPage + UserFormDialog */},
    roles: {/* RolesPermissionsPage */},
    businessConfig: {/* BusinessConfigPage */},
  },
  errors: {
    notFound: {/* ErrorNotFound */},
  },
};

// src/i18n/en-US/index.ts — mismas claves, valores en inglés

// src/i18n/index.ts
export default {
  es: esMessages,
  'en-US': enUSMessages,
};
```

```ts
// src/stores/locale.ts (Pinia store "locale")
interface LocaleState {
  current: 'es' | 'en-US';
}
// acción: setLocale(locale: 'es' | 'en-US'): void
// - actualiza i18n.global.locale.value
// - Quasar.lang.set(quasarLangPackFor(locale))
// - localStorage.setItem('ayecore:locale', locale)
```

```ts
// src/stores/auth.ts — payload de POST /login extendido con el idioma activo
async function login(email: string, password: string) {
  const localeStore = useLocaleStore();
  const response = await api.post<{ data: LoginResponseData }>('/login', {
    email,
    password,
    locale: localeStore.current, // 'es' | 'en-US' — campo informativo, no documentado hoy en el swagger del backend
  });
  // ... resto de la función sin cambios
}
```

No se agrega ninguna tabla ni estructura persistida en el backend — todo el estado de idioma vive en el store Pinia + `localStorage`, siguiendo el mismo patrón que `auth.ts` (SPEC 01). El campo `locale` del payload de login es informativo; no hay contrato de respuesta nuevo que dependa de él.

---

## Implementation plan

1. Instalar `vue-i18n` como dependencia en `package.json`. Prueba manual: `npm install` corre sin errores y la app sigue arrancando igual que antes (sin usar aún la librería).
2. Crear `src/i18n/es/index.ts` y `src/i18n/en-US/index.ts` con un primer bloque mínimo de mensajes (`common.save`, `common.cancel`) y agregarlos en `src/i18n/index.ts`. Prueba manual: ambos archivos exportan un objeto con las mismas claves.
3. Crear `src/boot/i18n.ts`: instancia `vue-i18n` en modo Composition API (`legacy: false`), locale inicial resuelto por prioridad `localStorage['ayecore:locale']` → `navigator.language` (`en*` → `en-US`, cualquier otro caso → `es`) → `es` como fallback final; registrar el boot file en `quasar.config.ts` (`boot: ['axios', 'i18n']`). Prueba manual: la app arranca sin errores y `useI18n().locale.value` refleja el idioma esperado simulando distintos `navigator.language` en devtools.
4. Crear `src/stores/locale.ts` con el estado `current` y la acción `setLocale(locale)` (actualiza `i18n.global.locale.value`, aplica el lang pack de Quasar correspondiente, persiste en `localStorage`). Prueba manual: llamar `setLocale('en-US')` desde Vue Devtools cambia el idioma del texto ya migrado (`common.save`) y persiste tras recargar la página.
5. En la acción `login(email, password)` de `src/stores/auth.ts`, agregar el campo `locale` al payload de `POST /login`, leyendo el valor actual de `useLocaleStore().current`. Prueba manual: con las devtools del navegador abiertas en la pestaña Network, intentar un login (éxito o error) y confirmar que el body del request a `/login` incluye `locale` con el valor esperado (`es` o `en-US`) según el idioma activo.
6. Crear `src/components/common/LanguageSwitcher.vue` (ej. `q-btn-toggle` con opciones ES/EN) que llama a `localeStore.setLocale`, e insertarlo en `LoginPage.vue`, `ForgotPasswordPage.vue`, `ResetPasswordPage.vue` y `TwoFactorPage.vue`. Prueba manual: el selector aparece en las 4 pantallas de auth y cambiar de opción actualiza visualmente el idioma activo.
7. Migrar `LoginPage.vue` por completo a claves `auth.login.*` (textos, validaciones de `q-input`, notificaciones `Notify`), agregando las claves faltantes en ambos archivos de mensajes. Prueba manual: cambiar el idioma con el selector traduce toda la pantalla de login sin recargar la página.
8. Repetir la migración para `ForgotPasswordPage.vue`, `ResetPasswordPage.vue` y `TwoFactorPage.vue` (claves `auth.forgotPassword.*`, `auth.resetPassword.*`, `auth.twoFactor.*`). Prueba manual: cada pantalla se traduce por completo al cambiar el idioma con su propio selector.
9. Migrar `MainLayout.vue` (header, drawer, secciones "Menu"/"Administración"/"Inicio", bloque de perfil) a claves `layout.*`. Prueba manual: al loguearse habiendo elegido inglés en el login, el header y el drawer del panel admin se muestran en inglés.
10. Migrar `IndexPage.vue` y `ErrorNotFound.vue` a claves `common.*`/`errors.notFound.*`. Prueba manual: ambas pantallas reflejan el idioma elegido antes de loguearse.
11. Migrar `UsersListPage.vue` y `UserFormDialog.vue` (columnas de tabla, diálogo, validaciones de campos, notificaciones `Notify` de éxito/error) a claves `admin.users.*`/`admin.userForm.*`. Prueba manual: tabla, diálogo, validaciones y notificaciones aparecen en el idioma activo.
12. Migrar `RolesPermissionsPage.vue` a claves `admin.roles.*`. Prueba manual: la pantalla de roles y permisos se traduce por completo.
13. Migrar `BusinessConfigPage.vue` a claves `admin.businessConfig.*`. Prueba manual: la pantalla de configuración de negocio se traduce por completo.
14. Registrar los lang packs propios de Quasar (`quasar/lang/es`, `quasar/lang/en-US`) dentro de `setLocale`. Prueba manual: en `UsersListPage`, el texto de paginación de `q-table` ("Registros por página" / "Rows per page") cambia según el idioma activo.
15. Auditoría final: recorrer las 11 pantallas/componentes migrados y confirmar que no queda ningún string hardcodeado en español fuera de los mensajes que vienen directamente del backend (fuera de alcance). Prueba manual: revisión manual (o `grep` de texto en español) sobre los archivos migrados, sin coincidencias fuera de lo esperado.

---

## Acceptance criteria

- [ ] `vue-i18n` está instalado y registrado vía `src/boot/i18n.ts`, en modo Composition API.
- [ ] Sin idioma guardado en `localStorage`, la app arranca en `en-US` si `navigator.language` empieza con `en`, y en `es` en cualquier otro caso.
- [ ] El selector de idioma aparece en `LoginPage`, `ForgotPasswordPage`, `ResetPasswordPage` y `TwoFactorPage`, y cambiarlo traduce el contenido de la pantalla activa de inmediato, sin recargar.
- [ ] El selector de idioma **no** aparece en ninguna pantalla del panel admin (`IndexPage`, `UsersListPage`, `BusinessConfigPage`, `RolesPermissionsPage`) ni en `MainLayout`.
- [ ] Elegir un idioma en una pantalla de auth y luego loguearse muestra el panel admin completo (`MainLayout`, `UsersListPage`, `UserFormDialog`, `RolesPermissionsPage`, `BusinessConfigPage`, `IndexPage`) en ese mismo idioma.
- [ ] Recargar la página (autenticado o no) conserva el idioma elegido previamente (persistido en `localStorage`).
- [ ] Ninguna pantalla o componente migrado muestra texto en español cuando el idioma activo es `en-US`, salvo los mensajes que provienen directamente del backend (errores de API).
- [ ] Los textos internos de Quasar (paginación de `q-table`, selector de fecha, etc.) cambian de idioma junto con el resto de la app.
- [ ] El body de cada request a `POST /login` incluye el campo `locale` con el idioma activo (`es` o `en-US`), verificable en la pestaña Network del navegador.
- [ ] Las validaciones de formularios (`q-input :rules`) y las notificaciones `Notify` generadas en el cliente están traducidas en ambos idiomas.
- [ ] `ErrorNotFound.vue` (ruta inexistente) se muestra traducida según el idioma activo.

---

## Decisions

- **Sí:** `vue-i18n` en modo Composition API (`legacy: false`). Decisión explícita del usuario — es el estándar de facto para Vue 3 + Quasar y encaja con el resto del stack (`<script setup>`), además de traer soporte de pluralización/interpolación sin reinventar nada.
- **No:** solución manual propia (store + diccionario plano). Descartada por el usuario a favor de `vue-i18n`.
- **Sí:** persistencia en `localStorage` (clave `ayecore:locale`), mismo patrón que `auth.ts` (SPEC 01). Decisión explícita del usuario — no hay endpoint de backend para preferencia de idioma por usuario.
- **No:** persistir el idioma en el backend por usuario. No existe ese endpoint documentado; queda fuera de alcance.
- **Sí:** detectar `navigator.language` como idioma inicial cuando no hay nada guardado (fallback a `es`). Decisión explícita del usuario — mejor UX inicial para usuarios angloparlantes sin sacrificar el comportamiento actual por defecto.
- **Sí:** el selector de idioma vive únicamente en las 4 pantallas de autenticación, no en `MainLayout` ni en ninguna pantalla del panel admin. Decisión explícita del usuario (confirmada tras una pregunta de aclaración específica) — una vez logueado, el idioma elegido antes de entrar queda fijo durante toda la sesión.
- **Sí:** alcance de traducción cubre toda la app (auth + panel admin) más los lang packs propios de Quasar. Decisión explícita del usuario — aunque el selector solo está en las pantallas de auth, el idioma elegido ahí debe reflejarse en todo el panel admin una vez logueado, así que ningún texto puede quedar hardcodeado en un solo idioma.
- **No:** traducir los mensajes de error que devuelve el backend (`getApiErrorMessage`, validaciones 422). Decisión explícita del usuario — quedan tal cual los envía la API; está fuera del alcance de un proyecto frontend-only.
- **Sí:** enviar el idioma activo como campo `locale` en el payload de `POST /login` (`src/stores/auth.ts`), aunque el backend no lo contemple hoy en su swagger. Decisión explícita del usuario — lo asocia directamente a la información del usuario que inicia la sesión, en vez de a un mecanismo de transporte genérico (header) separado de ese evento.
- **No:** header `Accept-Language` en cada request (`src/boot/axios.ts`). Se evaluó y se descartó a favor del payload de login — decisión explícita del usuario. Limitación aceptada: no cubre `/forgot-password` ni `/login/resend-2fa`, que no pasan por `POST /login` (ver Riesgos).
- **Sí:** códigos de locale `es` / `en-US`, coincidiendo con los lang packs propios de Quasar (`quasar/lang/es`, `quasar/lang/en-US`). Decisión explícita del usuario — evita mapear códigos entre `vue-i18n` y Quasar.
- **No:** `es-ES` como código de locale. Quasar no trae un lang pack propio con ese código exacto (el suyo es `es` a secas); se descartó para no requerir un mapeo adicional.
- **No:** prefijos de idioma en la URL (`/en/login`). El router se mantiene en modo hash tal como está hoy (ver CLAUDE.md); el idioma se maneja vía estado de la app, no vía rutas.
- **No:** formateo de fechas/números locale-aware. La app hoy no aplica ningún formateo de fechas propio (verificado: no hay usos de `toLocaleDateString`/`Intl` en el código actual); queda fuera de esta spec.

---

## Risks

| Riesgo                                                                                                                                                                                                                                                                                                            | Mitigación                                                                                                                                                                                                                                                       |
| ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Es una migración amplia que toca 11 pantallas/componentes existentes con texto hardcodeado; un error al extraer una clave puede dejar un string sin traducir o romper interpolaciones dinámicas (ej. nombres de usuario en notificaciones).                                                                       | El plan migra pantalla por pantalla con prueba manual en cada paso (pasos 6–12), y el paso 14 es una auditoría final dedicada a detectar strings remanentes en español.                                                                                          |
| Sin selector dentro del panel admin, un usuario que inicia sesión en un idioma y luego quiere cambiarlo debe cerrar sesión y volver a pasar por una pantalla de auth.                                                                                                                                             | Aceptado como decisión explícita del usuario (ver Decisiones); si se necesita cambiar de idioma sin cerrar sesión, se extiende en una spec futura agregando el selector a `MainLayout`.                                                                          |
| Los mensajes de error del backend seguirán en el idioma que tenga configurado el backend (hoy español), generando una UI mixta cuando el idioma activo es inglés y ocurre un error de API.                                                                                                                        | Aceptado como decisión explícita del usuario y limitación conocida de un proyecto frontend-only (ver Scope); se resolvería en una spec futura si el backend agrega soporte de idioma en sus respuestas.                                                          |
| El backend no contempla hoy el campo `locale` en `POST /login`, por lo que enviarlo no tiene ningún efecto visible hasta que el backend lo implemente.                                                                                                                                                            | Aceptado: el costo de enviarlo es mínimo (un campo extra en un payload ya existente) y deja la puerta abierta a que el backend lo adopte en el futuro sin requerir ningún cambio adicional del lado frontend.                                                    |
| `/forgot-password` y `/login/resend-2fa` no pasan por `POST /login`, así que el idioma activo no llega al backend en esos dos flujos (ej. el email de recuperación de contraseña o el reenvío del código 2FA no tendrían forma de saber el idioma elegido, aunque el backend implementara soporte para el campo). | Aceptado como decisión explícita del usuario (ver Decisiones); si se necesita cobertura en esos flujos, se agrega en una spec futura (ej. como parámetro adicional en esos dos endpoints, o volviendo a evaluar el header `Accept-Language`).                    |
| Si el backend valida estrictamente el body de `POST /login` y rechaza campos no declarados en su swagger, enviar `locale` podría producir un `422` inesperado en vez de ser simplemente ignorado.                                                                                                                 | No verificado contra el backend real en el momento de escribir esta spec; el primer paso de prueba manual (paso 5 del plan) debe confirmar contra el entorno real que el login sigue funcionando con el campo agregado antes de continuar con el resto del plan. |

---

## What is **not** in this spec

- Traducción de los mensajes de error que devuelve el backend.
- Selector de idioma dentro del panel admin / `MainLayout.vue`.
- Persistencia de la preferencia de idioma en el backend.
- Formateo de fechas/números locale-aware.
- Idiomas adicionales a español e inglés.
- Prefijos de idioma en la URL.

Cada uno de estos, si se necesita, va en su propio spec.
