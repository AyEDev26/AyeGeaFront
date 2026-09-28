# SPEC 11 — Header X-Locale global en todas las llamadas a la API

> **Status:** Implementado
> **Depends on:** SPEC 01, SPEC 08, SPEC 10
> **Date:** 2026-09-04
> **Objective:** Reemplazar el envío puntual del header `X-Locale` (SPEC 10, limitado a `/config/business`) y el campo `locale` del body de `POST /login` (SPEC 08) por un interceptor global en `src/boot/axios.ts` que agregue `X-Locale` a toda request del cliente `api`, alineado con el swagger real que documenta ese header en los 24 endpoints existentes.

---

## Por qué existe esta spec

SPEC 08 decidió explícitamente **no** enviar un header de idioma global (`Accept-Language` o similar) en `src/boot/axios.ts`, y en su lugar mandar un campo `locale` solo en el body de `POST /login`, porque en ese momento el backend no documentaba ningún mecanismo de idioma en su swagger. SPEC 10 encontró después que `/config/business` sí documentaba un header `X-Locale`, y lo agregó como "excepción puntual" acotada a `config.ts`, respetando la decisión de SPEC 08 de no generalizarlo.

Al revisar el swagger completo (`http://80.240.127.117:8081/api/documentation#/`, `GET /docs?api-docs.json`, revisado el 2026-09-04) para esta spec se confirma que **los 24 endpoints documentados, sin excepción**, referencian el mismo componente reutilizable `#/components/parameters/XLocaleHeader` (`X-Locale`, enum `es`/`en`, default `es`), con esta descripción: _"Idioma de la respuesta (mensajes de la API, validación, y de los emails que se disparen en este request). Si no se manda, se usa el header Accept-Language o, en su defecto, el idioma por defecto de la API."_ Además, `POST /login` ya **no** documenta ningún campo `locale` en su body — el campo que agregó SPEC 08 era especulativo y hoy no tiene soporte documentado.

Este dato nuevo invalida las dos decisiones puntuales de SPEC 08 y SPEC 10: el header no es una excepción de un solo endpoint, es el mecanismo uniforme de idioma de toda la API. Esta spec generaliza su envío vía un interceptor global, siguiendo el mismo patrón que el interceptor de `Authorization` que ya existe en `src/boot/axios.ts`.

---

## Scope

**In:**

- Interceptor de request global en `src/boot/axios.ts` (mismo patrón que el interceptor de `Authorization` ya existente) que agrega el header `X-Locale` (`es` o `en`, mapeado desde `useLocaleStore().current`) a **toda** request del cliente `api`, incluyendo los endpoints públicos de auth (`/login`, `/forgot-password`, `/login/resend-2fa`, `/login/verify-2fa`, `/reset-password`, `/refresh`, `/logout`) y los endpoints protegidos.
- Mover la función `toApiLocale(locale: AppLocale): 'es' | 'en'` (hoy definida localmente en `src/stores/config.ts`, SPEC 10) a `src/boot/i18n.ts`, exportada junto a `AppLocale`, para que el interceptor de `axios.ts` y cualquier otro consumidor futuro la reutilicen sin duplicarla.
- Eliminar el código puntual de SPEC 10 en `src/stores/config.ts` que agregaba manualmente el header `X-Locale` en `fetchBusinessConfig()` y `updateBusinessConfig()` — queda cubierto por el interceptor global, sin duplicar el header.
- Eliminar el campo `locale` del body de `POST /login` en `src/stores/auth.ts` (agregado en SPEC 08 de forma especulativa, hoy sin soporte documentado en el swagger) — el idioma del login pasa a viajar únicamente vía el header `X-Locale` del nuevo interceptor.
- Verificación manual contra el backend real de que el header llega correctamente en al menos un endpoint de cada grupo: público sin auth (`/login` o `/forgot-password`), autenticado (`/me` o `/users`), y el ya migrado en SPEC 10 (`/config/business`).
- Verificación manual de que un error de validación (`422`) devuelto por el backend llega traducido según el idioma activo (ej. forzar un `422` en `/login` con credenciales inválidas o en `/users` con datos inválidos, con inglés activo, y confirmar que `getApiErrorMessage`/`Notify` muestra el mensaje en inglés) — efecto esperado del header global, sin escribir código adicional en `getApiErrorMessage`.

**Out of scope (for future specs):**

