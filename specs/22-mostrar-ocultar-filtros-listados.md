# SPEC 22 — Mostrar y ocultar el formulario de filtros en los listados de inventario

> **Status:** Aprobado
> **Depends on:** SPEC 13 (listados de inventario, `InventarioListTable.vue`), SPEC 19 (botón de exportación, que se reubica), SPEC 20 (listados de vehículos y maquinaria).
> **Date:** 2026-10-25
> **Objective:** Añadir a los listados de inventario un botón «Filtros» en la cabecera que muestre u oculte el formulario de filtros, oculto por defecto y recordando la elección por tipo de elemento en `localStorage`.

---

## Scope

**In:**

- **Botón «Filtros»** en la cabecera de `InventarioListTable.vue`, junto a «Nuevo»:
  - Icono `filter_alt`; alterna el formulario entre visible y oculto.
  - `q-badge` con el número de filtros aplicados (los de `appliedFilters`) cuando es mayor que 0, para que se vea que hay un filtro activo aunque el formulario esté oculto.
  - Estilo activo (relleno) cuando el formulario está visible y outline cuando está oculto.
- **Formulario plegable:** los campos de filtro y los botones «Filtrar» y «Limpiar» se muestran u ocultan con una transición suave (`q-slide-transition`). Los valores escritos en el formulario no se pierden al plegar.
- **Estado inicial:** oculto por defecto la primera vez que se entra en un listado.
- **Persistencia por tipo en `localStorage`:** clave `inventario:filtros-visibles:{tipoId}` (1 vehículos, 2 maquinaria, 3 EPIs), valor `'1'` visible / `'0'` oculto. Se lee al montar el componente y se escribe al alternar. Cada listado recuerda su propia elección.
- **Botón «Exportar» reubicado** a la cabecera, junto a «Filtros» y «Nuevo», para que siga accesible con el formulario oculto. Conserva su menú (Excel / PDF), permisos y estados `loading` / `disable`.
- **Aplica a los tres listados** (vehículos, maquinaria y EPIs), porque comparten `InventarioListTable.vue`.
- **Los filtros aplicados siguen vigentes al ocultar el formulario:** ocultar no limpia ni reaplica nada; la tabla, la paginación y la exportación siguen usando `appliedFilters`.
- **i18n** (`es` y `en-US`): etiqueta del botón («Filtros» / «Filters») y su `q-tooltip` / `aria-label`.

**Out of scope (for future specs):**

- Cambiar los campos de filtro, añadir filtros nuevos o quitar los existentes.
- Recordar los **valores** de los filtros entre recargas (hoy viven en el store `elemsInventario` y no se tocan).
- Mostrar chips con el resumen de filtros aplicados al estar el formulario oculto (solo se muestra el contador).
- Atajo de teclado para alternar el formulario.
- Aplicar el mecanismo a otras pantallas de la aplicación (administración, usuarios, etc.).
- Persistir la preferencia en el backend o entre dispositivos.
- Cambios en `VehiculosListPage.vue`, `MaquinariaListPage.vue` y `EpisListPage.vue`.

---

## Data model

No hay datos de dominio ni endpoints nuevos. Solo un valor de preferencia en `localStorage`:

```ts
// InventarioListTable.vue
const filtersStorageKey = `inventario:filtros-visibles:${props.tipoId}`; // '1' | '0'
const filtersVisible = ref<boolean>(readFiltersVisible()); // false si no hay valor

// Contador del badge
const appliedFiltersCount = computed(() => Object.keys(appliedFilters.value).length);
```

Convenciones:

- Cualquier valor distinto de `'1'` (ausente, `'0'`, corrupto) se interpreta como oculto.
- Las lecturas y escrituras de `localStorage` van envueltas en `try/catch`; si fallan, el mecanismo funciona solo en memoria durante la sesión.
- `appliedFiltersCount` cuenta claves presentes en `appliedFilters`, que ya solo contiene filtros con valor (ver `buildFilters`).

---

## Implementation plan

1. **i18n.** Añadir en `es` y `en-US` la clave `inventario.filters.toggleButton` (y la del tooltip si difiere). Verificación: type-check sin errores.
2. **Estado y persistencia.** En `InventarioListTable.vue`, añadir `filtersVisible`, `appliedFiltersCount` y las funciones de lectura / escritura seguras de `localStorage`. Verificación: type-check sin errores; el estado se refleja en Vue devtools.
3. **Botón «Filtros» en la cabecera.** Añadir el botón con badge junto a «Nuevo» y enlazarlo a `filtersVisible`. Verificación manual: el botón alterna el estado y el badge muestra el contador tras aplicar un filtro.
4. **Formulario plegable.** Envolver el bloque de campos y botones «Filtrar» / «Limpiar» en `q-slide-transition` condicionado a `filtersVisible`. Verificación manual: por defecto oculto en un navegador limpio; al abrir, los campos conservan lo escrito.
5. **Reubicar «Exportar».** Mover el botón de exportación a la cabecera conservando permiso, menú, `loading` y `disable`. Verificación manual: se puede descargar Excel / PDF con el formulario oculto y los filtros aplicados se respetan.
6. **Casos límite.** Probar recarga (se recuerda por tipo), alternancia entre vehículos / maquinaria / EPIs, `localStorage` bloqueado, ancho móvil y temas Clásico y Claro. Verificación: sin errores en consola y sin desbordes de la cabecera.

