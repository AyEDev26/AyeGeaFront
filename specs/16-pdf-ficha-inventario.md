# SPEC 16 — PDF con la ficha de inventario: vehículos, maquinaria y EPIs

> **Status:** Aprobado
> **Depends on:** SPEC 14 (formularios de inventario, `InventarioForm.vue`, store `elemsInventario.ts`, `fetchElem`), SPEC 15 (carpeta «Información» dentro de `InventarioTabs`, edición en `inventario/*/:id/editar`).
> **Date:** 2026-10-24
> **Objective:** Añadir a la carpeta «Información» de la edición de vehículos, maquinaria y EPIs un botón «Generar PDF» que descargue una ficha A4 con formato de formulario que contenga todos los datos guardados del elemento, respetando las secciones del formulario, con su imagen y un código QR con su referencia.

---

## Scope

**In:**

- **Botón «Generar PDF»** en la barra de acciones de `InventarioForm.vue` (junto a «Cancelar» y «Guardar»), visible solo en modo edición (con `:id`) y por tanto dentro de la carpeta «Información». Sin permiso nuevo: lo cubre `elementos_inventario.editar`, el de la ruta. Muestra `loading` mientras se genera y se desactiva durante el guardado.
- **Origen de datos:** los datos **guardados en el servidor** (`GET /elems-inventario/{id}` vía `fetchElem`), no el estado actual del formulario. Si hay cambios sin guardar, el PDF no los refleja.
- **Contenido del PDF** (A4 vertical), con las mismas secciones y el mismo orden que el formulario:
  - **Cabecera:** título del tipo («Ficha de vehículo» / «Ficha de maquinaria» / «Ficha de EPI»), nombre del elemento, imagen a un lado y código QR al otro.
  - **Secciones:** Datos generales, Ubicación y proveedor, Fechas y baja, bloque específico del tipo (Vehículo, Maquinaria o EPI). La sección «Imagen» del formulario no se repite: la imagen va en la cabecera.
  - **Campos:** todos los del formulario de cada sección, en filas etiqueta/valor tipo formulario. Los selects se muestran con su texto (nombre de categoría, delegación, estado, responsable, etc.), no con el id. Los booleanos se muestran como «Sí» / «No»; las fechas con el formato de visualización de la app; el precio con formato de moneda.
  - **Campos vacíos:** aparecen siempre, con «—», para conservar la estructura de formulario.
  - **Pie:** fecha y hora de generación y «Página X de Y».
- **Código QR:** codifica únicamente el valor de `referencia` como texto plano. Si el elemento no tiene referencia, el QR codifica el `id` del elemento y se muestra bajo él la leyenda correspondiente. Bajo el QR se imprime el texto de la referencia.
- **Imagen:** se obtiene de `imagenUrl` con `fetch` y se convierte a data URL para incrustarla. Si no hay imagen o la descarga falla (CORS, red, 404), el PDF se genera igualmente con un recuadro «Sin imagen» y, si fue un fallo, una notificación `warning`. Nunca se aborta el PDF por la imagen.
- **Idioma:** el activo de la aplicación (`es` / `en-US`), con las claves i18n existentes de `inventario.form.*` para las etiquetas y nuevas claves para título del documento y pie.
- **Archivo:** descarga directa con nombre `<tipo>-<referencia>.pdf` (`vehiculo`, `maquinaria`, `epi`; sin referencia, `<tipo>-<id>.pdf`), saneando el nombre (sin espacios ni caracteres no válidos).
- **Librerías:** `pdfmake` y `qrcode` (con sus tipos), cargadas con `import()` dinámico al pulsar el botón, para no aumentar el bundle inicial.
- **Código nuevo:**
  - `src/utils/inventario-pdf.ts`: función `generateInventarioPdf(detail, labels, options)` que construye la definición del documento y lo descarga; sin dependencias de Vue.
  - `src/composables/useInventarioPdf.ts` (o similar): orquesta la carga del detalle, resolución de textos de selects, imagen, QR, estado `loading` y notificaciones.
- **i18n** (`es` y `en-US`): `inventario.pdf.*` (etiqueta del botón, títulos de ficha por tipo, «Sin imagen», leyenda de QR sin referencia, pie de página, éxito/errores, «Sí»/«No» si no existen ya).

**Out of scope (for future specs):**

- PDF en blanco/plantilla vacía en el alta (`nuevo`).
- PDF con los cambios sin guardar del formulario.
- Contenido de las demás carpetas (Alertas, Mantenimientos, Costes, etc.), que aún son skeletons.
- Botón de PDF en los listados, PDF masivo o etiquetas de QR en lote.
- Logo corporativo de la organización en la cabecera.
- Permiso propio de exportación (`elementos_inventario.exportar`).
- QR con URL de la ficha; lectura/escaneo de QR en la aplicación.
- Vista previa en pantalla, envío por correo o guardado del PDF en el servidor.
- Personalización del diseño por organización.

