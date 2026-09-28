# SPEC 07 — Ajuste de ancho y centrado de LoginPage

> **Status:** Implementado
> **Depends on:** SPEC 01, SPEC 04
> **Date:** 2026-08-30
> **Objective:** Cambiar el ancho del formulario de `LoginPage.vue` de un `max-width` fijo (800px) a un ancho responsivo del 60% del viewport en desktop —con un techo de 400px acorde a los controles que contiene—, centrado también en pantallas anchas/ultrawide.

---

## Por qué existe esta spec

`LoginPage.vue` usa un `GlassCard` con `style="width: 100%; max-width: 800px"`, envuelto en `AdminPageWrapper` (que centra, mediante `flex-center`, la _columna_ que contiene al `GlassCard`, pero no centra el contenido dentro de esa columna). En pantallas anchas/ultrawide, el `max-width: 800px` fijo hace que el formulario se vea pequeño respecto al espacio disponible y, al no tener centrado propio dentro de su columna, se percibe desplazado hacia un lado. Esta spec reemplaza ese ancho fijo por un ancho relativo al viewport (`60vw`) en desktop, con un techo de `400px` para no exceder el ancho legible de los controles que contiene (email, password, botón), añade centrado propio a la tarjeta, y mantiene el comportamiento actual en móvil.

**Nota sobre el techo de 400px:** con el breakpoint actual (768px), `60vw` ya vale 460.8px en el punto exacto donde empieza a aplicarse la regla — es decir, siempre supera el techo de 400px para cualquier viewport donde la regla es activa. En la práctica, `min(60vw, 400px)` se resuelve siempre en `400px` fijo a partir de 768px; el componente `60vw` de la fórmula queda sin efecto visible con los valores actuales, pero se mantiene por consistencia con el patrón ya usado en la spec y como salvaguarda si el breakpoint cambiara en el futuro.

---

## Scope

**In:**

- Cambiar el ancho del `GlassCard` de `src/pages/auth/LoginPage.vue`: de `width: 100%; max-width: 800px` fijo a un ancho responsivo:
  - Por debajo de 768px (breakpoint `sm` de Quasar): `width: 100%` (igual que el comportamiento actual).
  - A partir de 768px: `width: min(60vw, 400px)` — en la práctica, ancho fijo de 400px (ver nota en "Por qué existe esta spec").
- Mantener `margin: 0 auto` en la clase del `GlassCard`, para que quede centrado dentro de su columna (`admin-page-content`) — el `flex-center` de `AdminPageWrapper` centra la columna respecto al viewport, pero no centra el contenido dentro de ella.
- El estilo del `GlassCard` ya vive en una clase CSS scoped (`login-card`) dentro de `LoginPage.vue` desde la versión anterior de esta spec.

**Out of scope (for future specs):**

- Cualquier cambio a `AdminPageWrapper.vue` o `GlassCard.vue` — el centrado adicional necesario se resuelve con `margin: 0 auto` en la propia clase del `GlassCard` dentro de `LoginPage.vue`, sin tocar esos componentes compartidos.
- Aplicar este mismo ancho/breakpoint a otras pantallas de auth (`ForgotPasswordPage.vue`, `ResetPasswordPage.vue`, `TwoFactorPage.vue`). Decisión explícita del usuario: solo `LoginPage.vue` por ahora, aunque esto deja esas pantallas con un ancho visualmente distinto (ver Riesgos).
- Cambios funcionales al formulario de login (validación, envío, redirección post-login, 2FA).
- Breakpoints intermedios adicionales entre móvil y desktop — solo el umbral único de 768px.
- Internacionalización (i18n).

---

## Data model

No aplica — este cambio es puramente de estilo (CSS), no introduce ni modifica ninguna estructura de datos.

---

## Implementation plan