---

## Acceptance criteria

- [ ] Con `localStorage` limpio, los tres listados (vehículos, maquinaria, EPIs) se abren con el formulario de filtros oculto.
- [ ] El botón «Filtros» de la cabecera muestra el formulario si está oculto y lo oculta si está visible, con transición.
- [ ] Al recargar la página, cada listado conserva su último estado (visible / oculto) de forma independiente de los otros dos.
- [ ] La clave `inventario:filtros-visibles:{tipoId}` en `localStorage` vale `'1'` cuando el formulario está visible y `'0'` cuando está oculto.
- [ ] Ocultar el formulario no borra los valores escritos: al volver a mostrarlo, siguen ahí.
- [ ] Con filtros aplicados y el formulario oculto, la tabla sigue mostrando los resultados filtrados y el botón «Filtros» muestra un badge con el número de filtros aplicados.
- [ ] Tras pulsar «Limpiar», el badge desaparece.
- [ ] El botón «Exportar» está en la cabecera, visible con el formulario oculto, y exporta respetando los filtros aplicados.
- [ ] «Exportar» mantiene su condición de permiso (`elementos_inventario.ver`) y se deshabilita con el listado cargando o vacío.
- [ ] Si `localStorage` no está disponible, el botón sigue alternando el formulario sin errores en consola.
- [ ] La cabecera no desborda en ancho móvil con los tres botones («Filtros», «Exportar», «Nuevo»).
- [ ] El texto del botón y su tooltip existen en `es` y `en-US`.
- [ ] No se lanzan peticiones nuevas por esta feature.
- [ ] `pnpm lint` y el type-check pasan sin errores nuevos.

---

## Decisions taken and discarded

- **Los tres listados** (decisión del usuario) frente a solo vehículos: el formulario vive en el componente compartido `InventarioListTable.vue`; limitarlo a vehículos exigiría una prop extra y daría comportamiento incoherente entre listados hermanos.
- **Botón «Filtros» en la cabecera** (decisión del usuario) frente a `q-expansion-item`: ocupa menos espacio y encaja junto a «Nuevo».
- **Se oculta todo el bloque, incluidos Filtrar / Limpiar / Exportar** (decisión del usuario) frente a ocultar solo los campos: recupera todo el espacio vertical. Por eso «Exportar» pasa a la cabecera.
- **Oculto por defecto, recordado por tipo en `localStorage`** (decisión del usuario) frente a visible por defecto o solo en memoria: la tabla gana protagonismo y quien prefiera tener los filtros abiertos lo conserva. Mismo patrón que `theme-store` y `locale`.
- **Persistencia por tipo (`{tipoId}`)** frente a una sola clave global: cada listado tiene un uso distinto.
- **Badge con contador** frente a no indicar nada: sin él, un filtro activo con el formulario oculto pasaría desapercibido y la tabla parecería incompleta.
- **Sin persistir los valores de filtro:** son otra feature; el store ya los conserva durante la sesión.
- **Estado en el componente, sin store Pinia nuevo:** es una preferencia de UI local a un componente.
- **El estado de la spec se escribe en español** (`Borrador`), siguiendo las SPEC anteriores.

---

## Identified risks

| Risk                                                                                              | Mitigation                                                                                                                  |
| ------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------- |
| El usuario olvida que hay filtros aplicados con el formulario oculto y cree que el listado está completo | Badge con el número de filtros aplicados en el botón «Filtros».                                                    |
| Cabecera saturada en móvil con tres botones                                                      | Revisar en el paso 6; si no cabe, mostrar solo iconos con tooltip en ancho estrecho o permitir salto de línea de la fila.   |
| `localStorage` deshabilitado o con valor corrupto                                                | `try/catch` y valor por defecto oculto; el mecanismo sigue funcionando en memoria.                                          |
| Los selects con `use-input` no inicializan bien si se montan ocultos                              | `q-slide-transition` con `v-show` o `v-if` según resulte; verificar en el paso 4 que las opciones de los selects se cargan. |
| Mover «Exportar» rompe su posición en tests o estilos existentes                                  | Reutilizar el mismo bloque de plantilla sin cambiar su lógica; revisar la exportación en el paso 5.                         |

---

## What is **not** in this spec

- Nuevos campos de filtro o cambios en los existentes.
- Persistencia de los valores de filtro entre recargas.
- Chips de resumen de filtros aplicados.
- Atajos de teclado.
- Aplicar el mecanismo a pantallas distintas de los listados de inventario.
- Sincronización de la preferencia con el backend.

Cada uno de esos puntos, si se aborda, va en su propia spec.
