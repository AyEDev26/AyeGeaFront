# SPEC 19 — Exportar listados de inventario a Excel o PDF: vehículos, maquinaria y EPIs

> **Status:** Aprobado
> **Depends on:** SPEC 13 (listados de inventario, `InventarioListTable.vue`, store `elemsInventario.ts` con `fetchElems` y filtros), SPEC 16 (patrón de carga dinámica de `pdfmake` y descarga directa en `src/utils/inventario-pdf.ts`).
> **Date:** 2026-10-24
> **Objective:** Añadir a los listados de vehículos, maquinaria y EPIs un botón «Exportar» con menú «Excel» / «PDF» que descargue todos los resultados que cumplen los filtros aplicados, con las mismas columnas que muestra la tabla.

---

## Scope

**In:**

- **Botón «Exportar»** en `InventarioListTable.vue`, junto a «Filtrar» / «Limpiar» (o en la cabecera de la tabla), que abre un `q-menu` con dos opciones: «Excel (.xlsx)» y «PDF». Estilo `no-caps`, `elegant-btn`, colores teal.
  - Visible con `elementos_inventario.ver` (el permiso de la ruta); sin permiso nuevo.
  - Deshabilitado cuando el listado cargado tiene `total = 0` o mientras se carga la tabla.
  - Muestra `loading` y se deshabilita mientras se exporta (no se pueden lanzar dos exportaciones a la vez).
- **Filas exportadas:** **todos** los resultados que cumplen los **filtros aplicados** (los del último «Filtrar», no los valores sin aplicar de los campos), no solo la página visible. Se obtienen recorriendo las páginas de `GET /elems-inventario` con `per_page=100`, sin límite de filas y sin tocar el estado de la tabla (página, filtros y filas por página siguen igual).
- **Orden:** el del servidor (por nombre). La ordenación local de la tabla no se aplica al fichero.
- **Columnas:** las mismas que el listado según el tipo, sin la columna de acciones:
  - Comunes: referencia, nombre, categoría, subcategoría, delegación, ubicación.
  - Vehículos: matrícula, marca / modelo, próxima revisión. Maquinaria: marca / modelo, próxima revisión. EPIs: stock mínimo.
  - Estado al final, como texto «Activo» / «Inactivo» (no chip).
  - Nulos como `—`; fechas en el formato de visualización del idioma activo.
  - Cabeceras con las claves `inventario.columns.*` ya existentes.
- **Resumen de filtros aplicados** en el fichero: nombre del filtro y valor legible (los selects por su texto, no por el id; el estado como «Activo» / «Inactivo»). Si no hay filtros, se indica «Sin filtros».
- **Excel (.xlsx):** una hoja con título del listado y fecha de generación, filas de filtros aplicados, cabecera de tabla con estilo (fondo teal oscuro, texto blanco, negrita, como las tablas de la app), anchos de columna ajustados y filtro automático en la cabecera. Fechas y stock mínimo como valores nativos (fecha / número), no texto.
- **PDF:** A4 **horizontal** con título del tipo, fecha de generación y filtros aplicados bajo el título, tabla con cabecera que se repite en cada página y pie con «Página X de Y». Texto largo con salto de línea sin cortarse.
- **Archivo:** descarga directa con nombre `<tipo>-listado-YYYYMMDD.xlsx|pdf` (`vehiculos`, `maquinaria`, `epis`; fecha local de generación).
- **Estados y errores:** `loading` mientras se recorren las páginas y se genera el fichero; notificación de éxito al terminar; si falla cualquier página o la generación, no se descarga nada, se notifica en `red-9` con `getApiErrorMessage` / mensaje genérico y el botón vuelve a su estado normal.
- **Librerías:** `pdfmake` (ya instalada) y `exceljs` (nueva), ambas cargadas con `import()` dinámico al elegir la opción, para no aumentar el bundle inicial.
- **Código nuevo:**
  - `src/stores/elemsInventario.ts`: nueva función `fetchAllElems(tipoId, filters)` que recorre todas las páginas con `per_page=100` aplicando `buildFilterParams`, y devuelve los `ElemInventario` sin modificar `byTipo` (patrón de `fetchAllVehiculos`).
  - `src/utils/inventario-listado-export.ts`: tipos de datos del export y funciones `generateInventarioListExcel(input)` y `generateInventarioListPdf(input)`; sin dependencias de Vue.
  - `src/composables/useInventarioListExport.ts`: orquesta la carga de filas, construcción de columnas y filas (textos ya formateados), resumen de filtros, `loading`, descarga y notificaciones.
