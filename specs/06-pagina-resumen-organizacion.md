# SPEC 06 — Página de resumen de Organización con tarjetas de acceso

> **Status:** Implementado
> **Depends on:** SPEC 02 (pantallas de Departamentos, Delegaciones, Almacenes y Ubicaciones y grupo "Organización" de `MainLayout.vue`), SPEC 05 (pantalla "Informe de organización")
> **Date:** 2026-10-14
> **Objective:** Crear una página `/admin/organizacion` que muestre, a modo de tarjetas, los enlaces a las cinco pantallas que cuelgan del grupo "Organización" del menú, ocultando las que el usuario no puede ver.

---

## Scope

**In:**

- Nueva página `src/pages/admin/OrganizationHubPage.vue`, ruta `admin/organizacion`, con una rejilla responsive de tarjetas (`GlassCard`, dentro de `AdminPageWrapper`).
- Cinco tarjetas, definidas en un array local de la propia página (ruta, icono, permiso, claves i18n):
  - Departamentos → `/admin/departamentos` (`catalogos.ver`, icono `account_tree`).
  - Delegaciones → `/admin/delegaciones` (`delegaciones.ver`, icono `business`).
  - Almacenes → `/admin/almacenes` (`catalogos.ver`, icono `warehouse`).
  - Ubicaciones → `/admin/ubicaciones` (`catalogos.ver`, icono `place`).
  - Informe de organización → `/admin/informes/organizacion` (los tres permisos `usuarios.ver`, `delegaciones.ver` y `catalogos.ver` a la vez, como en el menú).
- Contenido de cada tarjeta: icono, título y descripción corta. Toda la tarjeta es el enlace (`router-link` / `clickable` con `to`). Sin llamadas a la API ni contadores.
- Tarjetas sin permiso: se ocultan (misma lógica de permisos que el menú, con `auth.hasPermission`). Si no queda ninguna visible, la página muestra un aviso de "sin acceso" en lugar de la rejilla vacía.
- Ruta `admin/organizacion` registrada en `routes.ts` con `meta: { requiresAuth: true }` y **sin** `requiresPermission` (el guard solo admite un permiso); el filtrado por permisos lo hace la página.
- Nuevo ítem "Resumen" como **primer** ítem del grupo "Organización" de `MainLayout.vue` (icono `dashboard`), visible cuando el grupo es visible (`hasOrganizationAccess`). La lista `organizationPaths` incluye la ruta nueva para que el grupo se abra por defecto en ella.
- Textos nuevos (título, subtítulo, título y descripción de cada tarjeta, aviso de sin acceso, ítem de menú) en `src/i18n/es/index.ts` y `src/i18n/en-US/index.ts`.
- Estilo según `notas-jcn/guia-estilo-visual-corestarter.md` (glassmorphism, paleta teal / blue-grey, tipografía Outfit+Roboto), con estados hover/focus visibles y modo claro y oscuro.

**Out of scope (for future specs):**

- Contadores de registros u otros datos en las tarjetas (implicaría peticiones a la API y estados de carga/403 por tarjeta).
- Acceso desde la Home (`IndexPage.vue`).
- Configuración compartida de navegación (array común para menú y hub) y refactor de `MainLayout.vue` para leerla.
- Ampliar el guard del router a una lista de permisos (OR) o tocar `router/index.ts`.
- Hacer clicable la cabecera del grupo "Organización" del menú.
- Tarjetas para otros grupos del menú (Administración, Configuración, Actividad).
- Mostrar tarjetas deshabilitadas para las pantallas sin permiso.
- Cambios en las pantallas de destino.

---

## Data model

Esta feature no introduce datos persistentes ni endpoints nuevos. Solo una estructura local en la página:

```ts
interface OrgHubCard {
  key: string; // 'departamentos' | 'delegaciones' | 'almacenes' | 'ubicaciones' | 'informe'
  to: string; // ruta de destino
  icon: string; // icono Material
  titleKey: string; // clave i18n del título
  descriptionKey: string; // clave i18n de la descripción
  visible: () => boolean; // evalúa auth.hasPermission(...) según la tarjeta
}
```

Convenciones:

- Los permisos de cada tarjeta replican exactamente los `v-if` de los ítems del grupo "Organización" en `MainLayout.vue`; si cambian allí, hay que cambiarlos aquí (duplicación asumida, ver Decisions).
- Claves i18n bajo un bloque nuevo `organizationHub` y `layout.nav.organizationHub` para el ítem de menú.

---

## Implementation plan

1. **i18n.** Añadir en `es` y `en-US` el bloque `organizationHub` (título, subtítulo, título y descripción de las cinco tarjetas, aviso de sin acceso) y `layout.nav.organizationHub` ("Resumen"). Verificación: type-check sin errores.
2. **Página.** Crear `OrganizationHubPage.vue` con el array de tarjetas, filtrado por permisos, rejilla responsive y aviso de sin acceso. Verificación: type-check sin errores.
3. **Ruta.** Registrar `admin/organizacion` en `routes.ts` con `requiresAuth: true`. Verificación manual: abrir `/#/admin/organizacion` y ver las tarjetas; clicar cada una y llegar a su pantalla.
4. **Menú.** Añadir el ítem "Resumen" al principio del grupo "Organización" de `MainLayout.vue` y la ruta a `organizationPaths`. Verificación manual: el ítem aparece y se marca activo en la página nueva; el grupo se abre al recargar en ella.
5. **Pulido visual.** Ajustar estilos según la guía visual (hover, foco por teclado, claro/oscuro, ancho móvil). Verificación visual en los tres escenarios.