1. En `src/pages/auth/LoginPage.vue`, dentro del bloque `<style scoped>` ya existente, cambiar `width: min(60vw, 800px)` por `width: min(60vw, 400px)` en la regla `@media (min-width: 768px) { .login-card { ... } }`. El resto del bloque (`width: 100%; margin: 0 auto;` por defecto) no cambia. Prueba manual: la pantalla de login carga sin errores visuales evidentes.
2. Verificar con las devtools del navegador, variando el ancho del viewport: por debajo de 768px el formulario ocupa el 100% del ancho disponible de su contenedor (igual que hoy); a partir de 768px el `GlassCard` mide exactamente 400px de ancho, sin importar cuánto crezca el viewport. Prueba manual: cruzar el umbral de 768px y confirmar que el ancho se fija en 400px.
3. Verificar en un viewport ancho (≥1920px, o simulado con devtools) que el formulario mide exactamente 400px de ancho y se ve centrado horizontalmente en la pantalla, sin desplazamiento hacia un lado. Prueba manual: abrir `/#/login` maximizado en un monitor ancho (o devtools a 2560px) y confirmar el ancho fijo y el centrado visual.

---

## Acceptance criteria

- [ ] En viewport ≥768px, el `GlassCard` mide exactamente 400px de ancho (verificable con devtools), en cualquier ancho de viewport probado (768px, 1200px, 1920px, 2560px).
- [ ] En viewport <768px, el `GlassCard` ocupa el 100% del ancho disponible de su contenedor (igual que el comportamiento actual antes de este cambio).
- [ ] En un viewport ancho (≥1920px), el formulario se ve centrado horizontalmente en la pantalla, sin desplazamiento hacia un lado.
- [ ] El resto del comportamiento de `LoginPage.vue` (validación de campos, submit, link "¿Olvidaste tu password?", redirección tras login/2FA) no cambia.
- [ ] Las demás pantallas de auth (`ForgotPasswordPage.vue`, `ResetPasswordPage.vue`, `TwoFactorPage.vue`) no se ven afectadas por este cambio.

---

## Decisions

- **Sí:** usar `60vw` (60% del ancho del viewport) en vez de 60% relativo al contenedor de `AdminPageWrapper`. Decisión explícita del usuario, mantenida de la versión anterior de esta spec.
- **Sí:** reducir el techo de `max-width` de `800px` a `400px` (la mitad), mediante `width: min(60vw, 400px)`, para que el ancho del formulario sea más acorde al contenido de controles (email, password, botón). Decisión explícita del usuario — revierte el valor de `800px` acordado en la versión anterior de esta spec, ya implementada y committeada.
- **Sí:** aplicar el `min(60vw, 400px)` solo a partir de 768px (breakpoint `sm` de Quasar), manteniendo `width: 100%` por debajo. Decisión explícita del usuario — evita un formulario ilegible en móvil.
- **No:** aplicar este cambio a las demás pantallas de auth (`ForgotPasswordPage`, `ResetPasswordPage`, `TwoFactorPage`). Decisión explícita del usuario: alcance limitado a `LoginPage.vue` en esta spec.
- **No:** modificar `AdminPageWrapper.vue` o `GlassCard.vue`. El centrado se resuelve con `margin: 0 auto` en la clase `login-card` dentro de `LoginPage.vue`, sin tocar los componentes compartidos (ver versión anterior de esta spec para el detalle del hallazgo original).

---

## Risks

| Riesgo                                                                                                                                                                                                                                                                                                  | Mitigación                                                                                                                                                          |
| ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Las demás pantallas de auth (`ForgotPasswordPage`, `ResetPasswordPage`, `TwoFactorPage`) mantienen `max-width: 800px` fijo mientras `LoginPage` pasa a `min(60vw, 400px)` (que se resuelve en 400px fijo), generando anchos visualmente muy distintos entre pantallas del mismo flujo de autenticación. | Aceptado como decisión explícita de esta spec (ver Decisiones); si se quiere consistencia visual entre todas las pantallas de auth, se extiende en una spec futura. |

---

## What is **not** in this spec

- Cambios a `AdminPageWrapper.vue` o `GlassCard.vue`.
- Ancho/breakpoint aplicado a otras pantallas de auth distintas de `LoginPage.vue`.
- Cambios funcionales al formulario de login.
- Breakpoints intermedios adicionales.
- Internacionalización de textos.

Cada uno de estos, si se necesita, va en su propio spec.
