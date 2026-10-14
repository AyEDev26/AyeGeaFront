# SPEC 07 — Simplificar el menú lateral de Organización

> **Status:** Implementado
> **Depends on:** SPEC 06 (página `/admin/organizacion` con las tarjetas de acceso y el ítem "Resumen" en `MainLayout.vue`)
> **Date:** 2026-10-14
> **Objective:** Sustituir el grupo desplegable "Organización" del menú lateral por un único ítem "Organización" que lleva a la página de resumen y se marca activo también en las cinco pantallas que cuelgan de ella.

---

## Scope

**In:**

- `src/layouts/MainLayout.vue`:
  - Eliminar el `q-expansion-item` "Organización" y sus seis ítems hijos (Resumen, Departamentos, Delegaciones, Almacenes, Ubicaciones, Informe de organización).
  - Añadir un único `q-item` "Organización" (icono `corporate_fare`, `to="/admin/organizacion"`), con las mismas clases `drawer-item` / `drawer-item--active` que el resto de ítems del menú.
  - Visibilidad del ítem: la actual `hasOrganizationAccess` (`catalogos.ver` o `delegaciones.ver` o los tres permisos del informe). La condición del bloque de "Administración" no cambia.
  - Estado activo: el ítem se marca activo en `/admin/organizacion` y en las rutas `/admin/departamentos`, `/admin/delegaciones`, `/admin/almacenes`, `/admin/ubicaciones` y `/admin/informes/organizacion`. Debe reaccionar a la navegación (hoy `isOrganizationRoute` se calcula una sola vez).
  - Eliminar código que deje de usarse tras el cambio (`:default-opened`, y lo que quede sin referencias).
- `src/i18n/es/index.ts` y `src/i18n/en-US/index.ts`: eliminar las claves de `layout.nav` que dejen de usarse (`organizationHub`, `departamentos`, `delegaciones`, `almacenes`, `ubicaciones`, `organizationReport`), tras comprobar que no se usan fuera de `MainLayout.vue`. Se conserva `layout.nav.organization`.

**Out of scope (for future specs):**

- Botón o enlace "Volver a Organización" en las pantallas hijas; el ítem activo del menú es el único vínculo de vuelta al hub.
- Cambios en la página `OrganizationHubPage.vue`, en `routes.ts` o en el guard del router.
- Cambios en los permisos de las rutas hijas o en el filtrado de tarjetas del hub.
- Reordenar o tocar otros ítems del menú (Usuarios, Roles y permisos, Configuración, Log de actividad, Manual de usuario).
- Configuración de navegación compartida entre menú y hub.
- Breadcrumbs.

---

## Data model

Esta feature no introduce datos ni endpoints nuevos. Solo cambia un valor derivado en `MainLayout.vue`:

```ts
// Reactivo a la ruta actual; sustituye al const calculado una sola vez
const isOrganizationRoute = computed(() => organizationPaths.includes(route.path));
```

Convenciones:

- `organizationPaths` conserva `/admin/organizacion` y las cinco rutas hijas.
- La lectura de la ruta actual debe ser reactiva (`useRoute()` o `router.currentRoute`), no una lectura puntual.

---

## Implementation plan

1. **Ítem único y estado activo.** En `MainLayout.vue`, sustituir el `q-expansion-item` por un `q-item` a `/admin/organizacion` con `v-if="hasOrganizationAccess"`, hacer `isOrganizationRoute` computado y enlazarlo con `:active`. Verificación manual: en cada una de las seis rutas el ítem aparece activo; en el resto, no; el menú se abre y navega correctamente.
2. **Limpieza de código.** Eliminar lo que quede sin uso en `MainLayout.vue` (por ejemplo `:default-opened` y variables huérfanas). Verificación: type-check y lint sin errores nuevos.
3. **Limpieza de i18n.** Comprobar con búsqueda que las claves de `layout.nav` listadas no se usan en otro sitio y eliminarlas de `es` y `en-US`. Verificación: type-check y lint sin errores nuevos.

---

## Acceptance criteria