---

## Acceptance criteria

- [ ] `/admin/organizacion` muestra una tarjeta por cada una de las cinco pantallas a las que el usuario tiene acceso, cada una con icono, título y descripción.
- [ ] Clicar en cualquier punto de una tarjeta navega a la ruta de destino correspondiente.
- [ ] Un usuario con todos los permisos ve las cinco tarjetas.
- [ ] Un usuario con solo `delegaciones.ver` ve únicamente la tarjeta de Delegaciones.
- [ ] Un usuario con `catalogos.ver` pero sin `delegaciones.ver` ve Departamentos, Almacenes y Ubicaciones, y no ve Delegaciones ni el Informe.
- [ ] La tarjeta del Informe solo aparece con `usuarios.ver`, `delegaciones.ver` y `catalogos.ver` a la vez.
- [ ] Un usuario autenticado sin ninguno de esos permisos que accede por URL ve el aviso de sin acceso y ninguna tarjeta, sin redirección ni error.
- [ ] El ítem "Resumen" es el primero del grupo "Organización", solo aparece cuando el grupo es visible y se marca activo en `/admin/organizacion`.
- [ ] Al recargar en `/admin/organizacion` el grupo "Organización" del menú aparece desplegado.
- [ ] La página no realiza ninguna petición a la API.
- [ ] Las tarjetas son accesibles por teclado (foco visible, Enter activa el enlace).
- [ ] Todos los textos nuevos existen en `es` y `en-US`.
- [ ] La página se ve correctamente en modo claro, oscuro y ancho móvil, sin scroll horizontal de página.
- [ ] `pnpm lint` y el type-check del proyecto pasan sin errores nuevos.

---

## Decisions

- **Yes:** ruta `/admin/organizacion` con ítem "Resumen" al inicio del grupo. Conserva el menú actual y añade el hub sin cambiar el comportamiento del desplegable.
- **No:** convertir la cabecera del grupo en enlace ni sustituir los ítems por un único enlace. Cambia la navegación existente y exige reestructurar el `q-expansion-item`.
- **Yes:** incluir las cinco pantallas actuales, también el Informe de organización. Es lo que hoy cuelga de "Organización".
- **Yes:** tarjeta con icono, título y descripción, sin contadores. Mantiene la página estática y evita peticiones, estados de carga y 403 por tarjeta.
- **No:** contadores por entidad. Se pueden añadir después en otra spec sobre las mismas tarjetas.
- **Yes:** ocultar las tarjetas sin permiso, con la misma lógica que el menú, y aviso de sin acceso si no queda ninguna.
- **No:** tarjetas deshabilitadas. Muestran destinos inaccesibles y no aportan nada.
- **Yes:** ruta sin `requiresPermission` y filtrado en la página. El guard solo admite un permiso y el hub debe abrirse con cualquiera de varios (OR); así no se toca código compartido.
- **No:** ampliar el guard a `requiresAnyPermission`. Es más limpio, pero toca `router/index.ts` y `RouteMeta` para un único caso.
- **Yes:** array local de tarjetas en la página. Mantiene el cambio acotado.
- **No:** configuración compartida entre menú y hub. Evitaría la duplicación de rutas, iconos y permisos, pero obliga a refactorizar `MainLayout.vue`; queda para otra spec si la duplicación molesta.
- **No:** acceso desde la Home. No se ha pedido y tocaría la temática de la SPEC 01.
- **Yes:** el estado se escribe en español (`Borrador`), siguiendo las SPEC 01–05.

---

## Risks

| Risk                                                                                                | Mitigation                                                                                                         |
| --------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------ |
| Menú y hub duplican rutas, iconos y permisos y pueden desincronizarse al añadir o cambiar pantallas | Comentario en el array de tarjetas apuntando al menú; la config compartida queda documentada como spec futura.     |
| Un usuario sin ningún permiso de organización entra por URL y ve una página vacía                   | Aviso de sin acceso explícito (criterio de aceptación).                                                            |
| La ruta no valida permisos en el guard, así que la protección depende solo de la página             | La página no carga datos sensibles; las pantallas de destino siguen protegidas por su propio `requiresPermission`. |
| Ítem "Resumen" con `to` activo por coincidencia de prefijo en otras rutas `admin/organizacion/...`  | No existen subrutas; usar `exact` en el `q-item` si apareciese alguna en el futuro.                                |

---

## What is **not** in this spec

- Contadores o datos de las entidades en las tarjetas.
- Acceso desde la Home.
- Configuración de navegación compartida y refactor de `MainLayout.vue`.
- Ampliación del guard del router a múltiples permisos.
- Cabecera del grupo "Organización" navegable.
- Tarjetas deshabilitadas o para otros grupos del menú.

Cada uno de esos puntos, si se aborda, va en su propia spec.
