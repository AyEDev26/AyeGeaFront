# SPEC 18 — Página Home de bienvenida con tarjetas de funcionalidades

> **Status:** Implementado
> **Depends on:** SPEC 04, SPEC 08
> **Date:** 2026-09-05
> **Objective:** Rediseñar `IndexPage.vue` como página de bienvenida con una sección hero (imagen aleatoria + texto lorem ipsum) y una rejilla de 6 tarjetas placeholder de funcionalidades, sin navegación real ni gating por permisos.

---

## Por qué existe esta spec

SPEC 04 dejó `IndexPage.vue` como un placeholder mínimo (solo un título dentro de una `GlassCard`), remitiendo explícitamente a un futuro dashboard real. Esta spec no implementa ese dashboard real: construye el diseño visual definitivo de la Home (hero + rejilla de tarjetas) con contenido de relleno (imágenes de un servicio placeholder, textos lorem ipsum vía i18n), de modo que la maquetación y el patrón visual queden listos para sustituir el copy y las imágenes por contenido real más adelante, sin tocar la estructura.

---

## Scope

**In:**

- Reescribir `src/pages/IndexPage.vue`: sección **hero** (una `GlassCard` con imagen de `picsum.photos` con seed fijo, título de bienvenida y subtítulo) seguida de un título de sección y una **rejilla responsive de 6 `GlassCard`** de funcionalidad, cada una con imagen (`picsum.photos` con seed propio y fijo), icono de Material Icons, título temático y descripción — todo dentro de `AdminPageWrapper` como ya hace hoy.
- Nuevas claves i18n bajo el namespace `home` en `src/i18n/es/index.ts` y `src/i18n/en-US/index.ts`: `hero.title`, `hero.subtitle`, `sectionTitle`, y `features.<key>.title` / `features.<key>.description` para 6 claves (`users`, `reports`, `notifications`, `automation`, `integrations`, `security`), con contenido lorem ipsum de relleno.
- Eliminar la clave `common.homeTitle` (queda sin uso tras el rediseño) de ambos locales.
- Fallback visual: cuando una imagen `q-img` (hero o de una tarjeta) falla al cargar, se muestra un icono en vez de un hueco roto (slot `error` de `q-img`).
- Rejilla responsive: 3 columnas en desktop (`md+`), 2 en tablet (`sm`), 1 en móvil, con `q-col-gutter-md`.
- Estilos scoped mínimos en `IndexPage.vue` para el hover de las tarjetas (elevación sutil, transición 0.3s), reutilizando `GlassCard`, `AdminPageWrapper` y clases utilitarias existentes (`.font-outfit`) sin duplicar CSS de marca.
- Array local de las 6 tarjetas (`key` + `icon`) definido en el `<script setup>` de `IndexPage.vue`.

**Out of scope (for future specs):**

- Navegación real y filtrado por `auth.hasPermission` en las tarjetas — se descartó explícitamente: son tarjetas puramente decorativas, sin `to` ni `@click` que cambie de ruta. El drawer de `MainLayout` ya cubre la navegación funcional real.
- Imágenes o copy de marca definitivos — se sustituirán cuando exista contenido real, en una spec futura.
- Un componente reutilizable `FeatureCard.vue` — el array y el markup de tarjeta viven en `IndexPage.vue`; si se reutiliza en otra vista, se extrae entonces.
- Cambios a `MainLayout.vue`, a `src/router/routes.ts` o a cualquier otra página.
- Testing automatizado (no hay framework de testing en el proyecto, según SPEC 02).

---

## Data model

Esta spec no introduce estructuras de datos de dominio, store ni tipos nuevos. Introduce únicamente un array de configuración estático y local en `<script setup>` de `IndexPage.vue`:

