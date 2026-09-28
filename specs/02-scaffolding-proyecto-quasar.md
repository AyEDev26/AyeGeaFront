# SPEC 02 — Scaffolding inicial del proyecto Quasar

> **Status:** Implementado
> **Depends on:** Ninguna.
> **Date:** 2026-08-30
> **Objective:** Scaffoldear el proyecto base Vue 3 + Quasar + Vite + Pinia + TypeScript (SPA, router en modo hash, cliente Axios contra `/api/v1`) dejando el repositorio listo para implementar funcionalidades sobre él.

---

## Por qué existe esta spec

El repositorio aún no tiene código de aplicación (sin `package.json`, sin `src/`). SPEC 01 (autenticación de usuarios) depende de esta base y no puede implementarse sin ella. Este spec es deliberadamente mínimo: monta solo el tooling y la estructura, sin tema visual ni layout de marca, para que cada decisión de scaffolding no quede enterrada dentro de una spec de funcionalidad.

---

## Scope

**In:**

- Proyecto Quasar CLI (v2) con Vite, TypeScript y Composition API (`<script setup>`), creado en la raíz del repositorio.
- Modo SPA (coincide con `deploy/deploy.sh`, que espera `dist/spa`, y con `deploy/nginx.conf.example`).
- Vue Router en modo `hash` (coincide con los comentarios de `deploy/nginx.conf.example`).
- Pinia como gestor de estado, con la carpeta `src/stores/` inicializada.
- Boot file de Axios (`src/boot/axios.ts`) con `baseURL: '/api/v1'` (ruta relativa, sin URL absoluta del backend en ningún entorno).
- Proxy del dev server (`devServer.proxy` en `quasar.config.ts`) que redirige `/api` al backend real (`http://80.240.127.117:8081`) durante `npm run dev`, replicando en desarrollo el mismo comportamiento relativo que nginx da en producción.
- ESLint + Prettier con el preset que ofrece el wizard de Quasar CLI.
- Limpieza de las páginas/componentes de ejemplo que trae el scaffolding por defecto (contador, `EssentialLink`, etc.), dejando una página de inicio mínima sin estilo de marca.
- Verificación de que `npm run build` genera `dist/spa/index.html`, la ruta que ya espera `deploy/deploy.sh`.

**Out of scope (for future specs):**

- Tema visual de marca: tipografías Outfit/Roboto, paleta teal/blue-grey, fondo glassmorphism, layout con header+drawer (`notas-jcn/guia-estilo-visual-corestarter.md`). Va en un spec de "layout y tema" posterior.
- Todo lo funcional de autenticación (SPEC 01): store de auth, guards de router, pantallas de login/2FA/recuperación de password.
- Framework de testing (Vitest u otro). Se añade en el spec donde exista una necesidad real de tests.
- CI/CD, git hooks (husky/commitlint) y cualquier automatización más allá de lint/build manuales.
- Internacionalización (i18n).
- PWA, SSR, Capacitor/Electron — el proyecto es y seguirá siendo SPA pura.

---

## Data model

Este spec no introduce estructuras de datos de dominio. Solo scaffolding de tooling y configuración de proyecto (`quasar.config.ts`, `tsconfig.json`, `.eslintrc`/`eslint.config.js`, `src/boot/axios.ts`, `src/stores/index.ts` vacío).

---

## Implementation plan

1. Ejecutar `npm init quasar@latest` en la raíz del repositorio, seleccionando en el wizard: "App with Quasar CLI", Vite como bundler, TypeScript, Composition API con `<script setup>`, ESLint sí, Prettier sí, Pinia sí, Axios sí (boot file), Vue Router (por defecto). Verificar que el wizard no sobrescribe `CLAUDE.md`, `deploy/`, `notas-jcn/`, `.git/` ni `skills-lock.json`. Prueba manual: `npm run dev` levanta el proyecto de ejemplo por defecto sin errores en consola.
2. Revisar `quasar.config.ts` y asegurar `vueRouterMode: 'hash'` y `boot: ['axios']`. Ajustar si el wizard generó otro valor.
3. Añadir `devServer.proxy` en `quasar.config.ts` redirigiendo `/api` a `http://80.240.127.117:8081`. Prueba manual: con `npm run dev` corriendo, `curl http://localhost:<puerto>/api/v1/login` (POST vacío o GET) debe recibir respuesta del backend Laravel real, no el `index.html` de la SPA.
4. Editar `src/boot/axios.ts` para que la instancia de Axios use `baseURL: '/api/v1'` en vez del ejemplo por defecto del wizard.
5. Eliminar las páginas/componentes de ejemplo del scaffolding (contador, `EssentialLink.vue`, enlaces de ejemplo en el drawer por defecto) dejando `src/pages/IndexPage.vue` como placeholder mínimo y `src/layouts/MainLayout.vue` sin personalizar visualmente. Prueba manual: `npm run dev` sigue funcionando y muestra el placeholder.
6. Verificar que `src/stores/` queda con la estructura estándar del wizard (archivo `index.ts` de inicialización de Pinia), sin stores de ejemplo. Prueba manual: `npm run dev` sigue funcionando con Pinia activo (sin errores de consola relacionados con el store).
7. Revisar `.gitignore` generado por el wizard y completar si falta algo (`node_modules/`, `dist/`, `.env*.local`) sin tocar las entradas ya presentes en el `.gitignore` actual del repo.
8. Ejecutar `npm run lint` y corregir cualquier error, dejando el linter limpio desde el primer commit del scaffolding.
9. Ejecutar `npm run build` y confirmar que genera `dist/spa/index.html`, sin modificar `deploy/deploy.sh` ni `deploy/nginx.conf.example`.

