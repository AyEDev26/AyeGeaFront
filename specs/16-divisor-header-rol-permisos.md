# SPEC 16 — Línea divisoria bajo el selector de rol en /admin/roles

> **Status:** Aprobado
> **Depends on:** SPEC 03, SPEC 12
> **Date:** 2026-09-04
> **Objective:** Añadir una línea divisoria (`q-separator` con acento teal) debajo del selector de rol en `RolesPermissionsPage.vue`, separando visualmente el bloque de título+selector del contenido de permisos.

---

## Por qué existe esta spec

SPEC 12 reorganizó el checklist de permisos de `/admin/roles` en secciones expandibles por grupo, pero el bloque superior (título "Roles y permisos" + `q-select` de rol) no tiene ninguna separación visual del contenido que sigue (la lista de grupos de permisos, o el mensaje de selección vacía). Esta spec agrega esa separación.

---

## Scope

**In:**

- Un `q-separator` con color `teal-4` (acento teal claro, ya usado en la guía de estilo para estados activos/acentos — ver `notas-jcn/guia-estilo-visual-corestarter.md`) añadido en `RolesPermissionsPage.vue`, inmediatamente después del `q-select` de rol y antes del bloque condicional que muestra la lista de grupos de permisos o el mensaje de selección vacía.
- El separador es **siempre visible**, exista o no un rol seleccionado — no lleva ningún `v-if` condicionado a `selectedRole`.

**Out of scope (for future specs):**

- Cualquier línea divisoria adicional entre los headers de cada `q-expansion-item` de grupo y sus permisos — esta spec solo toca el separador único bajo el título+selector, no el interior de cada grupo.
- Cambios al comportamiento funcional de `RolesPermissionsPage.vue` (selección de rol, checkboxes, guardado) — puramente visual.
- Cambios a `BusinessConfigPage.vue` u otras pantallas que ya usan `q-separator` — no se toca ningún otro archivo.

---

## Data model

No aplica — esta spec no introduce ni modifica ninguna estructura de datos, store, ni payload. Es un cambio puramente de template/estilo en un único componente.

---

## Implementation plan

1. En `src/pages/admin/RolesPermissionsPage.vue`, añadir `<q-separator color="teal-4" class="q-my-md" />` entre el `q-select` de rol (línea 8-18) y el `q-list`/`div` condicional que sigue (línea 20). Prueba manual: entrar a `/admin/roles`, confirmar que la línea divisoria aparece bajo el selector de rol tanto antes de elegir un rol (junto al mensaje de selección vacía) como después de elegir uno (junto a la lista de grupos de permisos).

---

## Acceptance criteria

- [ ] Al entrar a `/admin/roles` sin haber seleccionado ningún rol, se ve una línea divisoria con acento teal debajo del selector de rol.
- [ ] Al seleccionar un rol, la misma línea divisoria sigue visible en la misma posición, separando el selector de la lista de grupos de permisos.
- [ ] El resto de la pantalla (selección de rol, expansión de grupos, checkboxes, guardado) sigue funcionando sin cambios de comportamiento.

---

## Decisions

- **Sí:** el separador es siempre visible (no depende de `selectedRole`). Decisión explícita del usuario — separa el bloque de título+selector del contenido debajo en todo momento, no solo cuando hay un rol elegido.
- **Sí:** color `teal-4`, alineado con la paleta de acento teal ya usada en la guía de estilo (`rgba(0,150,136,0.2)`/`#4db6ac` para estados activos) en vez del gris por defecto de Quasar. Decisión explícita del usuario para que combine con los headers de grupo (`text-teal-9`).
- **No:** aplicar el mismo tratamiento de línea divisoria dentro de cada `q-expansion-item` de grupo — fuera de alcance, ver Scope.

---

## What is **not** in this spec

- Línea divisoria dentro de cada grupo de permisos (entre su header y sus ítems).
- Cualquier cambio funcional a `RolesPermissionsPage.vue`.
- Cambios a otras pantallas que usan `q-separator`.

Cada uno de estos, si se necesita, va en su propia spec.