- Traducir los textos propios del front (botones, labels, validaciones de formulario cliente) — ya cubierto por SPEC 08 vía `vue-i18n`; esta spec solo toca el header HTTP saliente.
- Agregar `X-Locale` a requests fuera del cliente `api` de `src/boot/axios.ts` — no existe otro cliente axios en el proyecto hoy.
- Cambiar el mecanismo de detección/persistencia del idioma activo (`localStorage`, detección de `navigator.language`, `LanguageSwitcher.vue`) — se reutiliza tal cual de SPEC 08.
- Traducir el contenido de los emails que dispara el backend (confirmación, reset de password, 2FA, etc.). El swagger indica que `X-Locale` ya los traduce del lado del backend; esta spec no agrega ninguna lógica de frontend para eso, solo se beneficia de enviar el header.
- Revisar o cambiar el comportamiento de fallback a `Accept-Language` que documenta el swagger cuando no se envía `X-Locale` — no aplica, porque con esta spec el header explícito siempre se envía.
- Auditar endpoints que no existan hoy en el swagger revisado (2026-09-04). Si el backend agrega un endpoint nuevo, el interceptor global se lo aplicará igual por ser uniforme a nivel de cliente HTTP, pero verificar caso por caso ese endpoint nuevo queda fuera de esta spec.

---

## Data model

Esta spec no introduce ninguna estructura de datos nueva ni persistida — reutiliza el store `src/stores/locale.ts` de SPEC 08 tal cual. Solo mueve una función existente y agrega un interceptor:

```ts
// src/boot/i18n.ts — se agrega junto a AppLocale/quasarLangPacks (ya existentes, SPEC 08)
export function toApiLocale(locale: AppLocale): 'es' | 'en' {
  return locale === 'en-US' ? 'en' : 'es';
}
```

```ts
// src/boot/axios.ts — el interceptor de request existente gana una línea más
import { useLocaleStore } from '@/stores/locale';
import { toApiLocale } from '@/boot/i18n';

api.interceptors.request.use((config: InternalAxiosRequestConfig) => {
  const auth = useAuthStore();
  if (auth.accessToken) {
    config.headers.Authorization = `Bearer ${auth.accessToken}`;
  }
  const localeStore = useLocaleStore();
  config.headers['X-Locale'] = toApiLocale(localeStore.current);
  return config;
});
```

`src/stores/config.ts` deja de definir `toApiLocale` localmente y de construir el header en cada llamada; `src/stores/auth.ts` deja de leer `useLocaleStore()` en `login()`.

---

## Implementation plan

1. Mover `toApiLocale` de `src/stores/config.ts` a `src/boot/i18n.ts` (exportada junto a `AppLocale`), actualizando el import en `config.ts` (que sigue usándola hasta el paso 3). Prueba manual: la app compila sin errores de tipos y `config.ts` sigue funcionando igual que antes.
2. Agregar el header `X-Locale` al interceptor de request existente en `src/boot/axios.ts`, leyendo `useLocaleStore().current` y mapeándolo con `toApiLocale`. Prueba manual: con las devtools en la pestaña Network, cualquier request (ej. `/me` tras loguear) incluye el header `X-Locale` con el valor esperado (`es` o `en`).
3. Eliminar el código puntual de SPEC 10 en `fetchBusinessConfig()`/`updateBusinessConfig()` (`src/stores/config.ts`) que agregaba el header manualmente, junto con los imports de `toApiLocale`/`useLocaleStore` en ese archivo si quedan sin otro uso. Prueba manual: `/config/business` sigue devolviendo `label`/`description` traducidos según el idioma activo, ahora agregado por el interceptor global en vez de por `config.ts`.
4. Eliminar el campo `locale` del payload de `POST /login` en `src/stores/auth.ts`, junto con el import de `useLocaleStore` en ese archivo si queda sin otro uso. Prueba manual: un login exitoso o fallido sigue funcionando igual, y el body del request a `/login` ya no incluye `locale` (solo `email`/`password`), verificable en Network.
5. Verificación manual end-to-end contra el backend real: con inglés activo (elegido en el selector de una pantalla de auth antes de loguearse), confirmar en Network que `/login`, `/forgot-password` (o `/login/resend-2fa`) y, tras loguearse, `/me` y `/users`, llevan todos el header `X-Locale: en`. Prueba manual: los requests inspeccionados en Network muestran el header correcto en cada uno.
6. Verificación manual de mensajes de error traducidos: con inglés activo, forzar un `422` (ej. intentar crear un usuario con un email ya existente, o loguearse con credenciales inválidas) y confirmar que el mensaje mostrado por `Notify`/`getApiErrorMessage` llega en inglés. Prueba manual: el mensaje de error visible en la UI está en inglés, sin haber tocado código de `getApiErrorMessage`.

---

## Acceptance criteria

