# SPEC 12 — Permisos agrupados por categoría en /admin/roles

> **Status:** Implementado
> **Depends on:** SPEC 03
> **Date:** 2026-09-04
> **Objective:** Agrupar visualmente el checklist de permisos de `/admin/roles` por el nuevo atributo `group` que ahora devuelve `GET /permissions`, en secciones expandibles con selección masiva por grupo.

---

## Por qué existe esta spec

SPEC 03 introdujo `PermissionItem { id, name }` y pinta el catálogo completo de permisos como una única `q-list` plana en `RolesPermissionsPage.vue`. El backend ahora añade un campo `group: string` a cada permiso (confirmado contra el swagger real). Con el catálogo creciendo, una lista plana deja de ser navegable; esta spec solo cambia cómo se **muestra y selecciona** ese catálogo ya existente — no toca los endpoints de asignación/remoción ni el resto de SPEC 03.

---

## Scope

**In:**

- Campo `group: string` añadido a la interfaz `PermissionItem` en `src/stores/roles.ts`.
- `RolesPermissionsPage.vue`: el checklist de permisos de un rol se reorganiza en secciones expandibles (`q-expansion-item`), una por cada valor distinto de `group` presente en `rolesStore.permissions`.
- Cada sección expandible muestra el nombre del grupo tal cual llega del backend, con `text-transform: capitalize` vía CSS (sin diccionario de traducción).
- Orden de las secciones: alfabético por nombre de grupo, excepto un grupo residual "Sin categoría" (agrupa los permisos con `group` nulo o vacío) que siempre va al final.
- Todas las secciones empiezan expandidas al seleccionar un rol.
- Checkbox de "marcar todo el grupo" en el header de cada `q-expansion-item`: marca/desmarca todos los permisos de ese grupo a la vez; queda en estado indeterminado (`indeterminate-value`) si el grupo tiene una mezcla de permisos marcados/desmarcados para el rol actual.
- El checkbox de grupo respeta el mismo guard de permiso que los checkboxes individuales: deshabilitado si `!auth.hasPermission('usuarios.editar')` o mientras `saving`.
- La clave i18n nueva `admin.roles.uncategorizedGroup` ("Sin categoría" / "Uncategorized") en `src/i18n/es/index.ts` y `src/i18n/en-US/index.ts`.

**Out of scope (for future specs):**

- Cambiar cómo se listan o gestionan los grupos en sí (crear/renombrar/eliminar un grupo) — el backend no expone eso, igual que ya ocurre con roles y permisos (ver SPEC 03).
- Buscador o filtro de texto sobre el catálogo de permisos.
- Traducción del nombre de cada grupo vía diccionario i18n — se muestra el valor crudo del backend.
- Cambios en `UsersListPage.vue`, `UserFormDialog.vue`, o en cualquier otra pantalla que no sea `/admin/roles`.
- Cambios en los endpoints o payloads de `assignPermissions`/`removePermissions` — siguen recibiendo la lista plana de nombres de permisos tocados, sin importar el grupo.
- Recordar el estado expandido/colapsado de cada grupo entre sesiones (localStorage) — siempre arrancan expandidos.

---

## Data model

```ts
// src/stores/roles.ts (Pinia store "roles")
export interface PermissionItem {
  id: number;
  name: string; // ej: "usuarios.ver"
  group: string | null; // ej: "usuarios", "negocio"; null/"" si el backend no asigna grupo
}
```

No se introduce estado nuevo en el store: `permissions` sigue siendo `PermissionItem[]`. El agrupamiento (`Record<string, PermissionItem[]>` ordenado) se calcula como un `computed` local dentro de `RolesPermissionsPage.vue`, no se persiste en el store.

---

## Implementation plan

