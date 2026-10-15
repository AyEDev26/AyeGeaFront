# SPEC 11 — Hub de administración con proveedores, categorías y periodicidades

> **Status:** Aprobado
> **Depends on:** SPEC 06 (página hub `/admin/organizacion`), SPEC 07 (ítem único "Organización" en el menú), SPEC 08 (proveedores), SPEC 09 (periodicidades), SPEC 10 (categorías y subcategorías)
> **Date:** 2026-10-15
> **Objective:** Renombrar el hub de organización a "Administración" e integrar en él proveedores, categorías y periodicidades como tarjetas, retirando esos tres ítems del menú lateral principal.

---

## Scope

**In:**

- **Renombrado del hub** (textos visibles, rutas y nombres internos):
  - `src/pages/admin/OrganizationHubPage.vue` → `src/pages/admin/AdminHubPage.vue`.
  - Claves i18n `admin.organizationHub.*` → `admin.adminHub.*` en `es` y `en-US`. Las claves `admin.organizationReport.*` **no** se tocan.
  - Textos: título "Administración" / "Administration"; subtítulo que cubra estructura y catálogos; mensaje de sin acceso ("…ninguna sección de administración").
- **Ruta** en `src/router/routes.ts`: la ruta del hub pasa a `admin/administracion` (componente `AdminHubPage.vue`, `requiresAuth: true`, sin `requiresPermission`, igual que hoy). Se añade un redirect `admin/organizacion` → `/admin/administracion` para no romper enlaces ni favoritos.
- **Tarjetas del hub** agrupadas en dos secciones con subtítulo:
  - "Estructura de la organización": departamentos, delegaciones, almacenes, ubicaciones, informe de organización (sin cambios de ruta, icono ni permiso).
  - "Catálogos": proveedores (`/admin/proveedores`, icono `local_shipping`), categorías (`/admin/categorias`, icono `category`), periodicidades (`/admin/periodicidades`, icono `schedule`); las tres con permiso `catalogos.ver`. Textos de título y descripción en `es` y `en-US`.
  - Una sección sin tarjetas visibles no se muestra (ni su subtítulo). Si no hay ninguna visible se mantiene el banner "Sin acceso".
- **Menú lateral** (`src/layouts/MainLayout.vue`):
  - Eliminar los ítems sueltos Proveedores, Periodicidades y Categorías.
  - El ítem del hub pasa a `to="/admin/administracion"`, etiqueta "Administración" (`layout.nav.administration`), mismo icono `corporate_fare`.
  - `organizationPaths` / `isOrganizationRoute` / `hasOrganizationAccess` se renombran a `adminHubPaths` / `isAdminHubRoute` / `hasAdminHubAccess`; la lista de rutas que marcan activo el ítem añade `/admin/proveedores`, `/admin/categorias` y `/admin/periodicidades` y sustituye `/admin/organizacion` por `/admin/administracion`.
  - La regla de visibilidad del ítem no cambia (`catalogos.ver` o `delegaciones.ver` o los tres permisos del informe); ya cubre los catálogos.
  - Eliminar la clave `layout.nav.organization` y las de `proveedores`, `periodicidades` y `categorias` de `layout.nav` si dejan de usarse (comprobar con búsqueda antes).

**Out of scope (for future specs):**

- Cambiar permisos, rutas o contenido de las pantallas de proveedores, categorías, periodicidades y de las cinco de organización.
- Renombrar `OrganizationReportPage.vue`, su ruta `/admin/informes/organizacion` o sus claves i18n.
- Mover al hub otros ítems del menú (Usuarios, Roles y permisos, Configuración, Log de actividad).
- Botón "Volver a Administración" en pantallas hijas y breadcrumbs.
- Cambiar la cabecera "Administración" del grupo del menú lateral (coexiste con el ítem del mismo nombre).
- Configuración de navegación compartida entre menú y hub.

---

## Data model

Esta feature no introduce datos ni endpoints nuevos. Solo cambia la estructura de configuración local del hub:

```ts
interface AdminHubCard {
  key: string;
  to: string;
  icon: string;
  titleKey: string;
  descriptionKey: string;
  visible: () => boolean;
}

interface AdminHubSection {
  key: 'estructura' | 'catalogos';
  titleKey: string; // admin.adminHub.sections.<key>
  cards: AdminHubCard[];
}
```

Convenciones:

