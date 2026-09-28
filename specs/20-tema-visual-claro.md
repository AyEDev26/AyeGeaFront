# SPEC 20 — Segundo tema visual "Claro" (dashboard SaaS) con selector

> **Status:** Implementado
> **Depends on:** SPEC 04 (tema visual glassmorphism).
> **Date:** 2026-09-07
> **Objective:** Añadir un segundo tema visual "Claro" (estilo dashboard SaaS plano: sidebar navy con acento dorado, topbar blanco, tarjetas opacas, tabla con cabecera gris clara), inspirado en una referencia visual de Dribbble, seleccionable desde el drawer sin perder el tema "Clásico" (glassmorphism) actual.

---

## Por qué existe esta spec

SPEC 04 dejó fijado un único tema visual (glassmorphism corporativo: fondo degradado con shapes flotantes, tarjetas translúcidas con blur, cabecera de tabla en bloque sólido teal oscuro) aplicado a todas las páginas. Esta spec no sustituye ese trabajo: añade una alternativa visual "Claro" (fondo plano, sidebar navy oscuro con acento dorado/ámbar en el ítem activo, topbar blanco, tarjetas blancas opacas con sombra suave, cabecera de tabla gris clara con texto oscuro) inspirada en una referencia de un dashboard SaaS, y un mecanismo para que el usuario elija entre ambos temas. El tema Clásico sigue siendo el predeterminado; nada de lo construido en SPEC 04 se elimina, solo se hace condicional a un atributo de tema. Esta spec es independiente de cualquier otro borrador de tema visual que pueda existir en `specs/`.

---

## Scope

**In:**

- Nuevo store Pinia `src/stores/theme-store.ts` que gestiona el tema visual activo (`'classic'` | `'claro'`), persistido en `localStorage` bajo la clave `hac-visual-theme`.
- Boot file `src/boot/theme.ts` (registrado en `quasar.config.ts`) que aplica la preferencia guardada como atributo `data-theme` en `document.documentElement` antes del primer render, evitando parpadeo entre temas al recargar.
- Selector de tema en `MainLayout.vue`, ubicado en el drawer junto al bloque de perfil de usuario (control con dos opciones "Clásico"/"Claro"), que cambia el tema al instante sin recargar la página.
- Extracción a `src/css/app.css` (global, sin `scoped`) de los estilos de `MainLayout.vue` que hoy están en su bloque `<style scoped>` (`.profile-block`, `.drawer-section-header`, `.drawer-item`, `.drawer-item--active`), y sustitución de las clases fijas `bg-teal` (header) y `bg-blue-grey-10` (drawer) por clases propias `.app-header`/`.app-drawer`, todas definidas en `app.css` con el aspecto actual del tema Clásico como caso base.
- Definición completa del tema "Claro" en `src/css/app.css` mediante overrides bajo el selector `[data-theme="claro"]`:
  - Fondo de página plano gris-azulado, sin gradiente radial ni las 3 shapes flotantes con blur del tema Clásico (ocultas en este tema).
  - `.glass-card` (y por tanto el componente `GlassCard.vue`, sin cambios de lógica) pasa a fondo blanco opaco, sin `backdrop-filter`, `border-radius` mayor (más redondeado) y sombra suave, en vez de la tarjeta translúcida con blur del tema Clásico.
  - `.app-header`: fondo blanco, texto/iconos en tono oscuro (navy), con una sombra inferior sutil en vez del `bg-teal`.
  - `.app-drawer`: fondo navy oscuro (en vez de `bg-blue-grey-10`); el bloque de perfil (`.profile-block`) usa un panel navy ligeramente más claro.
  - `.drawer-item--active`: acento dorado/ámbar (fondo dorado translúcido + texto/icono dorado) en vez del acento teal del tema Clásico. Este acento dorado se usa **únicamente** para este resaltado del ítem de navegación activo — no se introduce en botones, chips ni ningún otro color funcional.
  - Cabecera de `.elegant-table` con fondo **gris claro** y texto oscuro (uppercase, letter-spacing), reemplazando el bloque sólido de color con texto blanco del tema Clásico — fiel a la referencia visual.
  - `.elegant-input`/`.elegant-btn` ajustados a la paleta plana del tema Claro (bordes/esquinas, sin fondos translúcidos con blur).
