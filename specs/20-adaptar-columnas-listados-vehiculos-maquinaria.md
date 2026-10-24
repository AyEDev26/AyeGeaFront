# SPEC 20 — Adaptar las columnas de los listados de vehículos y maquinaria

> **Status:** Aprobado
> **Depends on:** SPEC 13 (listados de inventario, `InventarioListTable.vue`, store `elemsInventario.ts`), SPEC 14 (bloques `vehiculo` / `maquinaria` con `ultima_revision`, `responsable_id` y `critico` en el detalle), SPEC 19 (exportación Excel / PDF, que reutiliza las columnas de la tabla).
> **Date:** 2026-10-24
> **Objective:** Cambiar las columnas de los listados de vehículos y maquinaria para mostrar última revisión, próxima revisión, responsable y crítico en lugar de subcategoría y ubicación, y dejar «Referencia» y «Nombre» ancladas a la izquierda al hacer scroll horizontal.

---

## Scope

**In:**

- **Columnas nuevas** en `InventarioListTable.vue` para vehículos (tipo 1) y maquinaria (tipo 2):
  - `ultimaRevision` (fecha, mismo formato que `proximaRevision`).
  - `responsable` (nombre; nulo como `—`).
  - `critico`: chip rojo «Crítico» cuando es `true`, `—` cuando es `false` o nulo.
- **Columnas eliminadas** en vehículos y maquinaria: `subcategoria` y `ubicacion`. En EPIs (tipo 3) se mantienen.
- **Orden final de columnas:**
  - Vehículos: referencia, nombre, categoría, delegación, matrícula, marca / modelo, última revisión, próxima revisión, responsable, crítico, estado.
  - Maquinaria: referencia, nombre, categoría, delegación, marca / modelo, última revisión, próxima revisión, responsable, crítico, estado.
  - EPIs: sin cambios.
- **Columnas fijas:** `referencia` y `nombre` quedan ancladas a la izquierda (`position: sticky`) mientras se hace scroll horizontal, en vehículos y maquinaria. Fondo opaco acorde al tema Clásico y Claro (para que el contenido que pasa por debajo no se transparente), `z-index` correcto con la cabecera, y ancho fijo de `referencia` para que `nombre` se ancle justo a su derecha. Las filas hacen scroll horizontal solo cuando no caben las columnas (ancho móvil / pantallas estrechas).
- **Store** `src/stores/elemsInventario.ts`: ampliar `ElemInventarioResource` y `mapElemInventario` para leer del listado `ultima_revision`, `responsable` y `critico` dentro de los bloques `vehiculo` / `maquinaria`, y añadirlos a `ElemInventario`. El mapeo del detalle (`responsable_id`, etc.) no cambia.
- **Exportación (SPEC 19):** el Excel y el PDF siguen reflejando las columnas de la tabla, así que cambian solos: sin subcategoría ni ubicación, y con última revisión (fecha nativa en Excel), responsable y crítico (texto «Sí» / «No»). `useInventarioListExport.ts` registra `ultimaRevision` como `date` y formatea `critico`. El resumen de filtros no cambia: los filtros de subcategoría y ubicación siguen existiendo y se resumen igual.
- **i18n** (`es` y `en-US`): `inventario.columns.ultimaRevision`, `responsable` y `critico` si no existen ya, y las etiquetas «Sí» / «No» del export.

**Out of scope (for future specs):**

- Quitar los filtros de subcategoría y ubicación de la pantalla: siguen disponibles aunque ya no sean columnas.
- Filtros nuevos por responsable, crítico o fechas de revisión (la API no los soporta, como en SPEC 13).
- Selector de columnas visibles, reordenación de columnas o columnas fijas elegibles por el usuario.
- Cambios en el listado de EPIs y en las columnas del resto de listados de la aplicación.
- Colorear próxima revisión según vencimiento o estado de revisión.
- Cambios en `VehiculosListPage.vue`, `MaquinariaListPage.vue` y `EpisListPage.vue`.
- Ordenación en servidor.

---

## Data model