```ts
interface HomeFeatureCard {
  key: string; // usado como seed de imagen (`homeayecore-${key}`) y como clave i18n (`home.features.${key}`)
  icon: string; // nombre de icono Material Icons
}

const features: HomeFeatureCard[] = [
  { key: 'users', icon: 'people' },
  { key: 'reports', icon: 'insights' },
  { key: 'notifications', icon: 'notifications' },
  { key: 'automation', icon: 'bolt' },
  { key: 'integrations', icon: 'extension' },
  { key: 'security', icon: 'shield' },
];
```

El título y la descripción de cada tarjeta salen de i18n (`t('home.features.' + key + '.title')` / `.description`), no del array. La URL de imagen de cada tarjeta se calcula como `https://picsum.photos/seed/homeayecore-${key}/600/400`; la del hero es `https://picsum.photos/seed/homeayecore-hero/1200/480`.

---

## Implementation plan

1. Añadir el namespace `home` en `src/i18n/es/index.ts` y `src/i18n/en-US/index.ts` (`hero.title`, `hero.subtitle`, `sectionTitle`, `features.users.title`/`.description`, y lo mismo para `reports`, `notifications`, `automation`, `integrations`, `security`), con contenido lorem ipsum de relleno en ambos idiomas. Eliminar `common.homeTitle` de los dos locales. Prueba manual: `npm run dev` arranca sin warnings de claves de traducción faltantes.
2. Reescribir el `<script setup>` de `IndexPage.vue`: quitar la lógica actual (solo `useI18n`), añadir el array `features` (con `key`/`icon` como en el modelo de datos) y una función/computed simple para construir las URLs de imagen (hero y por tarjeta) a partir del `key`. Prueba manual: el archivo sigue compilando sin errores de TypeScript.
3. Añadir al template la sección **hero**: `GlassCard` con un `q-img` (URL del hero, `ratio` ancho, slot `error` con un `q-icon` de fallback), y debajo el título (`text-h4 font-outfit text-teal-10`, `t('home.hero.title')`) y el subtítulo (`text-body1`, `t('home.hero.subtitle')`). Prueba manual: entrar en `/`, ver la tarjeta hero con imagen, título y subtítulo.
4. Debajo del hero, añadir un `q-separator` y el título de sección (`text-h6 font-outfit text-teal-10`, `t('home.sectionTitle')`), seguido de un `row q-col-gutter-md` con un `col-12 col-sm-6 col-md-4` por cada elemento de `features`; cada columna contiene una `GlassCard` con `q-img` (URL de la tarjeta, mismo fallback de `error`), `q-icon` (icono del feature), título (`t('home.features.' + key + '.title')`) y descripción (`t('home.features.' + key + '.description')`). Sin `to` ni `@click` de navegación. Prueba manual: ver las 6 tarjetas con imágenes distintas, iconos y textos; redimensionar la ventana y comprobar 3/2/1 columnas según el ancho.
5. Añadir estilos `scoped` mínimos para el hover de tarjeta (`transform: translateY(-4px)` + sombra, transición `0.3s`), sin tocar `app.css` ni duplicar el CSS de marca ya centralizado por SPEC 04. Prueba manual: pasar el cursor sobre una tarjeta y confirmar la elevación sutil.
6. Ejecutar `npm run lint` y corregir cualquier error introducido.
7. Ejecutar `npm run build` y confirmar que genera `dist/spa/index.html` sin errores nuevos.

---

## Acceptance criteria