---

## Acceptance criteria

- [x] `npm run dev` levanta la app localmente sin errores en consola.
- [x] La app navega con Vue Router en modo `hash` (URLs tipo `/#/`).
- [x] Una petición a `/api/v1/...` durante `npm run dev` llega al backend real a través del proxy configurado, sin errores de CORS.
- [x] `src/boot/axios.ts` expone una instancia de Axios con `baseURL: '/api/v1'`.
- [x] Pinia está inicializado y activo (verificable sin errores de consola relacionados con el store).
- [x] `npm run lint` termina sin errores.
- [x] `npm run build` genera `dist/spa/index.html`.
- [x] El proyecto no contiene páginas/componentes de ejemplo del scaffolding por defecto de Quasar (contador, `EssentialLink`, etc.).
- [x] `CLAUDE.md`, `deploy/`, `notas-jcn/`, `skills-lock.json` y el histórico de `.git/` quedan intactos tras el scaffolding.

---

## Decisions

- **Sí:** Quasar CLI + Vite (`npm init quasar@latest`) en vez de instalar `@quasar/vite-plugin` manualmente sobre un proyecto Vite vacío. Es el camino oficial soportado por el equipo de Quasar para Quasar v2 sin legacy code.
- **Sí:** modo SPA. Confirmado por `deploy/deploy.sh` (`BUILD_DIR="$ROOT_DIR/dist/spa"`) y por `deploy/nginx.conf.example`.
- **Sí:** Vue Router en modo `hash`. Confirmado explícitamente en los comentarios de `deploy/nginx.conf.example`.
- **Sí:** proxy del dev server hacia el backend real bajo `/api`, en vez de una variable de entorno con URL absoluta del backend. Mantiene el mismo comportamiento relativo en dev y en producción, evita CORS y evita depender de `.env`.
- **No:** variables de entorno para la URL del backend. Al usarse siempre una ruta relativa (`/api/v1`), tanto en dev (proxy) como en prod (nginx), no hace falta.
- **Sí:** ESLint + Prettier con el preset del wizard de Quasar CLI.
- **No:** Vitest/testing en este spec. Se añade cuando exista una necesidad real de tests, probablemente junto a SPEC 01.
- **No:** tema visual/layout de marca (fuentes, colores, header/drawer) en este spec. Se deja para un spec de "layout y tema" posterior que consulte `notas-jcn/guia-estilo-visual-corestarter.md`.
- **Sí:** nombre de paquete `ayecore-frontend` en `package.json`, para coincidir con las referencias ya existentes en `deploy/deploy.sh` y `deploy/nginx.conf.example` ("AyeCore Frontend").

---

## Risks

| Riesgo                                                                                                                                                     | Mitigación                                                                                                                                                                                                                                              |
| ---------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| El wizard de `npm init quasar@latest` puede tener problemas al scaffoldear sobre un directorio no vacío (ya existen `CLAUDE.md`, `deploy/`, `.git/`, etc.) | Tras el wizard, verificar explícitamente que no se sobrescribió ni borró nada existente; si el wizard se niega a correr en un directorio no vacío, scaffoldear en una carpeta temporal y mover los ficheros generados a la raíz sin tocar lo existente. |
| Futuras versiones del wizard de Quasar CLI pueden cambiar el texto/orden de sus prompts                                                                    | El plan describe las selecciones por intención (TS, Vite, Pinia, ESLint, Axios, SPA), no por el texto literal del prompt, para seguir siendo aplicable aunque cambie la redacción del wizard.                                                           |

---

## What is **not** in this spec

- Tema visual de marca (fuentes, colores, layout con header/drawer, fondo glassmorphism).
- Todo lo funcional de autenticación (login, 2FA, recuperación de password) — eso es SPEC 01.
- Framework de testing.
- CI/CD y git hooks.
- Internacionalización.
- PWA, SSR, Capacitor/Electron.

Cada uno de estos, si se necesita, va en su propio spec.