- Todas las páginas ya cubiertas por SPEC 04 (`LoginPage`, `TwoFactorPage`, `ForgotPasswordPage`, `ResetPasswordPage`, `IndexPage`, `ErrorNotFound`, `UsersListPage`, `RolesPermissionsPage`, `UserFormDialog`) deben verse correctamente en ambos temas sin cambios de lógica.
- Tipografía: se mantiene Outfit para títulos/marca en ambos temas (sin cargar fuentes adicionales).
- Colores funcionales (botón primario azul Quasar, `negative`/`positive`, chips de roles `indigo`, badges de auditoría, botón de logout `text-red-4`, etc.) se mantienen idénticos en ambos temas — solo cambian los colores de marca/estructura (fondo, header, drawer, tarjetas, tabla) y el acento dorado exclusivo del ítem de navegación activo.

**Out of scope (para specs futuras):**

- Selectores tipo pill de contexto de negocio en el topbar (p. ej. los que aparecen en la referencia visual) — HomeAyeCore no tiene hoy ese tipo de dato de contexto; el topbar del tema Claro replica solo su aspecto (blanco, breadcrumb/título, badge de versión), sin esos controles.
- Persistir la preferencia de tema en el backend/perfil de usuario vía API — queda en `localStorage`, por dispositivo/navegador.
- Modo oscuro real (distinto de "Claro") — el tema Claro es un segundo tema claro/plano, no un dark mode.
- Página de preferencias de usuario dedicada — el selector vive únicamente en el drawer.
- Adaptar la paleta de colores funcionales (primary/negative/positive/indigo) al tema Claro — se mantienen los mismos en ambos temas.
- Cambiar la tipografía del tema Claro — se mantiene Outfit.
- Sección "Soporte" del drawer — sigue fuera de alcance como en SPEC 04.
- Testing automatizado de estilos visuales (no hay framework de testing en el proyecto, según SPEC 02).
- Reconciliación con cualquier otro borrador de tema visual (`Draft`) que pudiera existir en `specs/` — se gestiona por separado, fuera de esta spec.

---

## Data model

Este spec no introduce datos de dominio. Introduce un pequeño estado de preferencia de UI persistido en `localStorage`:

```ts
// src/stores/theme-store.ts
type VisualTheme = 'classic' | 'claro';

const THEME_STORAGE_KEY = 'hac-visual-theme'; // localStorage

// state
{
  theme: VisualTheme; // por defecto 'classic' si no hay valor guardado
}
```

`theme` se refleja siempre como atributo `data-theme="classic"` o `data-theme="claro"` en `document.documentElement`, que es lo que consulta el CSS de `app.css` para aplicar los overrides del tema Claro.

---

## Implementation plan

