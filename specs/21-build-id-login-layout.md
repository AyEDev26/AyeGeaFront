# SPEC 21 — Build ID único por build, visible en login y layout principal

> **Status:** Aprobado
> **Depends on:** Ninguna SPEC previa (toca `quasar.config.ts`, `env.d.ts`, `MainLayout.vue` y `LoginPage.vue`, que ya existen).
> **Date:** 2026-10-24
> **Objective:** Generar un identificador único (fecha-hora + hash corto de git) en cada ejecución de `quasar build` y mostrarlo junto a la versión en la cabecera del layout principal y bajo la tarjeta de la página de login.

---

## Scope

**In:**

- **Generación del build ID** en `quasar.config.ts`, una vez por ejecución de `quasar build` (y una vez por arranque de `quasar dev`):
  - Formato producción: `YYYYMMDD-HHmm-<hash>`, p. ej. `20261024-1532-0d2f373`. Fecha y hora **locales de la máquina que construye**; `<hash>` = `git rev-parse --short HEAD`.
  - Si git no está disponible o falla (p. ej. build fuera de un repositorio), el hash se omite y el ID queda `YYYYMMDD-HHmm`. El build nunca falla por esto.
  - Formato dev: el mismo con sufijo `-dev`, p. ej. `20261024-1532-0d2f373-dev`, para distinguirlo de un build de producción.
- **Inyección en el bundle** como constante global en tiempo de compilación (`build.define` → `__BUILD_ID__`), con su declaración de tipo en `env.d.ts`. Sin peticiones ni ficheros extra en runtime.
- **Layout principal** (`MainLayout.vue`): el `q-badge` de la cabecera, que hoy muestra `v{{ appVersion }}`, pasa a mostrar la versión y el build ID juntos (p. ej. `v0.0.1 · 20261024-1532-0d2f373`). En pantallas estrechas el build ID puede ocultarse del badge y quedar accesible vía `q-tooltip` para no desbordar la cabecera.
- **Login** (`LoginPage.vue`): línea de texto discreta (`text-caption`, gris) centrada bajo la tarjeta con la versión y el build ID (mismo formato que en el layout). Sin interferir con el `LanguageSwitcher` ni con el centrado de la tarjeta.
- **Un único punto de formato:** módulo `src/utils/build-info.ts` que exporta `appVersion` (de `package.json`), `buildId` (`__BUILD_ID__`) y `appVersionLabel` (`v0.0.1 · <buildId>`), usado por layout y login para no duplicar la lógica.
- **Documentación:** actualizar `CLAUDE.md` (sección de estado) con una línea sobre el build ID.

**Out of scope (for future specs):**

- Mostrar el build ID en otras pantallas (recuperar / restablecer contraseña, 2FA, 404, perfil).
- Publicar un fichero `build-info.json` o similar en `dist/spa` para consultar el build desplegado.
- Detectar en el cliente que hay un build nuevo desplegado y avisar al usuario.
- Enviar el build ID al backend (cabecera HTTP, logs, reporte de errores).
- Marcar builds con cambios sin commitear (sufijo `-dirty`).
- Modificar `deploy/deploy.sh` (el build ID se genera dentro de `npm run build`, que el script ya invoca).
- Cambiar el esquema de versionado de `package.json`.
- Internacionalización del texto: el formato `v… · <id>` es independiente del idioma, no lleva claves `es` / `en-US`.

---

## Data model

No hay datos persistentes ni endpoints. Solo una constante de compilación y un módulo de utilidades:

```ts
// env.d.ts
declare const __BUILD_ID__: string;

// src/utils/build-info.ts
import { version } from '../../package.json';

export const appVersion: string = version;      // '0.0.1'
export const buildId: string = __BUILD_ID__;    // '20261024-1532-0d2f373'
export const appVersionLabel: string = `v${version} · ${__BUILD_ID__}`;
```

Convenciones:

- El ID se calcula **una sola vez** por proceso de `quasar build`; todos los chunks y todas las pantallas comparten el mismo valor.
- Dos builds distintos nunca producen el mismo ID salvo que se lancen dentro del mismo minuto sobre el mismo commit. Es un caso aceptado (ver decisiones).
- El valor es una cadena con caracteres seguros (`[0-9a-f-]` y `dev`); se inyecta con `JSON.stringify`.

---

## Implementation plan

1. **Generar e inyectar el ID.** En `quasar.config.ts`, función que construye el ID (fecha-hora local + hash git con `try/catch`, sufijo `-dev` si `ctx.dev`) y la añade a `build.define` como `__BUILD_ID__`. Declarar la constante en `env.d.ts`. Verificación: `pnpm typecheck` sin errores y `quasar build` termina sin errores.
2. **Módulo de utilidades.** Crear `src/utils/build-info.ts` con `appVersion`, `buildId` y `appVersionLabel`. Verificación: type-check sin errores.
3. **Layout principal.** Sustituir en `MainLayout.vue` el import directo de `version` de `package.json` por `build-info.ts` y mostrar la versión y el build ID en el badge de cabecera (con tooltip / ocultación del ID en ancho móvil). Verificación manual con `quasar dev`: badge con `v0.0.1 · …-dev` sin desbordar la cabecera en ancho estrecho.
4. **Login.** Añadir la línea con `appVersionLabel` bajo la tarjeta en `LoginPage.vue`. Verificación manual en `/#/login`: texto discreto, centrado, visible en temas Clásico y Claro y en ancho móvil.
5. **Verificación en build real y documentación.** Ejecutar `quasar build` dos veces con un minuto de diferencia y comprobar que `dist/spa` contiene IDs distintos; actualizar `CLAUDE.md`. Verificación: criterios de aceptación completos.

