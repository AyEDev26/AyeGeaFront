# SPEC 12 — Usuarios, roles, configuración y log de actividad en el hub de administración

> **Status:** Implementado
> **Depends on:** SPEC 11 (hub de administración con secciones y `AdminHubPage.vue`, ítem "Administración" y `adminHubPaths` en `MainLayout.vue`). Debe estar implementada y fusionada antes de implementar esta.
> **Date:** 2026-10-15
> **Objective:** Mover Usuarios, Roles y permisos, Configuración y Log de actividad del menú lateral al hub de administración como tarjetas, dejando un único ítem "Administración" sin cabecera de grupo.

---

## Scope

**In:**

- **Hub** (`src/pages/admin/AdminHubPage.vue`): dos secciones nuevas, para un orden final "Usuarios y accesos", "Estructura de la organización", "Catálogos", "Sistema":
  - `accesos` ("Usuarios y accesos"): Usuarios (`/admin/usuarios`, icono `people`, permiso `usuarios.ver`) y Roles y permisos (`/admin/roles`, icono `admin_panel_settings`, permiso `usuarios.ver`).
  - `sistema` ("Sistema"): Configuración (`/admin/configuracion`, icono `tune`, permiso `configuracion.ver`) y Log de actividad (`/admin/actividad`, icono `history`, permiso `actividad.ver`).
  - `AdminHubSection.key` pasa a `'accesos' | 'estructura' | 'catalogos' | 'sistema'`. El comportamiento de secciones vacías y del banner "Sin acceso" no cambia.
- **i18n** (`es` y `en-US`): `admin.adminHub.sections.accesos` / `sistema` y los textos de título y descripción de las cuatro tarjetas en `admin.adminHub.cards.*`. Reutilizar los títulos ya existentes en `layout.nav` (Usuarios, Roles y permisos, Configuración, Log de actividad).
- **Menú lateral** (`src/layouts/MainLayout.vue`):
  - Eliminar los ítems Usuarios, Roles y permisos, Configuración y Log de actividad.
  - Eliminar la cabecera del grupo (`layout.nav.adminSection`) y el `<template v-if>` que envolvía el grupo; el ítem "Administración" queda directamente en el listado principal, tras Inicio y Manual de usuario.
  - `hasAdminHubAccess` añade `usuarios.ver`, `configuracion.ver` y `actividad.ver` a su condición actual.
  - `adminHubPaths` añade `/admin/usuarios`, `/admin/roles`, `/admin/configuracion` y `/admin/actividad`.
  - Eliminar de `layout.nav` las claves que dejen de usarse (`adminSection`, `users`, `rolesPermissions`, `businessConfig`, `activityLog`), tras comprobar con búsqueda que no se usan fuera de `MainLayout.vue`.

**Out of scope (for future specs):**

- Cambiar permisos, rutas, contenido o aspecto de las pantallas de usuarios, roles, configuración y actividad.
- Mover Inicio o el Manual de usuario.
- Botón "Volver a Administración" en pantallas hijas y breadcrumbs.
- Configuración de navegación compartida entre menú, hub y router.
- Cambiar el icono o el nombre del ítem "Administración".

---

## Data model

Esta feature no introduce datos ni endpoints nuevos. Solo amplía la configuración local del hub definida en SPEC 11:

```ts
interface AdminHubSection {
  key: 'accesos' | 'estructura' | 'catalogos' | 'sistema';
  titleKey: string; // admin.adminHub.sections.<key>
  cards: AdminHubCard[];
}
```

Convenciones:

- El orden del array `sections` determina el orden visual.
- Rutas, iconos y permisos de las tarjetas replican los de `routes.ts` y los ítems de menú retirados.

---

## Implementation plan