1. Crear `src/stores/theme-store.ts`: estado `theme: VisualTheme` inicializado leyendo `localStorage.getItem('hac-visual-theme')` (fallback `'classic'` si no existe o el valor no es válido), acción `setTheme(theme: VisualTheme)` que actualiza el estado, aplica `document.documentElement.dataset.theme = theme` y guarda en `localStorage`. Prueba manual: desde la consola del navegador, `useThemeStore().setTheme('claro')` cambia el atributo `data-theme` del `<html>`.
2. Crear boot file `src/boot/theme.ts` y registrarlo en `quasar.config.ts` (`boot: ['axios', 'i18n', 'theme']`): al arrancar, lee la preferencia guardada en `localStorage` y aplica `data-theme` en `document.documentElement` antes de montar la app. Prueba manual: con `hac-visual-theme=claro` guardado, recargar la página no muestra parpadeo del tema Clásico antes de aplicarse Claro.
3. Mover a `src/css/app.css` (global) el contenido del bloque `<style scoped>` de `MainLayout.vue` (`.profile-block`, `.drawer-section-header`, `.drawer-item`, `.drawer-item--active`), y sustituir en el template de `MainLayout.vue` las clases `bg-teal` (header) y `bg-blue-grey-10` (drawer) por `.app-header`/`.app-drawer` nuevas, definidas en `app.css` reproduciendo exactamente el aspecto actual (Clásico) como caso base. Prueba manual: con el tema Clásico activo (por defecto, sin `data-theme` o `data-theme="classic"`), el header, el drawer, el bloque de perfil y los ítems de navegación se ven exactamente igual que antes de este cambio.
4. Añadir en `app.css` el bloque de overrides `[data-theme="claro"]`: ocultar las 3 shapes flotantes y el gradiente radial de fondo (sustituidos por un fondo plano gris-azulado); `.glass-card` sin `backdrop-filter`, fondo blanco opaco y `border-radius` mayor; `.app-header` blanco con texto navy oscuro y sombra inferior sutil; `.app-drawer` navy oscuro con `.profile-block` en un panel navy algo más claro; `.drawer-item--active` con acento dorado/ámbar (fondo y texto/icono); `.elegant-table thead tr th` con fondo gris claro y texto oscuro (en vez del bloque sólido teal); ajustes de `.elegant-input`/`.elegant-btn`. Prueba manual: alternar manualmente el atributo `data-theme` en DevTools sobre `<html>` y confirmar visualmente los cambios de header/drawer/tarjetas/tabla descritos.
5. Confirmar en `AdminPageWrapper.vue` que las shapes decorativas quedan ocultas en tema Claro vía el CSS del paso 4, sin necesidad de lógica adicional en el componente. Prueba manual: navegar a `/` con tema Claro activo y confirmar fondo plano sin shapes ni blur, con la `GlassCard` en su variante opaca.
6. Añadir el selector de tema en `MainLayout.vue`, en el drawer junto al bloque de perfil de usuario: control con las opciones "Clásico"/"Claro" que llama a `themeStore.setTheme(...)`. Prueba manual: cambiar el selector alterna visualmente header/drawer/contenido sin recargar; recargar la página conserva el tema elegido.
7. Recorrer visualmente, con ambos temas, las páginas ya cubiertas por SPEC 04: `LoginPage`, `TwoFactorPage`, `ForgotPasswordPage`, `ResetPasswordPage`, `IndexPage`, `ErrorNotFound`, `UsersListPage`, `RolesPermissionsPage`, `UserFormDialog`. Prueba manual: ninguna pantalla muestra solapes, contraste roto o texto ilegible en ninguno de los dos temas, y el comportamiento funcional (login, 2FA, recuperación/reset password, CRUD de usuarios, gestión de permisos) es idéntico al de antes de esta spec.
8. Ejecutar `npm run lint` y corregir cualquier error introducido.
9. Ejecutar `npm run build` y confirmar que genera `dist/spa/index.html` sin errores ni advertencias nuevas relacionadas con los cambios.

---

## Acceptance criteria

- [ ] Existe `src/stores/theme-store.ts` con estado `theme: 'classic' | 'claro'`, persistido en `localStorage` bajo la clave `hac-visual-theme`.
- [ ] `src/boot/theme.ts` está registrado en `quasar.config.ts` y aplica la preferencia guardada como `data-theme` en `<html>` antes del primer render (sin parpadeo visible al recargar con Claro activo).
- [ ] El drawer de `MainLayout.vue` muestra un selector con las opciones "Clásico"/"Claro" que cambia el tema activo al instante, sin recargar la página.
- [ ] Recargar la página tras elegir "Claro" conserva ese tema (lee `localStorage`).
- [ ] Con el tema Clásico activo, todas las páginas (incluyendo header, drawer, perfil e ítem de navegación activo) se ven igual que antes de esta spec (sin regresión visual).
- [ ] Con el tema Claro activo: fondo plano gris-azulado sin shapes flotantes ni blur; `GlassCard` en variante opaca con esquinas muy redondeadas y sombra suave; header blanco con texto oscuro; drawer navy oscuro con ítem de navegación activo en acento dorado/ámbar; cabecera de `.elegant-table` en gris claro con texto oscuro (no bloque sólido de color).
- [ ] `LoginPage`, `TwoFactorPage`, `ForgotPasswordPage`, `ResetPasswordPage`, `IndexPage`, `ErrorNotFound`, `UsersListPage`, `RolesPermissionsPage` y `UserFormDialog` se ven correctamente en ambos temas.
- [ ] Los colores funcionales (botón primario, negative, positive, chips de roles indigo, botón de logout) son idénticos en ambos temas; el acento dorado solo aparece en el ítem de navegación activo del drawer en tema Claro.
- [ ] Ninguna página cambia su comportamiento funcional (login, 2FA, recuperación/reseteo de password, CRUD de usuarios, gestión de permisos) respecto a antes de esta spec.
- [ ] `npm run lint` termina sin errores.
- [ ] `npm run build` genera `dist/spa/index.html` sin errores.

---

## Decisions