- [x] `/` (Home) muestra una sección hero con imagen de `picsum.photos` (seed fijo `homeayecore-hero`), título y subtítulo, ambos obtenidos de las claves i18n `home.hero.title` / `home.hero.subtitle`.
- [x] Debajo del hero se muestra el título de sección `home.sectionTitle` y una rejilla de exactamente 6 tarjetas de funcionalidad.
- [x] Cada tarjeta muestra una imagen de `picsum.photos` con seed propio y fijo (no cambia entre recargas), un icono de Material Icons, un título y una descripción, obtenidos de `home.features.<key>.title` / `.description`.
- [x] Ninguna tarjeta de funcionalidad tiene navegación (sin `to`, sin `@click` que cambie de ruta) ni depende de `auth.hasPermission`.
- [x] La rejilla es responsive: 3 columnas en `md` en adelante, 2 en `sm`, 1 por debajo de `sm`.
- [x] Si una imagen de `picsum.photos` falla al cargar, la tarjeta o el hero afectado muestra un icono de fallback en vez de un hueco roto.
- [x] La clave `common.homeTitle` ya no existe en `src/i18n/es/index.ts` ni en `src/i18n/en-US/index.ts`.
- [x] La página sigue envuelta en `AdminPageWrapper`, y tanto el hero como cada tarjeta usan `GlassCard`, consistente con SPEC 04.
- [x] `npm run lint` termina sin errores.
- [x] `npm run build` genera `dist/spa/index.html` sin errores.

---

## Decisions

- **Sí:** tarjetas puramente decorativas, sin navegación real ni gating por permiso. Evita acoplar la Home a funcionalidades concretas que podrían cambiar antes de que exista contenido real; el drawer de `MainLayout` ya cumple el rol de navegación funcional.
- **Sí:** imágenes vía `picsum.photos` con seed fijo por tarjeta y para el hero. No requiere backend de assets ni imágenes propias todavía, y el seed fijo evita que la imagen cambie en cada recarga.
- **Sí:** textos vía i18n con contenido lorem ipsum de relleno, en vez de hardcodeados en el template. Mantiene el patrón de SPEC 08 y permite reemplazar el copy definitivo después sin tocar el markup.
- **Sí:** títulos de tarjeta con nombres temáticos plausibles (Gestión de usuarios, Reportes y analítica, etc.) en vez de "Funcionalidad N". Da una idea realista del resultado final aunque la descripción bajo el título sea de relleno.
- **Sí:** array de tarjetas definido localmente en `<script setup>` de `IndexPage.vue`, sin store ni archivo de tipos nuevo. No hay lógica de negocio ni datos persistentes; es contenido estático de presentación.
- **Sí:** fallback de icono en el slot `error` de `q-img` para imágenes que no cargan. Evita huecos rotos visibles sin conexión, con coste de implementación mínimo (funcionalidad nativa de Quasar).
- **No:** enlazar las tarjetas a rutas reales (Usuarios, Roles, Configuración, Actividad) ni filtrarlas por permiso. Descartado explícitamente por el usuario para esta spec.
- **No:** componente reutilizable `FeatureCard.vue`. Se descarta por ahora al usarse solo en esta página; se extrae en una spec futura si se reutiliza en otra vista.
- **No:** imágenes locales propias en `src/assets/`. Se descarta porque no hay diseño ni fotografía de marca definitiva todavía.

---

## Risks

| Riesgo                                                                                                                               | Mitigación                                                                                                                             |
| ------------------------------------------------------------------------------------------------------------------------------------ | -------------------------------------------------------------------------------------------------------------------------------------- |
| `picsum.photos` no está disponible o no hay conexión a internet (p. ej. desarrollo offline).                                         | `q-img` con slot `error` que muestra un icono de fallback en vez de un hueco roto; la página sigue siendo utilizable sin las imágenes. |
| El contenido servido por una URL de `picsum.photos` con seed fijo podría cambiar si el servicio modifica su algoritmo de generación. | Riesgo aceptado: es contenido puramente decorativo y temporal, se sustituirá por imágenes reales en una spec futura.                   |

---

## What is **not** in this spec

- Navegación real ni gating por permiso en las tarjetas de funcionalidad.
- Imágenes o copy definitivos de marca.
- Componente reutilizable de tarjeta de funcionalidad.
- Cambios al drawer de navegación (`MainLayout.vue`) ni a las rutas existentes (`src/router/routes.ts`).
- Testing automatizado.

Cada uno de estos, si se necesita, va en su propia spec.