---

## Data model

Esta feature no introduce datos persistentes ni endpoints. Solo estructuras en memoria para el PDF:

```ts
// src/utils/inventario-pdf.ts
interface InventarioPdfField {
  label: string;   // etiqueta ya traducida
  value: string;   // valor ya formateado; '—' si vacío
}

interface InventarioPdfSection {
  title: string;   // título traducido de la sección
  fields: InventarioPdfField[];
}

interface InventarioPdfInput {
  tipoId: 1 | 2 | 3;
  title: string;                 // «Ficha de vehículo», etc.
  elementName: string;
  reference: string;             // referencia o id si no hay referencia
  referenceIsFallback: boolean;  // true si se usó el id
  imageDataUrl: string | null;   // null → recuadro «Sin imagen»
  sections: InventarioPdfSection[];
  generatedAt: string;           // fecha y hora formateadas
  footerLabel: (page: number, pages: number) => string;
}
```

Convenciones:

- Las secciones y campos se construyen a partir del mismo orden que `InventarioForm.vue` y de las mismas claves `inventario.form.*`; no se duplican etiquetas.
- Los ids de selects (`categoriaId`, `delegacionId`, `responsableId`, `vehiculoId`, etc.) se resuelven a texto con los datos auxiliares ya cargados por el formulario o, si no están disponibles, con las mismas cargas `fetchAll*` / `fetchUsersSelector`; un id sin correspondencia se muestra como «—».
- El QR se genera con `qrcode` como data URL PNG (corrección de errores nivel M).

---

## Implementation plan

1. **Dependencias e i18n.** Instalar `pdfmake`, `qrcode` y `@types/pdfmake`, `@types/qrcode`; añadir `inventario.pdf.*` en `es` y `en-US`. Verificación: `pnpm install` limpio y type-check sin errores.
2. **Generador del documento.** Crear `src/utils/inventario-pdf.ts` con la definición pdfmake (cabecera con imagen/QR, secciones etiqueta/valor, pie con paginación) y la carga dinámica de las librerías. Verificación: llamar a la función con un `InventarioPdfInput` de ejemplo de cada tipo y descargar un PDF de varias secciones.
3. **Composable.** Crear `useInventarioPdf` que obtiene el detalle con `fetchElem`, resuelve los textos de los selects, descarga la imagen a data URL con tolerancia a fallos, genera el QR y llama al generador. Verificación: con un elemento real de cada tipo, el PDF contiene todos los campos y los textos (no ids).
4. **Botón en `InventarioForm.vue`.** Añadir «Generar PDF» a la barra de acciones, solo en edición, con `loading` y notificaciones de éxito/error. Verificación manual en `/#/inventario/<tipo>/<id>/editar`; en `nuevo` el botón no aparece.
5. **Casos límite.** Probar elemento sin imagen, con imagen que falla, sin referencia, con campos largos (comentario/localización de 255 caracteres) y con campos vacíos, y en ambos idiomas. Verificación: el PDF se genera siempre y no se corta ningún texto.

---

## Acceptance criteria

- [ ] En `/#/inventario/vehiculos/<id>/editar`, `/maquinaria/<id>/editar` y `/epis/<id>/editar` aparece el botón «Generar PDF» en la carpeta «Información»; no aparece en `nuevo` ni en el resto de carpetas.
- [ ] Al pulsarlo se descarga un archivo `<tipo>-<referencia>.pdf` (o `<tipo>-<id>.pdf` sin referencia) sin abrir otra pestaña.
- [ ] El PDF es A4 vertical e incluye título del tipo, nombre del elemento, imagen y QR en la cabecera.
- [ ] El PDF contiene las mismas secciones que el formulario y en el mismo orden (Datos generales, Ubicación y proveedor, Fechas y baja, y el bloque del tipo), con **todos** los campos de cada una.
- [ ] Los selects se muestran con su texto (categoría, subcategoría, estado, delegación, ubicación, departamento, proveedor, responsable, vehículo, periodicidad, estado de revisión, tipo de funcionamiento), nunca con el id.
- [ ] Los campos sin valor aparecen con «—»; los booleanos como «Sí» / «No».
- [ ] El QR, al escanearlo, devuelve exactamente la `referencia` del elemento; sin referencia devuelve el `id` y el PDF lo indica.
- [ ] El PDF refleja los datos guardados: un cambio sin guardar en el formulario no aparece en él.
- [ ] Si el elemento no tiene imagen, o la descarga de la imagen falla, el PDF se genera con el recuadro «Sin imagen»; si fue un fallo, se muestra una notificación `warning`.
- [ ] El pie muestra fecha y hora de generación y «Página X de Y»; los textos largos hacen salto de línea sin cortarse y el documento admite varias páginas.
- [ ] Si falla la carga del detalle o la generación, se muestra un error con `getApiErrorMessage` / mensaje genérico en `red-9` y el botón vuelve a su estado normal.
- [ ] Durante la generación el botón muestra `loading`; las librerías se cargan solo al pulsar (no aparecen en el chunk inicial).
- [ ] El PDF sale en español o en inglés según el idioma activo.
- [ ] El botón es coherente con los demás botones del formulario (`no-caps`, `elegant-btn`, colores teal) en temas Clásico y Claro y en ancho móvil.
- [ ] No se lanzan peticiones a la API distintas de las que ya usa el formulario, salvo `GET /elems-inventario/{id}` y la descarga de la imagen.
- [ ] Todos los textos nuevos existen en `es` y `en-US`.
- [ ] `pnpm lint` y el type-check pasan sin errores nuevos.