- **Cambios en componentes existentes:** `InventarioListTable.vue` añade el botón y usa el composable; sin cambios en `VehiculosListPage.vue`, `MaquinariaListPage.vue` ni `EpisListPage.vue`. Las definiciones de columnas y los formateadores (`formatDate`, `marcaModelo`) se reutilizan en lugar de duplicarse.
- **i18n** (`es` y `en-US`): `inventario.export.*` (etiqueta del botón, «Excel», «PDF», títulos de listado por tipo, «Sin filtros», «Generado el…», pie, «Activo»/«Inactivo» si no existen ya, éxito y error genérico).

**Out of scope (for future specs):**

- Exportar campos que el listado no muestra (n.º de serie, departamento, proveedor, fechas de compra, ficha completa, etc.).
- Exportar solo la página visible o las filas seleccionadas; selección de filas.
- Exportar a CSV u otros formatos.
- Permiso propio de exportación (`elementos_inventario.exportar`).
- Exportación en servidor o endpoint específico del backend.
- Logo corporativo, vista previa en pantalla, envío por correo o guardado en el servidor.
- Elegir las columnas a exportar.
- Exportar los listados de la administración (usuarios, proveedores, etc.).
- Ordenación en servidor.
- Límite de filas o aviso de progreso con porcentaje (solo `loading`).

---

## Data model

Esta feature no introduce datos persistentes ni endpoints nuevos: usa `GET /elems-inventario` ya existente. Solo estructuras en memoria:

```ts
// src/utils/inventario-listado-export.ts
interface InventarioExportColumn {
  name: string;                // 'referencia', 'matricula', 'proximaRevision', 'stockMinimo', 'estado'...
  label: string;               // cabecera ya traducida
  type: 'text' | 'date' | 'number';
}

interface InventarioExportFilter {
  label: string;               // p. ej. «Categoría»
  value: string;               // valor legible, p. ej. «Furgonetas»
}

interface InventarioListExportInput {
  tipoId: 1 | 2 | 3;
  title: string;               // «Listado de vehículos», etc.
  generatedAt: string;         // fecha y hora formateadas
  filters: InventarioExportFilter[];   // vacío → «Sin filtros»
  columns: InventarioExportColumn[];
  rows: (string | number | Date | null)[][]; // en el orden de columns; null → «—» en el PDF, celda vacía o «—» en Excel
  footerLabel: (page: number, pages: number) => string;
}
```

Convenciones:

- Las columnas, las etiquetas y los formateadores se derivan de los mismos de `InventarioListTable.vue`; no se duplican etiquetas ni lógica de columnas por tipo.
- Los valores de los filtros de tipo select se resuelven a texto con las opciones ya cargadas en la pantalla; un id sin correspondencia se omite del resumen.
- Los filtros vacíos no se envían (misma regla que SPEC 13); `estado_id = 0` sí.
- `fetchAllElems` no modifica `byTipo`: la tabla visible no cambia durante ni después de la exportación.

---

## Implementation plan

