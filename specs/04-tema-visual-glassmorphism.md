# SPEC 04 — Tema visual glassmorphism (layout y páginas)

> **Status:** Aprobado
> **Depends on:** SPEC 02 (scaffolding proyecto Quasar).
> **Date:** 2026-08-30
> **Objective:** Aplicar el tema visual glassmorphism corporativo descrito en `notas-jcn/guia-estilo-visual-corestarter.md` a todo el frontend (MainLayout, páginas de auth, páginas admin, IndexPage y ErrorNotFound), extrayendo a componentes y CSS reutilizables el estilo que hoy está duplicado por archivo.

---

## Por qué existe esta spec

SPEC 02 dejó explícitamente fuera de alcance el tema visual de marca, remitiendo a un futuro "spec de layout y tema" que consultara `notas-jcn/guia-estilo-visual-corestarter.md`. Desde entonces, SPEC 01 y SPEC 03 implementaron las páginas de auth y admin, y varias de ellas (LoginPage, TwoFactorPage, ForgotPasswordPage, ResetPasswordPage, UserFormDialog) ya aplicaron partes del estilo de la guía de forma ad-hoc, duplicando el mismo bloque de CSS (`@import` de la fuente, `.glass-card`, shapes flotantes, `.elegant-input`/`.elegant-btn`) en cada archivo. `MainLayout.vue`, `IndexPage.vue`, `ErrorNotFound.vue`, `UsersListPage.vue` y `RolesPermissionsPage.vue` no tienen ese tratamiento o lo tienen solo parcialmente. Esta spec cierra ese hueco: aplica el estilo de forma consistente a todas las páginas y consolida el CSS duplicado en componentes y utilidades compartidas.

---

## Scope

**In:**

- Componentes reutilizables `src/components/common/GlassCard.vue` y `src/components/common/AdminPageWrapper.vue`.
- CSS global de marca en `src/css/app.css`: fondo degradado + 3 shapes flotantes con animación, clases utilitarias `.font-outfit`, `.elegant-input`, `.elegant-btn`, `.elegant-table` (cabecera teal oscuro uppercase), animaciones `.animate__fadeIn`/`.animate__pulse`, y los overrides globales de densidad de la guía (inputs dense a 48px, filas de tabla a 32px, ítems de lista a min-height 32px, pie de tabla a 0.8rem).
- Carga única de la fuente Outfit (pesos 300/400/500/700) vía `<link>` en `index.html`, eliminando los `@import` duplicados por componente.
- `MainLayout.vue`: header `bg-teal` con título en `font-outfit` y badge de versión (`v` + versión de `package.json`); drawer `bg-blue-grey-10` con bloque de perfil del usuario autenticado (avatar con foto o iniciales de color determinista por hash del email, nombre, email, chips de roles); navegación agrupada en secciones "Menu" (Inicio) y "Administración" (Usuarios, Roles y permisos) con encabezados en mayúsculas pequeñas; ítems de navegación en forma de píldora (`border-radius: 0 24px 24px 0`) con estado activo en teal translúcido; botón de cerrar sesión en `text-red-4` al fondo del drawer.
- Refactor de `LoginPage.vue`, `TwoFactorPage.vue`, `ForgotPasswordPage.vue` y `ResetPasswordPage.vue` para eliminar su CSS duplicado y usar `GlassCard`/`AdminPageWrapper` + las clases utilitarias globales, sin cambiar su lógica ni comportamiento.
- `IndexPage.vue` y `ErrorNotFound.vue` envueltas en `AdminPageWrapper`/`GlassCard`, manteniendo su contenido placeholder actual.
- `UsersListPage.vue` y `RolesPermissionsPage.vue` envueltas en `AdminPageWrapper`+`GlassCard`, con títulos `font-outfit` teal, tabla/lista y formularios con las clases de la guía (5.2, 5.3).
- Refactor de `UserFormDialog.vue` para usar `GlassCard` en vez de su propio CSS duplicado, manteniendo su lógica de creación/edición intacta.
- Avatar con iniciales + color determinista por hash de email (guía 5.5), usado en el bloque de perfil del drawer.

**Out of scope:**

- Cualquier cambio de lógica de negocio, validaciones, llamadas a la API o comportamiento funcional — este spec es estrictamente visual y de organización de CSS/componentes.
- Sección "Soporte" en el drawer de navegación — no existe todavía ninguna página para ese grupo.
- Convertir `IndexPage.vue` en un dashboard real — sigue siendo un placeholder mínimo, solo con el tratamiento visual aplicado.
- Tipografía Inter — su uso en la guía es marginal y no se usa actualmente en el proyecto.
- Testing automatizado de estilos visuales (no hay framework de testing en el proyecto, según SPEC 02).
- Modo oscuro / temas alternativos.
- Refactor de stores, router o tipos no relacionado con el estilo visual.

---

## Data model