---

## Decisions taken and discarded

- **`pdfmake` + `qrcode`** (decisión del usuario) frente a `jsPDF` (posicionamiento manual, más frágil con textos largos) y a `window.print` (resultado dependiente del navegador y sin archivo descargable). Carga dinámica por el peso de pdfmake y sus fuentes.
- **Datos guardados en el servidor** (decisión del usuario) frente al estado actual del formulario: el PDF es un documento oficial y no debe contener datos sin persistir. Consecuencia: botón solo en edición.
- **Sin PDF en blanco en el alta** (decisión del usuario): no se pidió plantilla vacía; si se necesita irá en otra spec.
- **QR solo con la referencia** (decisión del usuario) frente a URL o referencia + URL: es lo pedido, es más legible impreso y no depende del dominio ni exige login. El fallback al `id` evita un QR vacío en elementos sin referencia (campo opcional en la API).
- **Idioma activo de la app y vacíos como «—»** (decisión del usuario): reutiliza i18n y mantiene la estructura fija de formulario.
- **Botón junto a Guardar/Cancelar, sin permiso nuevo** (decisión del usuario): evita depender de un permiso `exportar` que el backend no tiene; lo cubre `elementos_inventario.editar`.
- **Imagen tolerante a fallos** (decisión del usuario): `fetch` a data URL y, si falla, PDF sin imagen con aviso; un fallo de CORS no debe bloquear la función.
- **Cabecera con título + nombre, imagen y QR; descarga directa** (decisión del usuario) frente a abrir en pestaña (bloqueo de popups) o incluir logo (requiere definir su origen).
- **Una sola carpeta («Información»)**: el PDF recoge los datos del formulario actual; las demás carpetas siguen siendo skeletons y no aportan datos (SPEC 15).
- **El estado de la spec se escribe en español** (`Borrador`), siguiendo las SPEC anteriores.

---

## Identified risks

- **CORS en `imagenUrl`:** si el servidor de imágenes no envía cabeceras CORS, `fetch` fallará siempre. Mitigación: degradado a «Sin imagen» con aviso; si ocurre de forma sistemática, pedir cabeceras CORS al backend o un endpoint proxy en otra spec. Verificar en el paso 3 con una imagen real.
- **Peso de `pdfmake`:** ~1 MB con fuentes. Mitigación: `import()` dinámico y comprobar que no entra en el bundle inicial.
- **Fuentes y caracteres especiales:** pdfmake usa Roboto por defecto; ñ, tildes y «—» deben renderizar bien. Verificar en el paso 5; si hiciera falta, registrar fuentes propias.
- **Resolución de ids a texto sin datos auxiliares:** el composable puede ejecutarse con selects no cargados (p. ej. 403 por permisos de `catalogos.ver` o `usuarios.ver`). Mitigación: mostrar «—» para ids sin correspondencia y no bloquear el PDF.
- **Forma real de `GET /elems-inventario/{id}`:** el mapeo del detalle ya existe (SPEC 14); si faltan nombres embebidos, se resuelven con los auxiliares.
- **Datos obsoletos frente al formulario:** el usuario puede esperar que el PDF incluya cambios sin guardar. Mitigación: documentarlo en la tooltip del botón («Genera el PDF con los datos guardados»).
- **Textos muy largos** (comentario, localización, motivo de baja, hasta 255 caracteres): se resuelven con celdas de ancho completo y salto de línea; verificar en el paso 5.

---

## What is **not** in this spec

- PDF en blanco o plantilla vacía en el alta.
- PDF con cambios sin guardar.
- Contenido de las carpetas relacionadas (Alertas, Mantenimientos, Costes…).
- PDF desde el listado, masivo o etiquetas de QR en lote.
- Logo corporativo, vista previa en pantalla, correo o almacenamiento en servidor.
- Permiso propio de exportación.
- QR con URL de la ficha o escaneo de QR en la aplicación.

Cada uno de esos puntos, si se aborda, va en su propia spec.