1. **Dependencia e i18n.** Instalar `exceljs` y añadir `inventario.export.*` en `es` y `en-US`. Verificación: instalación limpia y type-check sin errores.
2. **Store.** Añadir `fetchAllElems(tipoId, filters)` en `elemsInventario.ts`. Verificación: con un tipo de más de 100 elementos devuelve todos y no altera `items`, `meta` ni `filters` del tipo.
3. **Generadores.** Crear `src/utils/inventario-listado-export.ts` con `generateInventarioListExcel` y `generateInventarioListPdf`, con carga dinámica de las librerías. Verificación: con un `InventarioListExportInput` de ejemplo de cada tipo, se descargan un `.xlsx` (se abre con estilo, filtro automático y fechas/números nativos) y un PDF A4 horizontal con cabecera repetida y paginación.
4. **Composable.** Crear `useInventarioListExport` que obtiene las filas con `fetchAllElems`, construye columnas, filas y resumen de filtros reutilizando las definiciones de la tabla, y llama al generador elegido. Verificación: el contenido del fichero coincide con lo que muestra la tabla para los mismos filtros.
5. **Botón en `InventarioListTable.vue`.** Añadir «Exportar» con `q-menu` Excel / PDF, estados `loading` y deshabilitado. Verificación manual en `/#/inventario/vehiculos`, `/maquinaria` y `/epis`.
6. **Casos límite.** Probar sin resultados, con filtros activos, con más de 100 resultados, con filtros escritos pero sin aplicar, fallo de red a mitad de la carga, columnas con nulos y textos largos, y ambos idiomas. Verificación: nunca se descarga un fichero parcial y no hay errores sin controlar.

---

## Acceptance criteria

- [ ] Las tres pantallas (`/#/inventario/vehiculos`, `/maquinaria`, `/epis`) muestran el botón «Exportar» con las opciones «Excel (.xlsx)» y «PDF».
- [ ] El botón está deshabilitado cuando el listado tiene 0 resultados y mientras la tabla está cargando.
- [ ] Al elegir una opción se descarga un archivo `<tipo>-listado-YYYYMMDD.xlsx` o `.pdf` sin abrir otra pestaña.
- [ ] El fichero contiene todos los resultados de los filtros aplicados, también cuando hay más de una página o más de 100 filas, y no solo la página visible.
- [ ] Los valores escritos en los campos de filtro pero no aplicados con «Filtrar» no afectan al fichero.
- [ ] Las columnas del fichero coinciden en orden y cabecera con las de la tabla del tipo, sin la columna de acciones; el estado aparece como «Activo» / «Inactivo».
- [ ] Los nulos aparecen como `—` y las fechas con el formato del idioma activo; en el Excel, las fechas son celdas de fecha y el stock mínimo es numérico.
- [ ] El fichero incluye título, fecha de generación y el resumen de filtros aplicados con textos legibles (no ids), o «Sin filtros».
- [ ] El Excel tiene cabecera con estilo teal oscuro, anchos de columna ajustados y filtro automático.
- [ ] El PDF es A4 horizontal, repite la cabecera de la tabla en cada página, hace salto de línea en textos largos y muestra fecha de generación y «Página X de Y» en el pie.
- [ ] Exportar no cambia la página, los filtros ni las filas por página de la tabla visible.
- [ ] Durante la exportación el botón muestra `loading` y no se puede lanzar otra; al terminar se muestra una notificación de éxito.
- [ ] Si falla una petición o la generación, no se descarga ningún fichero, se notifica en `red-9` con `getApiErrorMessage` / mensaje genérico y el botón vuelve a su estado normal.
- [ ] `exceljs` y `pdfmake` no aparecen en el chunk inicial; se cargan solo al elegir la opción.
- [ ] No se lanzan peticiones distintas de `GET /elems-inventario`.
- [ ] El botón es coherente con los demás de la pantalla (`no-caps`, `elegant-btn`, teal) en temas Clásico y Claro y en ancho móvil.
- [ ] Los ficheros salen en español o inglés según el idioma activo y todos los textos nuevos existen en `es` y `en-US`.
- [ ] `pnpm lint` y el type-check pasan sin errores nuevos.

---

## Decisions taken and discarded