Este spec no introduce estructuras de datos de dominio. Solo componentes de presentación (`GlassCard`, `AdminPageWrapper`) y CSS/configuración de assets (fuente, clases utilitarias).

---

## Implementation plan

1. Añadir el `<link>` de Google Fonts para Outfit (pesos 300;400;500;700) en `index.html`. Prueba manual: en DevTools → Network, la fuente se carga una sola vez, sin peticiones duplicadas al navegar entre páginas que usan `font-outfit`.
2. Crear `src/css/app.css` con: fondo degradado + 3 shapes flotantes (`@keyframes float`), `.font-outfit`, `.elegant-input`, `.elegant-btn`, `.elegant-table` (con cabecera teal oscuro `#00695c`, texto blanco, uppercase, letter-spacing), overrides globales de densidad (inputs dense 48px, filas de tabla 32px, ítems de lista min-height 32px, pie de tabla 0.8rem), y `.animate__fadeIn`/`.animate__pulse`. Prueba manual: `npm run dev` sigue arrancando sin errores de consola.
3. Crear `src/components/common/GlassCard.vue`: wrapper que renderiza su slot por defecto dentro de un `q-card` con la clase `.glass-card` (fondo blanco 85% + `backdrop-filter: blur(16px) saturate(180%)` + `border-radius: 14px` + sombra larga). Prueba manual: usarlo temporalmente en `IndexPage` y confirmar visualmente la tarjeta translúcida.
4. Crear `src/components/common/AdminPageWrapper.vue`: `q-page` a pantalla completa con el fondo degradado + 3 shapes de `app.css`, contenido centrado con ancho máximo `col-12 col-md-10 col-lg-8` por defecto y prop `wide` para `col-12 col-md-11`, `z-index` correcto sobre las formas decorativas. Prueba manual: usarlo en `IndexPage`, confirmar fondo + shapes visibles y contenido centrado.
5. Migrar `IndexPage.vue` y `ErrorNotFound.vue` para usar `AdminPageWrapper` (y `GlassCard` para su mensaje), sin cambiar su texto actual. Prueba manual: `/` y una ruta inexistente muestran el fondo degradado con tarjeta de vidrio.
6. Refactorizar `MainLayout.vue`: header `bg-teal` con `font-outfit` + badge de versión; drawer `bg-blue-grey-10 text-white` con bloque de perfil (avatar, nombre, email, chips de roles del usuario autenticado vía `useAuthStore`), fondo `bg-blue-grey-9` en el bloque de perfil; navegación agrupada ("Menu", "Administración") con encabezados uppercase pequeños; ítems `.drawer-item` en forma de píldora con estado activo teal translúcido; botón de logout en `text-red-4` separado al fondo. Prueba manual: iniciar sesión y verificar que el header/drawer se ven según la guía, que el ítem de la ruta activa se resalta, y que el perfil muestra los datos reales del usuario logueado.
7. Refactorizar `LoginPage.vue`, `TwoFactorPage.vue`, `ForgotPasswordPage.vue` y `ResetPasswordPage.vue`: eliminar sus bloques `<style scoped>` duplicados (fondo, shapes, glass-card, elegant-input/btn, `@import` de fuente, animaciones) y sustituirlos por `AdminPageWrapper`/`GlassCard` + clases utilitarias globales, sin tocar la lógica de los formularios. Prueba manual: las 4 pantallas se ven igual o más consistentes que antes, sin errores de consola, y siguen funcionando (login, reenvío de 2FA, recuperación y reseteo de password).
8. Refactorizar `UserFormDialog.vue`: sustituir su `q-card` + CSS duplicado por `GlassCard`, manteniendo intacta la lógica de creación/edición de usuario. Prueba manual: abrir "nuevo usuario" y "editar usuario" desde `UsersListPage` y confirmar que se ve como tarjeta de vidrio y que el formulario sigue guardando correctamente.
9. Actualizar `UsersListPage.vue`: envolver en `AdminPageWrapper`+`GlassCard`, título `font-outfit` teal, tabla con `.elegant-table`, botones de fila (editar/eliminar) según la guía (5.1). Prueba manual: la tabla se ve con cabecera teal oscura y filas compactas, y crear/editar/eliminar usuarios sigue funcionando.
10. Actualizar `RolesPermissionsPage.vue`: envolver en `AdminPageWrapper`+`GlassCard`, `q-select` de rol con `.elegant-input`, lista de permisos con estilo consistente sobre el fondo translúcido de la `GlassCard`. Prueba manual: seleccionar un rol, marcar/desmarcar permisos y confirmar que la UI es consistente con el resto de páginas admin y que los cambios se siguen guardando.
11. Ejecutar `npm run lint` y corregir cualquier error introducido por el refactor.
12. Ejecutar `npm run build` y confirmar que genera `dist/spa/index.html` sin errores ni advertencias nuevas relacionadas con los cambios.

---

## Acceptance criteria