---

## Acceptance criteria

- [ ] Cada ejecución de `quasar build` genera un ID con formato `YYYYMMDD-HHmm-<hash>`, donde `<hash>` coincide con `git rev-parse --short HEAD`.
- [ ] Dos builds lanzados con al menos un minuto de diferencia producen IDs distintos en el `dist/spa` resultante.
- [ ] Todo el bundle de un mismo build contiene el mismo ID (layout y login muestran el mismo valor).
- [ ] En `quasar dev` el ID lleva el sufijo `-dev`; en `quasar build` no.
- [ ] Si `git rev-parse` falla, el build termina correctamente y el ID es `YYYYMMDD-HHmm`.
- [ ] La cabecera del layout principal muestra la versión de `package.json` y el build ID.
- [ ] La página `/#/login` muestra la versión y el build ID bajo la tarjeta, con estilo discreto, sin desplazar ni solapar el resto de elementos.
- [ ] En ancho móvil, la cabecera no desborda ni el título «AyeGea» se corta por el build ID, y el ID sigue consultable (tooltip o texto completo).
- [ ] El módulo `src/utils/build-info.ts` es el único que lee `__BUILD_ID__`; layout y login no duplican el formato.
- [ ] No se añade ningún fichero ni petición HTTP en runtime por esta feature.
- [ ] `CLAUDE.md` documenta el build ID.
- [ ] `pnpm lint` y `pnpm typecheck` pasan sin errores nuevos.

---

## Decisions taken and discarded

- **Fecha-hora + hash git** (decisión del usuario) frente a solo fecha-hora (no identifica el commit) o UUID (no legible ni trazable): permite saber de un vistazo cuándo y desde qué commit se construyó.
- **Sufijo `-dev` en `quasar dev`** (decisión del usuario) frente a valor fijo o igual que en build: evita confundir un entorno local con uno desplegado.
- **Mostrado junto a la versión** (decisión del usuario) frente a pie del drawer o solo tooltip: reutiliza el badge existente y en login es visible sin interacción.
- **Solo mostrarlo** (decisión del usuario) frente a publicar `build-info.json` o avisar de versión nueva: son features distintas; esta se limita a generar y mostrar.
- **Constante de compilación (`build.define`)** frente a leer un fichero en runtime o generar un `.env`: sin I/O ni dependencias, y el valor queda fijado en el bundle.
- **Hora local de la máquina que construye**, sin zona horaria en el ID: es un identificador, no un registro auditable; el hash ya aporta la trazabilidad exacta.
- **Sin marca `-dirty`:** no se pidió y añade lógica de git; si hace falta, otra spec.
- **Resolución al minuto** aceptada: dos builds del mismo commit en el mismo minuto comparten ID; es el mismo código, así que no hay ambigüedad práctica.
- **Sin i18n:** el texto es un identificador técnico, no lleva traducción.
- **El estado de la spec se escribe en español** (`Borrador`), siguiendo las SPEC anteriores.

---

## Identified risks

- **`quasar.config.ts` evaluado más de una vez:** si Quasar reevalúa la config (p. ej. al reiniciar dev por un cambio de config), el ID dev cambia; es inocuo. En `quasar build` se calcula una vez; se comprueba en el paso 5 que no varía entre chunks.
- **Git no disponible en el entorno de build** (CI, contenedor sin `.git`): mitigado con `try/catch` y ID sin hash.
- **Sintaxis de `define` en Quasar App Vite v3:** la clave y el escape de `JSON.stringify` deben ser los que acepta la versión instalada. Mitigación: comprobarlo en el paso 1 y, si `build.define` no aplica, usar la opción equivalente de `quasar.config.ts` sin cambiar el contrato (`__BUILD_ID__` en `build-info.ts`).
- **Importar `package.json` desde `src`:** ya se hace hoy en `MainLayout.vue`; se mantiene el mismo patrón en `build-info.ts`.
- **Cabecera desbordada en móvil:** el texto más largo del badge puede no caber junto al título. Mitigación: ocultar el ID en ancho estrecho y dejarlo en `q-tooltip`, revisado en el paso 3.

---

## What is **not** in this spec

- Build ID en pantallas distintas de login y layout principal.
- Fichero `build-info.json` o endpoint de versión.
- Detección y aviso de nueva versión en el cliente.
- Envío del build ID al backend o a herramientas de errores.
- Marca de cambios sin commitear.
- Cambios en `deploy/deploy.sh` o en el versionado de `package.json`.

Cada uno de esos puntos, si se aborda, va en su propia spec.