- [ ] El menú lateral no contiene ningún desplegable "Organización" ni los ítems Resumen, Departamentos, Delegaciones, Almacenes, Ubicaciones e Informe de organización.
- [ ] Existe un único ítem "Organización", con el icono `corporate_fare`, que navega a `/admin/organizacion`.
- [ ] El ítem aparece con `catalogos.ver`, con `delegaciones.ver`, o con los tres permisos del informe a la vez; sin ninguno de ellos no aparece.
- [ ] El ítem se marca activo en `/admin/organizacion` y en `/admin/departamentos`, `/admin/delegaciones`, `/admin/almacenes`, `/admin/ubicaciones` y `/admin/informes/organizacion`.
- [ ] El estado activo cambia al navegar entre rutas sin recargar la página (por ejemplo, de Delegaciones a Usuarios deja de estar activo).
- [ ] Desde el hub se sigue llegando a las cinco pantallas por sus tarjetas, y desde cualquiera de ellas se vuelve al hub con el ítem del menú.
- [ ] Los demás ítems del menú y la visibilidad de la sección "Administración" no cambian.
- [ ] No quedan en `es` ni en `en-US` claves de `layout.nav` sin uso de las listadas en el alcance, y `layout.nav.organization` se conserva.
- [ ] El menú se ve correctamente en tema Clásico, tema Claro y ancho móvil.
- [ ] `pnpm lint` y el type-check del proyecto pasan sin errores nuevos.

---

## Decisions

- **Yes:** un único ítem "Organización" sin desplegable. Con los destinos ya como tarjetas, un grupo de un solo hijo no aporta nada.
- **No:** mantener el grupo con solo "Resumen". Conserva la estructura pero deja un desplegable de un único elemento.
- **Yes:** ítem activo en el hub y en las cinco pantallas hijas. Al no tener ítem propio, el menú sigue indicando en qué sección está el usuario.
- **No:** activo solo en `/admin/organizacion`. Las pantallas hijas quedarían sin ninguna indicación en el menú.
- **Yes:** `isOrganizationRoute` pasa a ser computado y reactivo. El actual se lee una vez al montar el layout y no reflejaría la navegación.
- **Yes:** volver al hub solo con el ítem del menú. No se toca ninguna pantalla hija.
- **No:** botón "Volver a Organización" en cada pantalla hija. Toca cinco páginas y amplía el alcance; si hace falta, otra spec.
- **Yes:** visibilidad actual (`hasOrganizationAccess`), coherente con el filtrado de tarjetas del hub de SPEC 06.
- **No:** ítem siempre visible. Mostraría una entrada inútil a usuarios sin ningún permiso de organización.
- **Yes:** eliminar claves i18n huérfanas, previa comprobación de que no se usan fuera de `MainLayout.vue`.
- **Yes:** el estado se escribe en español (`Borrador`), siguiendo las SPEC 01–06.

---

## Risks

| Risk                                                                                        | Mitigation                                                                                                          |
| ------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------- |
| Acceso más lento a las pantallas hijas (un clic más, pasando por el hub)                    | Decisión asumida por el usuario; las URLs directas siguen funcionando.                                              |
| Usuario con permiso de una sola pantalla pasa por un hub con una única tarjeta              | Aceptado; el hub ya lo cubre con el filtrado de tarjetas.                                                           |
| Una futura pantalla de Organización no se marca activa si no se añade a `organizationPaths` | `organizationPaths` queda como lista única en `MainLayout.vue`; añadirla ahí al crear la ruta.                      |
| Quitar claves i18n que sí se usen en otro punto                                             | Búsqueda de usos antes de eliminarlas (paso 3) y type-check.                                                        |
| Las rutas hijas ya no tienen ítem propio y el usuario no sabe cómo volver al hub            | El ítem "Organización" activo es el vínculo de vuelta; si resulta insuficiente, spec futura con botón o breadcrumb. |

---

## What is **not** in this spec

- Botón o breadcrumb de vuelta al hub en las pantallas hijas.
- Cambios en `OrganizationHubPage.vue`, `routes.ts` o el guard del router.
- Cambios en permisos de rutas o del hub.
- Otros ítems del menú.
- Configuración de navegación compartida entre menú y hub.

Cada uno de esos puntos, si se aborda, va en su propia spec.