- [ ] `index.html` carga la fuente Outfit una sola vez (sin `@import` duplicados en componentes).
- [ ] `src/css/app.css` contiene el fondo degradado, las 3 shapes flotantes, las clases utilitarias (`.font-outfit`, `.elegant-input`, `.elegant-btn`, `.elegant-table`) y los overrides de densidad.
- [ ] Existen `src/components/common/GlassCard.vue` y `src/components/common/AdminPageWrapper.vue`, usados por todas las páginas listadas en el scope.
- [ ] `MainLayout` muestra header `bg-teal` con badge de versión, drawer `bg-blue-grey-10` con bloque de perfil del usuario autenticado (avatar, nombre, email, roles) y navegación agrupada con ítems en forma de píldora.
- [ ] El ítem de navegación de la ruta activa se resalta visualmente.
- [ ] `LoginPage`, `TwoFactorPage`, `ForgotPasswordPage` y `ResetPasswordPage` ya no tienen bloques `<style scoped>` con CSS duplicado de marca, y funcionan igual que antes (login, reenvío 2FA, recuperación y reseteo de password).
- [ ] `IndexPage` y `ErrorNotFound` muestran el fondo degradado + tarjeta de vidrio.
- [ ] `UsersListPage` y `RolesPermissionsPage` están envueltas en `AdminPageWrapper`+`GlassCard`, con títulos `font-outfit` teal y componentes (tabla/inputs) con las clases de la guía.
- [ ] `UserFormDialog` usa `GlassCard` en vez de su propio CSS duplicado.
- [ ] `npm run lint` termina sin errores.
- [ ] `npm run build` genera `dist/spa/index.html` sin errores.
- [ ] Ninguna página cambia su comportamiento funcional (login, 2FA, recuperación/reseteo de password, CRUD de usuarios, gestión de permisos) respecto a antes del refactor visual.

---

## Decisions

- **Sí:** extraer `GlassCard` y `AdminPageWrapper` como componentes reutilizables en `src/components/common/`, y mover el CSS de marca (fondo, shapes, utilidades) a `src/css/app.css`, en vez de perpetuar la duplicación de CSS ya presente en las 4 páginas de auth y en `UserFormDialog`.
- **Sí:** cargar la fuente Outfit una sola vez vía `<link>` en `index.html` en vez de `@import` repetido por componente.
- **Sí:** aplicar el tratamiento visual completo (`AdminPageWrapper`+`GlassCard`+detalle de tabla/formulario) a `UsersListPage` y `RolesPermissionsPage`, no solo fondo/contenedor.
- **Sí:** incluir bloque de perfil de usuario, agrupación de navegación y badge de versión en `MainLayout`, usando los datos ya disponibles en el store de auth (`name`/`email`/`avatarUrl`/`roles`) y en `package.json` (`version`).
- **No:** sección "Soporte" en el drawer — no existe todavía ninguna página para ese grupo.
- **No:** cambios de lógica/comportamiento funcional en ninguna página — este spec es estrictamente visual y de organización de CSS/componentes.
- **No:** tipografía Inter — su uso en la guía es marginal y no se usa actualmente en el proyecto.
- **No:** dashboard real en `IndexPage.vue` — sigue siendo un placeholder mínimo, solo con el tratamiento visual aplicado.
- **No:** modo oscuro / temas alternativos — no está contemplado en la guía de estilo ni se pidió.

---

## Risks

| Riesgo                                                                                                                                                                                                      | Mitigación                                                                                                                                                                                                                 |
| ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| El refactor de las páginas de auth (eliminar sus `<style scoped>` actuales) podría romper visualmente algo que ya funcionaba, al mover el CSS a clases globales que colisionen con otros estilos de Quasar. | Verificar visualmente cada una de las 4 pantallas de auth tras el paso 7 antes de continuar con las páginas admin.                                                                                                         |
| Los overrides globales de densidad en `app.css` (altura de inputs, filas de tabla) afectan a _todos_ los `q-input`/`q-table` del proyecto, no solo a los que llevan clases `.elegant-*`.                    | Revisar tras el paso 2 que ningún componente existente (p. ej. campos de `UserFormDialog`) se rompe visualmente con los nuevos overrides antes de seguir con el resto del plan.                                            |
| El badge de versión leído de `package.json` requiere exponerlo en el bundle — si no está configurado, el build podría fallar o mostrar `undefined`.                                                         | Usar el mecanismo estándar de Vite/Quasar para inyectar la versión (p. ej. `import.meta.env` con `define`, o `resolveJsonModule`); verificar en el paso 6 que el badge muestra la versión real (`v0.0.1`), no `undefined`. |

---

## What is **not** in this spec

- Cambios funcionales/lógicos en cualquier pantalla.
- Sección "Soporte" del drawer.
- Dashboard real en `IndexPage.vue`.
- Tipografía Inter.
- Testing automatizado de estilos.
- Modo oscuro / temas alternativos.

Cada uno de estos, si se necesita, va en su propio spec.