No hay endpoints ni datos persistentes nuevos. Se amplía el modelo de dominio del listado con campos que el backend debe devolver en `GET /elems-inventario`:

```ts
// src/stores/elemsInventario.ts — ElemInventario (campos añadidos)
vehiculo?: {
  matricula: string | null;
  marca: string | null;
  modelo: string | null;
  ultimaRevision: string | null;               // nuevo
  proximaRevision: string | null;
  responsable: { id: number; nombre: string } | null;  // nuevo
  critico: boolean;                            // nuevo
};
maquinaria?: {
  marca: string | null;
  modelo: string | null;
  ultimaRevision: string | null;               // nuevo
  proximaRevision: string | null;
  responsable: { id: number; nombre: string } | null;  // nuevo
  critico: boolean;                            // nuevo
};
```

Convenciones:

- La forma exacta de `responsable` en el listado (objeto con nombre, `responsable_nombre` plano, etc.) se confirma en el paso 1 contra una respuesta real; el mapeo se ajusta a ella sin cambiar el tipo de dominio.
- `critico` nulo o ausente se trata como `false`.
- Las fechas se formatean con el `formatDate` ya existente (fecha de calendario sin desfase horario).

---

## Implementation plan

1. **Verificar el backend y mapear.** Comprobar contra una respuesta real de `GET /elems-inventario` que los bloques `vehiculo` / `maquinaria` traen `ultima_revision`, el responsable con nombre y `critico`; ampliar `ElemInventarioResource`, `ElemInventario` y `mapElemInventario`. Verificación: type-check sin errores y los valores aparecen en `console` / devtools para un vehículo y una máquina.
2. **i18n.** Añadir las claves de columnas nuevas y las etiquetas «Sí» / «No» en `es` y `en-US`. Verificación: type-check sin errores.
3. **Columnas de la tabla.** En `dataColumns` de `InventarioListTable.vue`, quitar `subcategoria` y `ubicacion` de vehículos y maquinaria, añadir `ultimaRevision`, `responsable` y `critico` (chip rojo) en el orden definido. Verificación manual en `/#/inventario/vehiculos` y `/maquinaria`: columnas correctas; EPIs sin cambios.
4. **Columnas fijas.** Anclar `referencia` y `nombre` con `position: sticky`, fondo opaco por tema y ancho fijo, con la clase aplicada solo a vehículos y maquinaria. Verificación manual: al hacer scroll horizontal (ventana estrecha) permanecen visibles en cabecera y filas, en temas Clásico y Claro.
5. **Exportación.** Actualizar `useInventarioListExport.ts` para tipar `ultimaRevision` como `date` y formatear `critico` como «Sí» / «No». Verificación: descargar Excel y PDF de vehículos y maquinaria y comprobar columnas, fechas nativas y ausencia de subcategoría y ubicación.
6. **Casos límite.** Probar nulos (sin responsable, sin revisiones), `critico` falso, textos largos de nombre con columna anclada, EPIs y ambos idiomas. Verificación: sin errores en consola y sin solapes visuales.

---

## Acceptance criteria

- [ ] El listado de vehículos muestra, en este orden: referencia, nombre, categoría, delegación, matrícula, marca / modelo, última revisión, próxima revisión, responsable, crítico, estado.
- [ ] El listado de maquinaria muestra, en este orden: referencia, nombre, categoría, delegación, marca / modelo, última revisión, próxima revisión, responsable, crítico, estado.
- [ ] Vehículos y maquinaria ya no muestran las columnas subcategoría ni ubicación; los filtros de subcategoría y ubicación siguen funcionando.
- [ ] El listado de EPIs conserva exactamente sus columnas actuales.
- [ ] Última y próxima revisión se muestran con el formato de fecha del idioma activo; los nulos, como `—`.
- [ ] La columna responsable muestra el nombre del responsable o `—` si no tiene.
- [ ] La columna crítico muestra un chip rojo «Crítico» para elementos críticos y `—` para el resto.
- [ ] Al hacer scroll horizontal en vehículos y maquinaria, «Referencia» y «Nombre» permanecen visibles y alineadas a la izquierda en cabecera y filas, sin transparencias, en temas Clásico y Claro.
- [ ] Las columnas fijas no afectan al ancho móvil de forma que impidan ver el resto de columnas.
- [ ] El Excel y el PDF de vehículos y maquinaria incluyen las columnas nuevas, no incluyen subcategoría ni ubicación, y en Excel la última revisión es una celda de fecha.
- [ ] En el fichero exportado, crítico aparece como «Sí» / «No» y responsable como texto.
- [ ] El resumen de filtros del fichero sigue incluyendo subcategoría y ubicación cuando están aplicados.
- [ ] La ordenación por columna sigue funcionando en las columnas nuevas.
- [ ] No se lanzan peticiones nuevas distintas de `GET /elems-inventario`.
- [ ] Todos los textos nuevos existen en `es` y `en-US`.
- [ ] `pnpm lint` y el type-check pasan sin errores nuevos.