- `visibleSections` = secciones con al menos una tarjeta visible, con sus tarjetas ya filtradas.
- Rutas, iconos y permisos de las tarjetas replican las rutas del menú/router; si cambian, hay que cambiarlos aquí.

---

## Implementation plan

1. **Renombrado de página e i18n.** Renombrar `OrganizationHubPage.vue` a `AdminHubPage.vue` (con `git mv`), `organizationHub` → `adminHub` en `es` y `en-US`, y actualizar textos. Actualizar `routes.ts` (nueva ruta + redirect desde `admin/organizacion`). Verificación: `/admin/administracion` muestra el hub; `/admin/organizacion` redirige; type-check sin errores.
2. **Secciones y tarjetas nuevas.** Reestructurar la página en `AdminHubSection[]` con dos secciones, añadir las tres tarjetas de catálogos y sus textos i18n. Verificación: con permisos completos se ven 5 + 3 tarjetas bajo sus subtítulos; con solo `catalogos.ver` no aparece "Delegaciones" ni "Informe"; sin permisos, banner "Sin acceso".
3. **Menú lateral.** En `MainLayout.vue`: quitar los tres ítems, actualizar ítem del hub (ruta, etiqueta, activo en las 9 rutas) y renombrar variables. Verificación: el menú no contiene Proveedores, Periodicidades ni Categorías; "Administración" aparece activo en el hub y en las ocho pantallas hijas, y en ninguna otra.
4. **Limpieza.** Eliminar claves i18n huérfanas de `layout.nav` tras comprobar con búsqueda que no se usan. Verificación: type-check y lint sin errores nuevos; búsqueda de `organizationHub`, `OrganizationHubPage` y `admin/organizacion` solo devuelve el redirect.

---

## Acceptance criteria

- [ ] El menú lateral no contiene los ítems Proveedores, Periodicidades ni Categorías.
- [ ] Existe un único ítem "Administración" (icono `corporate_fare`) que navega a `/admin/administracion`.
- [ ] El ítem aparece activo en `/admin/administracion`, `/admin/departamentos`, `/admin/delegaciones`, `/admin/almacenes`, `/admin/ubicaciones`, `/admin/informes/organizacion`, `/admin/proveedores`, `/admin/categorias` y `/admin/periodicidades`, y no en otras rutas.
- [ ] `/admin/organizacion` redirige a `/admin/administracion`.
- [ ] El hub muestra el título "Administración" (es) / "Administration" (en-US) y dos secciones: "Estructura de la organización" y "Catálogos".
- [ ] Las tarjetas Proveedores, Categorías y Periodicidades navegan a sus rutas y solo se ven con `catalogos.ver`.
- [ ] Una sección sin tarjetas visibles no se renderiza; sin ninguna visible se muestra el banner "Sin acceso".
- [ ] No quedan referencias a `OrganizationHubPage`, `admin.organizationHub` ni `layout.nav.organization` en `src/`.
- [ ] `npm run lint` y el type-check no introducen errores nuevos.

---

## Decisions taken and discarded

- **Ruta nueva con redirect** (elegida) frente a mantener `/admin/organizacion` o cambiar sin redirect: coherencia con el nombre sin romper enlaces existentes.
- **Renombrar nombres internos** (elegido) frente a cambiar solo textos: evita que el código siga hablando de "organización" para un hub que ya no lo es. Se exceptúa el informe, que sigue siendo de organización.
- **Dos secciones con subtítulo** (elegida) frente a una rejilla única: el hub mezcla estructura organizativa y catálogos, y agrupar facilita escanear ocho tarjetas.
- **Ítem "Administración" con el icono actual** (elegido) aun coincidiendo con la cabecera del grupo del menú: se prioriza continuidad visual; se podrá revisar en otra spec.
- **Visibilidad del ítem sin cambios**: la regla actual ya incluye `catalogos.ver`, por lo que no hace falta ampliarla.

---

## Identified risks

- **Coincidencia de nombre** entre la cabecera del grupo "Administración" y el ítem "Administración" puede resultar confusa en el menú; mitigación: revisar visualmente tras implementar.
- **Duplicación de rutas/permisos** entre `routes.ts`, el menú y las tarjetas del hub (ya existente); un cambio en uno exige tocar los otros.
- **Enlaces antiguos a `?tab=`** de categorías siguen funcionando porque la ruta de categorías no cambia.