- **Todos los resultados filtrados** (decisión del usuario) frente a solo la página visible (fichero incompleto) o todo el tipo ignorando filtros (el usuario esperaría que el fichero refleje lo que ve).
- **Mismas columnas que el listado** (decisión del usuario) frente a ampliar con campos extra o la ficha completa: no exige peticiones por elemento ni ampliar el mapeo; los campos adicionales irán en otra spec si se piden.
- **Un botón con menú Excel / PDF** (decisión del usuario) frente a dos botones: ocupa menos espacio, sobre todo en móvil.
- **`exceljs`** (decisión del usuario) frente a `write-excel-file` (más ligera) y a SheetJS (`xlsx` en npm, sin mantener y con vulnerabilidades): permite estilos y anchos; el peso se mitiga con `import()` dinámico.
- **Sin permiso nuevo, `elementos_inventario.ver`** (decisión del usuario): el backend no tiene permiso de exportación y los datos exportados son los que el usuario ya ve (mismo criterio que SPEC 16 y 18).
- **PDF A4 horizontal con tabla** (decisión del usuario) frente a vertical: vehículos tiene 10 columnas y quedaría muy apretado.
- **Filtros en el fichero y sin límite de filas** (decisión del usuario) frente a limitar a 2000 filas: el fichero queda autoexplicativo y no se corta el resultado; solo se muestra `loading`.
- **Botón deshabilitado sin resultados** (decisión del usuario) frente a generar un fichero vacío.
- **Se exportan los filtros aplicados, no los de los campos:** garantiza que el fichero coincide con lo que muestra la tabla.
- **Orden del servidor, no el de la tabla:** la ordenación de columnas solo afecta a la página cargada (SPEC 13) y no sería coherente en un fichero completo.
- **Función `fetchAllElems` en el store sin tocar `byTipo`**, siguiendo `fetchAllVehiculos`: la tabla visible no se ve alterada por la exportación.
- **El estado de la spec se escribe en español** (`Borrador`), siguiendo las SPEC anteriores.

---

## Identified risks

- **Volumen de datos:** sin límite de filas, miles de elementos implican muchas peticiones y un fichero pesado. Mitigación: `per_page=100`; las páginas posteriores a la primera se piden en paralelo limitado (p. ej. lotes de 5) para no saturar el servidor; si resulta lento, valorar un límite o un endpoint de exportación en servidor en otra spec.
- **Inconsistencia durante la carga:** los datos pueden cambiar entre peticiones (alta o baja de elementos), dando duplicados u omisiones. Mitigación: aceptado; se deduplica por `id` al unir las páginas.
- **Peso de `exceljs` (~1 MB) y `pdfmake`:** mitigado con `import()` dinámico; comprobar en el paso 3 que no entran en el bundle inicial.
- **Fuentes y caracteres especiales en el PDF:** ñ, tildes y «—» con la fuente por defecto de pdfmake; ya validado en la SPEC 16, se verifica de nuevo en el paso 6.
- **Resolución de ids de filtros a texto:** si una opción del select no está cargada (p. ej. 403 por permisos de otro recurso), el filtro no aparecería en el resumen. Mitigación: omitir el filtro del resumen en vez de mostrar el id; el fichero sigue siendo correcto porque el filtro sí se aplicó en la consulta.
- **PDF muy largo:** miles de filas en pdfmake pueden bloquear la pestaña unos segundos. Mitigación: `loading` en el botón; si fuese problemático, límite o exportar solo Excel para volúmenes grandes en otra spec.
- **Permiso `elementos_inventario.ver` y datos ya visibles:** al no haber permiso de exportación, quien ve el listado puede extraerlo completo; es una decisión aceptada.
- **Duplicidad con la lógica de columnas de la tabla:** se evita extrayendo/reutilizando las definiciones de `InventarioListTable.vue`; si no son reutilizables tal cual, se extraen a un módulo compartido sin cambiar el aspecto de la tabla.

---

## What is **not** in this spec

- Campos que el listado no muestra, ficha completa por elemento o selección de columnas.
- Exportación de la página visible, de filas seleccionadas o a CSV.
- Permiso propio de exportación o exportación generada en el servidor.
- Logo corporativo, vista previa, envío por correo o almacenamiento en el servidor.
- Exportar otros listados de la aplicación (administración).
- Ordenación en servidor y límite de filas.

Cada uno de esos puntos, si se aborda, va en su propia spec.