---

## Decisions taken and discarded

- **«Listado de equipos» = vehículos** (decisión del usuario): el apunte de las notas era un error; los EPIs no cambian.
- **Columnas fijas = sticky al scroll horizontal** (decisión del usuario) frente a «siempre visibles»: no existe selector de columnas, así que lo único que aporta valor es el anclaje.
- **Responsable desde el backend en el listado** (decisión del usuario) frente a cruzar `responsable_id` con el store de usuarios: evita cargar toda la lista de usuarios y los 403 por permisos. Si el listado no lo devuelve, se pide al backend (riesgo identificado).
- **Crítico como chip rojo** (decisión del usuario) frente a texto «Sí» / «No»: destaca visualmente lo crítico; en el export sí es texto.
- **Export con las mismas columnas que la tabla** (decisión del usuario) frente a desacoplarlo: coherente con SPEC 19 y sin lógica duplicada.
- **Los filtros de subcategoría y ubicación se mantienen:** solo se pide quitar columnas; quitar filtros sería otro cambio de alcance.
- **Sticky con CSS y sin librerías:** `q-table` no ancla columnas de forma nativa; se resuelve con estilos acotados a las dos columnas.
- **El estado de la spec se escribe en español** (`Borrador`), siguiendo las SPEC anteriores.

---

## Identified risks

- **El listado no devuelve los campos nuevos:** `ElemInventarioResource` del listado hoy solo expone `proxima_revision` en los bloques; `ultima_revision`, responsable y `critico` pueden venir solo en el detalle. Mitigación: verificarlo en el paso 1; si faltan, pedir al backend que los incluya en el listado antes de continuar (no se resuelve con una petición de detalle por fila).
- **Forma del responsable:** puede venir como objeto, como nombre plano o solo como id. Mitigación: ajustar el mapeo en el paso 1; si solo viene el id, parar y revisar la decisión de origen del nombre.
- **Anclaje con ancho variable:** si `referencia` cambia de ancho, `nombre` se solapa o deja hueco. Mitigación: ancho fijo de `referencia` y `left` calculado a partir de él.
- **Transparencias y `z-index` con los temas Clásico y Claro:** columnas ancladas sin fondo opaco dejan ver el contenido que pasa por debajo. Mitigación: fondo propio por tema y por estado de fila (hover / alterna), y revisión visual en ambos temas.
- **Pantallas estrechas:** dos columnas ancladas pueden ocupar demasiado ancho en móvil. Mitigación: revisar el ancho móvil en el paso 6; si no cabe, limitar el anclaje a `referencia` o desactivarlo bajo un ancho mínimo, ajustando la spec.
- **Datos nulos:** elementos sin revisiones, sin responsable o con `critico` ausente; mitigados con `—` y `critico = false` por defecto.

---

## What is **not** in this spec

- Quitar o cambiar los filtros del listado.
- Filtros por responsable, crítico o fechas de revisión.
- Selector o reordenación de columnas.
- Cambios en el listado de EPIs o en otros listados.
- Colores de vencimiento de revisiones.
- Ordenación en servidor.

Cada uno de esos puntos, si se aborda, va en su propia spec.