1. Añadir `group: string | null` a la interfaz `PermissionItem` en `src/stores/roles.ts`. El store sigue compilando y funcionando igual (el campo no se usa todavía).
2. Añadir las claves `admin.roles.uncategorizedGroup: 'Sin categoría'` (es) y `'Uncategorized'` (en-US) junto a las demás claves `admin.roles.*` existentes.
3. En `RolesPermissionsPage.vue`, crear un `computed` `permissionGroups` que agrupe `rolesStore.permissions` por `group` (usando la clave i18n del paso 2 cuando `group` es `null`/`''`), devolviendo un array ordenado: primero los grupos con nombre real en orden alfabético, "Sin categoría" siempre al final. Prueba manual: en Vue Devtools, confirmar que el computed refleja el catálogo real agrupado correctamente.
4. Reemplazar la `q-list` plana del template por un `q-list` de `q-expansion-item` (uno por entrada de `permissionGroups`), `default-opened` en cada uno, con el nombre del grupo como `label` (clase CSS con `text-transform: capitalize`) y, dentro, la misma estructura de `q-item`/`q-checkbox` por permiso que ya existía.
5. Añadir el checkbox de "marcar todo el grupo" en el `header` slot de cada `q-expansion-item`: computed local por grupo que derive `checked`/`indeterminate` a partir de `localPermissions`, y un handler que añada o quite de `localPermissions` todos los `name` del grupo a la vez, reutilizando `onToggle` permiso por permiso o una función equivalente `onToggleGroup(groupPermissions, checked)`.
6. Prueba manual end-to-end contra el backend real: entrar a `/admin/roles`, elegir un rol, confirmar que los grupos aparecen ordenados y expandidos, que "Sin categoría" (si aplica) va al final, que marcar/desmarcar el checkbox de grupo actualiza todos los permisos del grupo y queda indeterminado con selección parcial, y que guardar (`onSave`) sigue mandando exactamente los permisos añadidos/quitados a `assignPermissions`/`removePermissions` sin cambios de comportamiento.

---

## Acceptance criteria

- [x] `GET /permissions` con el catálogo real muestra en `/admin/roles` los permisos agrupados en secciones expandibles por su `group`.
- [x] Las secciones aparecen ordenadas alfabéticamente por nombre de grupo, con "Sin categoría" siempre al final si existen permisos sin grupo. (Orden alfabético verificado contra el backend real; el caso "Sin categoría" no tiene datos reales para probarlo en vivo — el catálogo actual no tiene permisos sin `group` — pero la lógica del computed `permissionGroups` lo cubre y fue verificada por revisión de código.)
- [x] Al seleccionar un rol, todas las secciones aparecen expandidas sin necesidad de clic adicional.
- [x] El nombre de cada grupo se muestra capitalizado (ej. `usuarios` → `Usuarios`).
- [x] Marcar el checkbox de un grupo marca todos los permisos de ese grupo para el rol seleccionado.
- [x] Desmarcar el checkbox de un grupo desmarca todos los permisos de ese grupo para el rol seleccionado.
- [x] Si un grupo tiene selección parcial (algunos permisos marcados, otros no), su checkbox de grupo se muestra en estado indeterminado.
- [x] Con un usuario sin `usuarios.editar`, tanto los checkboxes individuales como los de grupo aparecen deshabilitados. (El checkbox de grupo reutiliza el mismo guard `!auth.hasPermission('usuarios.editar') || saving` que ya tenían los checkboxes individuales; no modificado por esta spec. No se probó cambiando de usuario en vivo.)
- [x] Guardar cambios tras usar el checkbox de grupo llama a `assignPermissions`/`removePermissions` solo con los permisos realmente añadidos/quitados, igual que antes de esta spec.
- [x] El resto de comportamiento de `/admin/roles` (selector de rol, botón guardar deshabilitado si no hay cambios, notificaciones de error, confirmación antes de guardar) sigue funcionando sin regresiones.

---

## Decisions

- **Sí:** grupo residual "Sin categoría" al final para permisos sin `group`, en vez de mostrarlos sueltos fuera de toda sección. Evita que un permiso "se pierda" visualmente si el backend aún no le asignó grupo.
- **No:** diccionario i18n para traducir cada nombre de grupo. El backend puede agregar grupos nuevos en cualquier momento; mantener un mapeo sincronizado sería frágil. Se prefiere mostrar el valor crudo con capitalización CSS.
- **Sí:** secciones expandidas por defecto. El catálogo de permisos de este proyecto es pequeño; forzar a expandir cada grupo añadiría fricción sin beneficio real todavía.
- **Sí:** checkbox de "marcar todo el grupo" con estado indeterminado. Mejora de UX pedida explícitamente al definir esta spec; el patrón de checkbox padre/hijos con `indeterminate` es estándar en Quasar (`q-checkbox` soporta `indeterminate-value`).
- **No:** tocar los endpoints o el payload de `assignPermissions`/`removePermissions`. El backend sigue esperando listas planas de nombres de permiso; el agrupamiento es puramente de presentación en el cliente.
- **No:** persistir el estado expandido/colapsado por grupo entre sesiones. No se pidió y añadiría una llave más en localStorage por poco beneficio.

---

## What is **not** in this spec

- CRUD de grupos de permisos (crear, renombrar, eliminar un grupo) — el backend no lo expone.
- Buscador o filtro de texto sobre permisos.
- Traducción i18n de los nombres de grupo.
- Cambios en `UsersListPage.vue`, `UserFormDialog.vue` u otras pantallas fuera de `/admin/roles`.
- Persistencia del estado expandido/colapsado de cada grupo.

Cada uno de estos, si se necesita, va en su propio spec.