- [ ] Toda request del cliente `api` (`src/boot/axios.ts`) incluye el header `X-Locale` con el valor `es` o `en` según el idioma activo, verificable en Network para al menos un endpoint público (`/login` o `/forgot-password`) y uno autenticado (`/me` o `/users`).
- [ ] `/config/business` sigue devolviendo `label`/`description` traducidos según el idioma activo, ahora sin código de header manual en `config.ts`.
- [ ] El body de `POST /login` ya no incluye el campo `locale` — solo `email` y `password`.
- [ ] `src/stores/config.ts` ya no construye el header `X-Locale` manualmente ni define `toApiLocale` localmente.
- [ ] `toApiLocale` vive en `src/boot/i18n.ts`, exportada junto a `AppLocale`.
- [ ] Cambiar el idioma en una pantalla de auth y luego forzar un error `422` (ej. login con credenciales inválidas) muestra el mensaje de error traducido al idioma activo, sin haber tocado `getApiErrorMessage`.
- [ ] `/forgot-password` y `/login/resend-2fa` —que en SPEC 08 quedaban sin idioma asociado— ahora llevan el header `X-Locale` correcto, verificable en Network.
- [ ] La app compila sin errores de tipos tras mover `toApiLocale` y eliminar los usos puntuales en `config.ts` y `auth.ts`.

---

## Decisions

- **Sí:** interceptor global en `src/boot/axios.ts`, mismo patrón que el interceptor de `Authorization` ya existente. Decisión explícita del usuario tras confirmar que el swagger documenta `X-Locale` en los 24 endpoints existentes sin excepción — revierte la decisión "No: header global" de SPEC 08, tomada sin ese dato.
- **No:** mantener el enfoque por-store de SPEC 10. Descartado porque obligaría a repetir el mismo código en cada store que llame a la API, cuando el header aplica uniformemente a todos los endpoints documentados.
- **Sí:** eliminar el campo `locale` del body de `POST /login` (SPEC 08). Decisión explícita del usuario — el swagger actual no lo documenta; el mecanismo real es el header, y mantener un campo no soportado agrega confusión sin beneficio.
- **Sí:** eliminar el código puntual de SPEC 10 en `config.ts`. Decisión explícita del usuario — queda redundante con el interceptor global (el mismo valor se enviaría dos veces).
- **Sí:** mover `toApiLocale` a `src/boot/i18n.ts`. Evita duplicar la función en `axios.ts` y en cualquier otro lugar que la necesite; `i18n.ts` ya es el módulo dueño del tipo `AppLocale`.
- **Sí:** documentar como criterio de aceptación que los mensajes de error del backend (422, validaciones) llegan traducidos. Decisión explícita del usuario — es un efecto directo y verificable del header global, aunque no requiere código nuevo en `getApiErrorMessage` (revierte parcialmente el "Out of scope" de SPEC 08 sobre errores del backend, que asumía que no había mecanismo disponible en ese momento).
- **No:** traducir el contenido de los emails que dispara el backend. El swagger indica que ya ocurre del lado del backend al enviar `X-Locale`; no requiere ningún cambio de frontend, así que no es una tarea de esta spec, solo un efecto colateral esperado.

---

## Risks

| Riesgo                                                                                                                                                                                                                                  | Mitigación                                                                                                                                                                                                                                |
| --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Si el backend no soporta `X-Locale` de forma consistente en todos los endpoints a pesar de estar documentado (ej. algún endpoint lo ignora silenciosamente), la UI podría mostrar mensajes de error o datos en un idioma inconsistente. | El paso 5 del plan verifica manualmente contra el backend real varios endpoints representativos (público, autenticado, ya migrado); si algún endpoint no respeta el header, se documenta como hallazgo antes de dar la spec por completa. |
| Eliminar el campo `locale` del body de `/login` (SPEC 08) es un cambio de contrato hacia el backend; si el backend llegó a implementar soporte para ese campo específico entretanto (fuera del swagger), se perdería esa vía.           | Aceptado como decisión explícita del usuario — el swagger es la fuente de verdad del contrato; si el backend adopta el campo en el futuro sin documentarlo, es un caso no soportado por este proyecto frontend-only.                      |
| El interceptor global agrega `X-Locale` incluso a endpoints con body `multipart/form-data` (ej. `POST /users/{user}/avatar`) que no se probaron explícitamente con ese header durante esta spec.                                        | Bajo riesgo — es un header adicional que no reemplaza `Content-Type` ni ningún otro header existente; si se detecta un problema real en un endpoint puntual, se documenta como hallazgo al hacer la verificación del paso 5.              |

---

## What is **not** in this spec

- Traducción de textos propios del front (ya cubierta por SPEC 08).
- Cambios al mecanismo de detección/persistencia del idioma activo o al `LanguageSwitcher.vue`.
- Traducción del contenido de emails disparados por el backend (ocurre del lado del backend, sin cambios de frontend).
- Soporte de idiomas adicionales a español e inglés.
- Un segundo cliente axios o un header de idioma fuera de `src/boot/axios.ts`.

Cada uno de estos, si se necesita, va en su propio spec.
