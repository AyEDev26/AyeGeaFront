# SPEC 01 — Imágenes temáticas en la página Home

> **Status:** Aprobado
> **Depends on:** —
> **Date:** 2026-09-28
> **Objective:** Sustituir las imágenes aleatorias de picsum.photos en la cabecera y en las 6 tarjetas de características de `IndexPage.vue` por fotografías reales, descargadas al repositorio, que representen visualmente el título de cada sección.

---

## Scope

**In:**

- Descargar 7 imágenes reales (1 cabecera + 6 características) desde Unsplash (licencia libre, uso comercial sin atribución obligatoria) y guardarlas en `src/assets/images/home/`.
- La imagen de cabecera debe representar el negocio real de la aplicación (gestión de activos empresariales: vehículos, equipamiento o materiales), no una escena de oficina genérica, aunque el texto (`home.hero.title` = "Bienvenido a AyeCore") sea de bienvenida.
- Cada imagen de característica debe representar visualmente el título de su tarjeta tal como existe hoy:
  - `users` ("Gestión de usuarios") → personas/equipo trabajando.
  - `reports` ("Reportes y analítica") → gráficos/dashboards de datos.
  - `notifications` ("Notificaciones") → campana/alertas.
  - `automation` ("Automatización") → engranajes/tecnología/robótica.
  - `integrations` ("Integraciones") → conexiones/piezas encajando/API.
  - `security` ("Seguridad") → candado/escudo.
- Modificar `src/pages/IndexPage.vue` para importar estas imágenes locales como módulos ES (`import heroImage from '@/assets/images/home/...'`) en lugar de construir URLs de picsum.photos.
- Mantener sin cambios: textos, orden, iconos, ratios de `q-img` (2.5 en cabecera, 1.5 en tarjetas) y el estado de error existente (icono gris cuando la imagen no carga).

**Out of scope (for future specs):**

- Cambiar los títulos, descripciones o el conjunto de features mostradas (siguen siendo genéricas de SaaS, no específicas de gestión de activos) — se deja fuera deliberadamente, es una decisión de contenido/negocio distinta a la de imágenes.
- Cambiar el texto Lorem ipsum de `home.hero.subtitle` y de las descripciones de features.
- Optimización avanzada de imágenes (formatos responsive `srcset`, lazy loading explícito, compresión WebP/AVIF) — de momento JPG simple.
- Subir las imágenes a un CDN o servicio externo de assets.

---

## Data model

Esta spec no introduce estructuras de datos nuevas. Solo añade 7 archivos binarios de imagen y cambia cómo `IndexPage.vue` referencia las URLs de imagen (de string interpolado a import de módulo).

---

## Implementation plan

1. Crear la carpeta `src/assets/images/home/`.
2. Buscar en Unsplash y descargar con `curl` 7 fotografías concretas (URLs directas a `images.unsplash.com`, licencia Unsplash) que encajen con los temas listados en el Scope, guardándolas como:
   - `hero-gestion-activos.jpg`
   - `feature-users.jpg`
   - `feature-reports.jpg`
   - `feature-notifications.jpg`
   - `feature-automation.jpg`
   - `feature-integrations.jpg`
   - `feature-security.jpg`
     Verificar que cada archivo se descargó correctamente (no es una página de error HTML) antes de continuar.
3. En `src/pages/IndexPage.vue`, añadir los 7 `import` de las imágenes locales y sustituir `heroImageUrl` (línea 67) y la función `featureImageUrl` (líneas 69–71) por un mapeo directo `key → imagen importada`, eliminando toda referencia a `picsum.photos`.
4. Arrancar `quasar dev`, abrir la página Home y comprobar visualmente que la cabecera y las 6 tarjetas muestran las fotografías nuevas, sin iconos de error y sin romper el layout/ratios existentes.

---

## Acceptance criteria

- [ ] `src/assets/images/home/` contiene exactamente 7 archivos `.jpg`, uno por cada nombre listado en el plan de implementación.
- [ ] `IndexPage.vue` no contiene ninguna referencia a `picsum.photos`.
- [ ] La cabecera de Home muestra una fotografía relacionada con gestión de activos/vehículos/equipamiento (no una foto de oficina genérica ni un placeholder).
- [ ] Cada una de las 6 tarjetas de características muestra una fotografía cuyo contenido visual se corresponde razonablemente con el título de esa tarjeta (una persona no familiarizada con el código debe poder asociar imagen ↔ título con solo mirarlas).
- [ ] Ningún `q-img` de la página Home muestra el estado de error (icono gris) en carga normal.
- [ ] Los textos, iconos, orden de tarjetas y ratios de imagen (2.5 cabecera, 1.5 tarjetas) permanecen exactamente igual que antes del cambio.

---

## Decisions

- **Yes:** imágenes reales descargadas a `src/assets/images/home/` e importadas como módulos ES. Evita depender de un servicio externo en cada carga de página y da estabilidad/control total sobre el contenido visual.
- **No:** seguir con picsum.photos u otro servicio de hotlinking por palabra clave. No garantiza relevancia temática real y añade una dependencia de red en producción.
- **No:** generar las imágenes con IA. Se prioriza banco de imágenes real por rapidez y porque Unsplash ya cubre bien estos temas genéricos (personas, gráficos, candados, etc.).
- **Yes:** cabecera temática de gestión de activos (vehículos/equipamiento) en vez de bienvenida corporativa genérica, para conectar visualmente con el propósito real de la app descrito en `CLAUDE.md`, aunque el texto de bienvenida sea neutro.
- **No:** tocar títulos/descripciones/alcance de las 6 features. Son contenido genérico de SaaS que no encaja con "gestión de activos", pero cambiarlo es una decisión de negocio distinta que merece su propia spec si se decide abordar.
- **Yes:** formato JPG con nombres descriptivos por tema, en lugar de WebP. Prioriza compatibilidad y simplicidad sobre peso mínimo para este alcance acotado.
- **Yes:** ubicación `src/assets/images/home/` (procesado por Vite, importado como módulo) en lugar de `public/images/home/`, siguiendo la convención habitual de proyectos Vite/Quasar (hash de cache-busting automático).

---

## What is **not** in this spec

- Cambiar títulos, descripciones o el conjunto de funcionalidades mostradas en Home.
- Optimización de imágenes (responsive, WebP/AVIF, lazy loading).
- Cualquier imagen fuera de la cabecera y las 6 tarjetas de características de Home.

Cada uno de esos puntos, si se aborda, va en su propia spec.
