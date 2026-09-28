# SPEC 17 — Tabs por categoría en la asignación de permisos de rol

> **Status:** Aprobado
> **Depends on:** SPEC 03, SPEC 12, SPEC 16
> **Date:** 2026-09-04
> **Objective:** Reemplazar los `q-expansion-item` por categoría en `RolesPermissionsPage.vue` con un diseño de `q-tabs`/`q-tab-panels` (una tab por categoría), moviendo el checkbox de "seleccionar todos" del grupo a la cabecera de cada tab.

---

## Por qué existe esta spec

SPEC 12 organizó el checklist de permisos en secciones expandibles (`q-expansion-item`) por categoría, cada una con su propio checkbox de "seleccionar todos" en la cabecera del acordeón. Esta spec cambia esa presentación a un layout de tabs horizontales: cada categoría pasa a ser una tab, y el checkbox de "seleccionar todos" de esa categoría se muestra dentro del panel de su tab en vez de en la cabecera de un acordeón. El agrupado de permisos por categoría (`permissionGroups`) y toda la lógica de guardado no cambian.

---

## Scope

**In:**

- En `src/pages/admin/RolesPermissionsPage.vue`, reemplazar el `q-list`/`q-expansion-item` (líneas 22-64) por `q-tabs` (horizontal, `dense`, `align="left"`) + `q-tab-panels` correspondiente, generando una `q-tab`/`q-tab-panel` por cada entrada de `permissionGroups` (se reutiliza tal cual el computed existente, incluyendo el orden alfabético y la categoría `UNCATEGORIZED_KEY` siempre al final).
- Estilo de tabs: indicador y color activo `teal` (`color="teal"` / `active-color="teal-9"` / `indicator-color="teal-9"`), consistente con el resto de acentos teal del proyecto. Sin forma de píldora ni estilos adicionales fuera de lo que da `q-tabs` de Quasar.
- La etiqueta de cada tab muestra únicamente el nombre de la categoría (`group.label`), igual que hoy en la cabecera del acordeón — sin contador de seleccionados.
- Dentro de cada `q-tab-panel`, como primera fila del panel (antes del `q-list` de permisos), un `q-checkbox` de "seleccionar todos" para esa categoría, con el mismo comportamiento de tres estados (`marcado` / `vacío` / `indeterminate-value: null`) que hoy tiene `groupCheckboxValue`/`onToggleGroup` — se reutiliza esa misma lógica, solo cambia dónde se renderiza el checkbox.
- El `q-list` de permisos individuales de cada categoría (checkbox + nombre del permiso, líneas 45-62 actuales) se mantiene igual dentro del panel de su tab.
- Un `ref` local `activeTab` controla la tab seleccionada. Cada vez que cambia `selectedRole` (mismo `watch` que ya resetea `localPermissions`/`originalPermissions`), `activeTab` se reinicia a la clave (`key`) de la primera categoría de `permissionGroups`.
- El `q-select` de rol, el `q-separator` de SPEC 16, el mensaje de selección vacía, y los botones Guardar/Salir permanecen exactamente igual, sin cambios de posición ni de comportamiento.

**Out of scope (for future specs):**

- Contador de permisos seleccionados en la etiqueta de la tab (ej. "Usuarios (3/8)").
- Tabs verticales o cualquier layout alternativo al horizontal.
- Buscador o filtro de permisos dentro de una tab.
- Persistir la tab activa entre cambios de rol (siempre se resetea a la primera).
- Cambios al agrupado (`permissionGroups`), al store `useRolesStore`, o a los tipos `Role`/`PermissionItem`.
- Cambios a otras pantallas.

---

## Data model

No aplica — esta spec no introduce ni modifica ninguna estructura de datos, store, ni payload. Reutiliza `permissionGroups`, `PermissionGroup`, `localPermissions`, `isChecked`, `onToggle`, `groupCheckboxValue` y `onToggleGroup` tal como están definidos en `RolesPermissionsPage.vue` (líneas 125-215).

---

## Implementation plan