- **Sí:** implementar el cambio de tema con un atributo `data-theme` en `document.documentElement` + variables/overrides CSS en `app.css`, en vez de duplicar componentes (`GlassCard`/`AdminPageWrapper` siguen siendo los mismos componentes en ambos temas). Más mantenible y evita duplicación de lógica.
- **Sí:** mover los estilos de header/drawer/perfil/navegación de `MainLayout.vue` de `<style scoped>` a `app.css` (global), para que las reglas `[data-theme="claro"]` puedan alcanzarlos de forma fiable sin pelear con la especificidad del scoping de Vue.
- **Sí:** persistencia en `localStorage` (clave `hac-visual-theme`), no en el backend — no requiere cambios de API y cubre el caso de uso (preferencia por dispositivo).
- **Sí:** tema Clásico (glassmorphism) como predeterminado para usuarios sin preferencia guardada — no cambia la experiencia por defecto de usuarios existentes.
- **Sí:** mismo alcance de páginas que SPEC 04 — evita que el nuevo tema quede incompleto o inconsistente en algunas pantallas.
- **Sí:** nombre "Claro" para el nuevo tema (frente a "Moderno", "Corporativo" u otras alternativas) — decisión explícita del usuario.
- **Sí:** acento dorado/ámbar reservado exclusivamente al resaltado del ítem de navegación activo del drawer en tema Claro, replicando la referencia visual, sin tocar botones, chips ni otros colores funcionales.
- **Sí:** cabecera de `.elegant-table` en tema Claro con fondo gris claro y texto oscuro (no bloque sólido de color) — fiel a la referencia visual, aunque difiere del criterio usado en el tema Clásico.
- **No:** selectores de contexto tipo pill en el topbar (los que aparecen en la referencia) — no existe ese dato/contexto en HomeAyeCore hoy; se replica solo el aspecto visual del topbar (blanco, breadcrumb/título, badge de versión).
- **No:** persistencia en backend vía API — fuera de alcance, posible spec futura si se necesita sincronización entre dispositivos.
- **No:** página de preferencias de usuario dedicada — el selector vive en el drawer, más simple y accesible.
- **No:** dark mode real — el tema Claro es un segundo tema claro, no una inversión de contraste.
- **No:** adaptar los colores funcionales a la paleta Claro — mantenerlos simplifica la implementación y evita inconsistencias de significado (rojo = borrar, etc.) entre temas.
- **No:** reconciliación con cualquier otro borrador de tema visual existente en `specs/` — queda fuera de esta spec, es una decisión aparte del usuario.

---

## Risks

| Riesgo                                                                                                                                                                                                                                                                                                                    | Mitigación                                                                                                                                                        |
| ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Mover los estilos de `MainLayout.vue` de `<style scoped>` a `app.css` (global) podría romper visualmente el tema Clásico si las reglas movidas colisionan con otras clases globales o pierden especificidad.                                                                                                              | Verificar visualmente el tema Clásico completo (header, drawer, item activo, perfil) inmediatamente después del paso 3, antes de continuar con el resto del plan. |
| Los overrides `[data-theme="claro"]` en `app.css` afectan a clases globales (`.glass-card`, `.elegant-table`, `.elegant-input`, `.elegant-btn`, `.app-header`, `.app-drawer`, `.drawer-item--active`) usadas en todas las páginas — un selector demasiado amplio o mal delimitado podría filtrar estilos al tema Clásico. | Revisar tras el paso 4 que, con `data-theme="classic"` (o sin el atributo), ninguna página cambia de aspecto respecto a antes de esta spec.                       |
| El boot file que aplica `data-theme` antes del render podría no ejecutarse a tiempo y causar un parpadeo (FOUC) del tema Clásico antes de aplicarse Claro en la recarga.                                                                                                                                                  | Verificar explícitamente en el paso 2, con throttling de red en DevTools, que no hay parpadeo perceptible.                                                        |
| El acento dorado/ámbar sobre fondo navy podría no dar suficiente contraste de texto (accesibilidad) si el tono elegido es demasiado claro u oscuro.                                                                                                                                                                       | Verificar visualmente en el paso 4 que el texto del ítem activo es legible sobre el fondo dorado translúcido y el navy del drawer.                                |

---

## What is **not** in this spec

- Selectores de contexto tipo pill en el topbar.
- Persistencia de la preferencia de tema en backend/API.
- Modo oscuro real.
- Página de preferencias de usuario dedicada.
- Paleta de colores funcionales distinta para el tema Claro.
- Tipografía distinta para el tema Claro.
- Sección "Soporte" del drawer.
- Testing automatizado de estilos visuales.
- Reconciliación con otros borradores de tema visual existentes en `specs/`.

Cada uno de estos, si se necesita, va en su propio spec.