1. **Tarjetas y secciones en el hub.** Añadir las secciones `accesos` y `sistema` con sus cuatro tarjetas en `AdminHubPage.vue` y los textos i18n en `es` y `en-US`. Verificación: con todos los permisos se ven 4 secciones en el orden indicado; con solo `configuracion.ver`, aparece solo "Sistema" con Configuración; sin ningún permiso, banner "Sin acceso".
2. **Menú lateral.** En `MainLayout.vue`: quitar los cuatro ítems y la cabecera/envoltorio del grupo, ampliar `hasAdminHubAccess` y `adminHubPaths`. Verificación: el menú contiene solo Inicio, Manual de usuario y Administración (más cierre de sesión); el ítem aparece activo en las 13 rutas del hub y sus hijas, y en ninguna otra; un usuario con solo `actividad.ver` sigue viendo el ítem.
3. **Limpieza de i18n.** Eliminar las claves huérfanas de `layout.nav` tras comprobar que no se usan en otro sitio. Verificación: `vue-tsc` y `eslint src` sin errores nuevos; búsqueda de las claves eliminadas sin resultados.

---

## Acceptance criteria

- [ ] El menú lateral no contiene los ítems Usuarios, Roles y permisos, Configuración ni Log de actividad, ni la cabecera "Administración" del grupo.
- [ ] El menú contiene un único ítem "Administración" que navega a `/admin/administracion`.
- [ ] El ítem aparece si el usuario tiene al menos uno de: `usuarios.ver`, `configuracion.ver`, `actividad.ver`, `catalogos.ver`, `delegaciones.ver` o los tres permisos del informe.
- [ ] El ítem aparece activo en `/admin/administracion`, `/admin/usuarios`, `/admin/roles`, `/admin/departamentos`, `/admin/delegaciones`, `/admin/almacenes`, `/admin/ubicaciones`, `/admin/informes/organizacion`, `/admin/proveedores`, `/admin/categorias`, `/admin/periodicidades`, `/admin/configuracion` y `/admin/actividad`, y no en otras rutas.
- [ ] El hub muestra las secciones "Usuarios y accesos", "Estructura de la organización", "Catálogos" y "Sistema" en ese orden, cada una con sus tarjetas y navegando a su ruta.
- [ ] Cada tarjeta nueva solo se ve con su permiso (`usuarios.ver` para Usuarios y Roles; `configuracion.ver`; `actividad.ver`).
- [ ] Una sección sin tarjetas visibles no se renderiza; sin ninguna visible se muestra el banner "Sin acceso".
- [ ] Los textos existen en `es` y `en-US`.
- [ ] No quedan en `src/` referencias a las claves `layout.nav` eliminadas.
- [ ] `vue-tsc` y `eslint src` no introducen errores nuevos.

---

## Decisions taken and discarded

- **Dos secciones nuevas** (elegida) frente a una sola "Sistema" o repartir en las existentes: separa identidad/accesos de ajustes del sistema sin mezclar con estructura ni catálogos.
- **Quitar la cabecera del grupo** (elegida) frente a mantenerla: con un único ítem, la cabecera "Administración" sobre un ítem "Administración" es redundante.
- **Ampliar la visibilidad del ítem** (elegida): sin ello, un usuario con solo `usuarios.ver`, `configuracion.ver` o `actividad.ver` perdería el acceso, al no existir ya su ítem.
- **Marcar activo el ítem en las cuatro rutas** (elegida), coherente con SPEC 07 y SPEC 11.
- **Esta spec depende de SPEC 11** y no se mezcla con ella para mantener cada cambio revisable por separado.

---

## Identified risks

- **Navegación más profunda:** Usuarios y Roles pasan de un clic a dos (menú → hub → pantalla). Se asume aceptable; se puede revisar con accesos directos en otra spec.
- **Duplicación de rutas/permisos** entre `routes.ts`, el menú (`adminHubPaths`, `hasAdminHubAccess`) y las tarjetas; un cambio exige tocar los tres.
- **Dependencia de SPEC 11:** si no está fusionada, `AdminHubPage.vue` y `adminHubPaths` no existen en `main`.