1. En `RolesPermissionsPage.vue`, añadir el `ref<string | null>` `activeTab` junto a `selectedRoleId` (cerca de la línea 113). Prueba manual: no hay cambio visible aún, el archivo sigue compilando.
2. Reemplazar el bloque `<q-list v-if="selectedRole" ...>...</q-list>` (líneas 22-64) por `<q-tabs v-model="activeTab" ...>` con un `q-tab` por cada `group in permissionGroups` (usando `group.key` como `name` y `group.label` como `label`), seguido de `<q-tab-panels v-model="activeTab" ...>` con un `q-tab-panel` por cada grupo (mismo `group.key` como `name`). Prueba manual: entrar a `/admin/roles`, elegir un rol, ver las tabs con los nombres de categoría en vez del acordeón.
3. Dentro de cada `q-tab-panel`, mover el checkbox de "seleccionar todos" (hoy en el `template #header` del `q-expansion-item`, líneas 30-43) a la primera fila del panel, reutilizando `groupCheckboxValue(group)` y `onToggleGroup(group, val)` sin cambios de lógica. Debajo, mantener el `q-list` de permisos individuales de esa categoría (líneas 45-62 actuales) sin modificaciones. Prueba manual: dentro de una tab, marcar/desmarcar el checkbox de "seleccionar todos" y comprobar que marca/desmarca todos los permisos de esa categoría; marcar permisos individuales y comprobar que el checkbox superior pasa a estado indeterminado.
4. Actualizar el `watch(selectedRole, ...)` existente (línea 179) para que, además de resetear `localPermissions`/`originalPermissions`, fije `activeTab.value` a la `key` de `permissionGroups.value[0]` (o `null` si no hay categorías). Prueba manual: seleccionar un rol, cambiar de tab, luego elegir otro rol en el `q-select` y comprobar que la vista vuelve a mostrar la primera tab activa.
5. Ajustar los estilos en el bloque `<style scoped>` si hace falta (por ejemplo, quitar `.permission-group-header`/`.permission-group-items` si dejan de usarse, o adaptarlos al nuevo contenedor del panel). Prueba manual: revisar visualmente que no queden estilos huérfanos ni checkboxes desalineados.

---

## Acceptance criteria

- [ ] Al seleccionar un rol en `/admin/roles`, se muestran tabs horizontales (una por categoría de permiso), en el mismo orden alfabético que antes tenían los acordeones, con la categoría "Sin categoría" siempre como última tab (si existen permisos sin `group`).
- [ ] Cada tab muestra únicamente el nombre de la categoría como etiqueta.
- [ ] Al entrar en una tab, aparece un checkbox de "seleccionar todos" para esa categoría antes de la lista de permisos, con estado marcado/vacío/indeterminado según cuántos permisos de esa categoría estén seleccionados.
- [ ] Marcar el checkbox de "seleccionar todos" de una tab selecciona todos los permisos de esa categoría; desmarcarlo los deselecciona todos.
- [ ] Marcar o desmarcar permisos individuales dentro de una tab actualiza correctamente el estado del checkbox de "seleccionar todos" de esa misma tab.
- [ ] Al cambiar de rol en el `q-select` superior, la vista siempre vuelve a mostrar la primera tab (categoría), sin importar en qué tab estaba antes.
- [ ] El botón Guardar sigue calculando y enviando exactamente los permisos añadidos/quitados (`assignPermissions`/`removePermissions`) sin importar en qué tabs se hicieron los cambios.
- [ ] El botón Salir sigue restaurando `localPermissions` a los valores originales del rol, sin importar la tab activa.
- [ ] Los checkboxes (individuales y de "seleccionar todos") siguen deshabilitados cuando el usuario no tiene el permiso `usuarios.editar` o mientras se está guardando.
- [ ] El `q-separator` de SPEC 16 sigue visible en la misma posición, y el mensaje de selección vacía sigue apareciendo cuando no hay rol elegido.

---

## Decisions

- **Sí:** una tab por categoría, reutilizando el computed `permissionGroups` existente sin tocar su lógica de agrupado ni orden. Reduce el alcance del cambio a la capa visual del template.
- **Sí:** el checkbox de "seleccionar todos" se reutiliza tal cual (misma función `groupCheckboxValue`/`onToggleGroup`), solo cambia de ubicación (de cabecera de acordeón a primera fila del panel de tab). Evita reescribir lógica ya probada.
- **Sí:** tabs horizontales arriba en vez de verticales. Encaja con el layout vertical actual de la `GlassCard` sin necesitar más ancho horizontal.
- **Sí:** la tab activa se resetea siempre a la primera categoría al cambiar de rol. Comportamiento predecible; evita mostrar una tab de un índice que podría no existir o no tener sentido para el nuevo rol.
- **Sí:** color de tabs teal estándar de Quasar (`teal`/`teal-9`), sin forma de píldora. Consistente con los acentos teal ya usados en cabeceras de tabla y títulos, sin inventar un componente visual nuevo.
- **No:** contador de permisos seleccionados en la etiqueta de la tab. Se descarta para esta spec por simplicidad; puede añadirse después si se pide explícitamente.
- **No:** persistir la tab activa entre cambios de rol. Se descarta a favor de siempre volver a la primera tab.

---

## What is **not** in this spec

- Contador de seleccionados en la etiqueta de cada tab.
- Tabs verticales o cualquier otra variante de layout.
- Buscador/filtro de permisos dentro de una tab.
- Persistencia de la tab activa entre cambios de rol.
- Cambios al store `useRolesStore`, a los tipos `Role`/`PermissionItem`, o a otras pantallas.

Cada uno de estos, si se necesita, va en su propia spec.
