# SPEC 15 — Carpetas en el detalle de inventario: vehículos, maquinaria y EPIs

> **Status:** Borrador
> **Depends on:** SPEC 14 (formularios de inventario, `InventarioForm.vue`, rutas `inventario/*/:id/editar`), SPEC 13 (listados y `TipoElemInventarioId`). Fuente de requisitos: `notas-jcn/tabs.md`.
> **Date:** 2026-10-23
> **Objective:** Añadir a la pantalla de edición de vehículos, maquinaria y EPIs un layout de carpetas (pestañas horizontales) con la carpeta «Información» (el formulario actual) y una carpeta por cada entidad relacionada, cada una con un skeleton no animado hasta que existan esas entidades.

---

## Scope

**In:**

- **Layout de carpetas** con `q-tabs` horizontal (con flechas de scroll en móvil) y `q-tab-panels`, visible solo en las rutas `inventario/<tipo>/:id/editar`. En `inventario/<tipo>/nuevo` el formulario se mantiene como hoy, sin carpetas.
- **Carpetas por tipo** (en este orden; «Información» siempre la primera y la activa por defecto):
  - **Vehículos y maquinaria:** Información, Alertas, Tareas, Mantenimientos, ITVs, Revisiones, Costes, Documentos, Pólizas, Rutas, Personas, Equipos.
  - **EPIs:** Información, Tareas, Revisiones, Mantenimientos, Costes, Documentos, Manuales, Plantillas.
- **Contenido de cada carpeta:**
  - «Información»: el formulario actual de `InventarioForm.vue` sin cambios funcionales (incluidos «Guardar» y «Cancelar», que solo existen dentro de esta carpeta).
  - Costes (los tres tipos): card con etiquetas provisionales y valores en skeleton no animado.
  - Resto: skeleton no animado con forma de tabla: cabeceras de columnas provisionales por entidad, unas filas de skeleton y un aviso «Próximamente» para que no parezca un fallo de carga.
- **Cabecera:** el título de la pantalla (`text-h5 text-teal-10 font-outfit`) queda sobre las pestañas. En las carpetas distintas de «Información» hay un botón «Volver al listado» en la cabecera.
- **Carpeta activa en la URL:** query `?carpeta=<clave>` (p. ej. `?carpeta=mantenimientos`). Sin query o con una clave inválida para el tipo se muestra «Información». Cambiar de carpeta actualiza la query con `router.replace` (sin añadir entradas al historial).
- **Componentes** en `src/components/inventario/`:
  - `InventarioTabs.vue`: pestañas, paneles y lectura/escritura de la query; recibe `tipoId` y el `id` del elemento; la carpeta «Información» se pinta con un slot que usa `InventarioForm`.
  - `SkeletonTablePlaceholder.vue`: tabla de skeleton con props `columns` (claves i18n) y `rows`.
  - `SkeletonCostesCard.vue`: card con etiquetas y valores en skeleton; las etiquetas vienen por props.
- **Cambios en componentes existentes:** `InventarioForm.vue` pasa a poder renderizarse como contenido de la carpeta «Información» (sin duplicar título ni la cabecera) y las tres páginas de formulario (`VehiculoFormPage.vue`, `MaquinariaFormPage.vue`, `EpiFormPage.vue`) usan `InventarioTabs` en edición y `InventarioForm` en alta.
- **Skeleton no animado:** `q-skeleton` con `animation="none"`.
- **Sin permiso propio por carpeta:** se muestran todas con el permiso de la ruta de edición (`elementos_inventario.editar`).
- **i18n** (`es` y `en-US`): `inventario.carpetas.*` (nombre de cada carpeta, aviso «Próximamente», botón «Volver al listado»), cabeceras provisionales de columnas por entidad y etiquetas de Costes.

**Out of scope (for future specs):**

- Crear las entidades Alertas, Tareas, Mantenimientos, ITVs, Revisiones, Costes, Documentos, Pólizas, Rutas, Personas, Equipos, Manuales y Plantillas (endpoints, stores, tablas reales y su CRUD). Cada una irá en su propia spec.
- Pantalla de detalle de solo lectura y filas clicables en el listado (siguen sin existir; el layout vive en la ruta de edición).
- Carpetas en el alta (`nuevo`) o carpetas deshabilitadas.
- Permisos por carpeta (p. ej. `alertas.ver`).
- Contadores o insignias en las pestañas.
- Carga perezosa con llamadas a la API por carpeta (no hay endpoints todavía).
- Reordenar o personalizar carpetas por usuario.

---

## Data model

Esta feature no introduce datos persistentes ni endpoints. Solo añade configuración estática de interfaz:

```ts
// src/components/inventario/InventarioTabs.vue (o constante del mismo módulo)
type CarpetaKey =
  | 'informacion' | 'alertas' | 'tareas' | 'mantenimientos' | 'itvs' | 'revisiones'
  | 'costes' | 'documentos' | 'polizas' | 'rutas' | 'personas' | 'equipos'
  | 'manuales' | 'plantillas';

type CarpetaKind = 'form' | 'table' | 'costes';

interface CarpetaConfig {
  key: CarpetaKey;
  kind: CarpetaKind;       // 'form' solo para 'informacion'
  icon: string;            // icono Material de la pestaña
  columns?: string[];      // claves i18n de cabeceras provisionales (kind 'table')
  labels?: string[];       // claves i18n de etiquetas (kind 'costes')
}

// Carpetas por TipoElemInventarioId (1 vehículos, 2 maquinaria, 3 EPIs)
const CARPETAS: Record<1 | 2 | 3, CarpetaConfig[]>;
```

Convenciones:

- La clave de carpeta en la URL es `CarpetaKey` en minúsculas, sin acentos.
- Las cabeceras provisionales y las etiquetas de Costes son texto de interfaz en i18n; se sustituirán por las columnas reales en la spec de cada entidad.
- Vehículos y maquinaria comparten la misma lista de carpetas; EPIs tiene la suya.

---

## Implementation plan

1. **i18n.** Añadir `inventario.carpetas.*`, cabeceras provisionales por entidad, etiquetas de Costes, «Próximamente» y «Volver al listado» en `es` y `en-US`. Verificación: type-check sin errores.
2. **Skeletons.** Crear `SkeletonTablePlaceholder.vue` y `SkeletonCostesCard.vue`, ambos con `q-skeleton animation="none"`. Verificación: renderizan en un montaje de prueba con cabeceras y etiquetas de ejemplo.
3. **Layout de carpetas.** Crear `InventarioTabs.vue` con `CARPETAS` por tipo, `q-tabs` horizontal con scroll, paneles y sincronización con `?carpeta=`. Verificación: con un slot de prueba para «Información», cambiar de pestaña actualiza la query y recargar mantiene la carpeta.
4. **Adaptar `InventarioForm.vue`.** Permitir su uso embebido en la carpeta «Información» sin duplicar título ni `AdminPageWrapper`/`GlassCard`, conservando el alta tal cual. Verificación: el alta sigue idéntica y la edición guarda igual que antes.
5. **Integrar en las páginas.** En `VehiculoFormPage.vue`, `MaquinariaFormPage.vue` y `EpiFormPage.vue`, usar `InventarioTabs` si hay `:id` e `InventarioForm` si no. Verificación manual en `/#/inventario/<tipo>/<id>/editar` y `/#/inventario/<tipo>/nuevo` para los tres tipos.

---

## Acceptance criteria

- [ ] `/#/inventario/vehiculos/<id>/editar` y `/#/inventario/maquinaria/<id>/editar` muestran 12 pestañas en el orden definido; `/#/inventario/epis/<id>/editar` muestra 8.
- [ ] Al abrir la pantalla sin query está activa «Información» y se ve el formulario con los mismos campos que antes de esta spec.
- [ ] Guardar en «Información» llama a `PUT /elems-inventario/{id}` igual que antes y vuelve al listado; «Cancelar» sigue funcionando.
- [ ] Las carpetas distintas de «Información» no muestran «Guardar» ni «Cancelar» y sí un botón «Volver al listado» que lleva al listado del tipo.
- [ ] Cada carpeta de tabla muestra cabeceras de columnas, filas de skeleton sin animación y el aviso «Próximamente».
- [ ] La carpeta «Costes» de los tres tipos muestra una card con etiquetas y valores en skeleton sin animación.
- [ ] Seleccionar una pestaña actualiza la URL a `?carpeta=<clave>` sin añadir entradas al historial; recargar o abrir esa URL deja activa esa carpeta.
- [ ] Una clave de carpeta inexistente o de otro tipo (p. ej. `?carpeta=manuales` en un vehículo) abre «Información».
- [ ] `/#/inventario/<tipo>/nuevo` sigue mostrando el formulario sin pestañas, sin cambios de comportamiento.
- [ ] Ninguna carpeta lanza peticiones a la API adicionales a las del formulario actual.
- [ ] En ancho móvil las pestañas hacen scroll horizontal y no desbordan la página.
- [ ] La vista usa `GlassCard`, `font-outfit` y colores teal como el resto de pantallas, en temas Clásico y Claro.
- [ ] Todos los textos nuevos existen en `es` y `en-US`.
- [ ] `pnpm lint` y el type-check pasan sin errores nuevos.

---

## Decisions taken and discarded

- **Pestañas horizontales con scroll** (decisión del usuario) frente a pestañas verticales o rejilla de tarjetas-carpeta: 12 carpetas caben mejor, es el patrón estándar de Quasar y funciona en móvil.
- **Solo en edición, alta sin carpetas** (decisión del usuario): no hay elemento al que asociar las entidades hasta crearlo, y evita pestañas deshabilitadas.
- **El layout vive en `:id/editar`** frente a crear una ruta de detalle: la «pantalla de detalle» de `tabs.md` es hoy la de edición; una ruta de detalle de solo lectura queda para otra spec.
- **Carpeta activa en la URL (`?carpeta=`)** (decisión del usuario) frente a estado local: sobrevive a recargas y se puede compartir.
- **Skeleton no animado + cabeceras + «Próximamente»** (decisión del usuario) frente a skeleton animado puro: la animación sugeriría una carga en curso y el aviso deja claro que la entidad aún no existe.
- **Componentes genéricos** (`InventarioTabs`, `SkeletonTablePlaceholder`, `SkeletonCostesCard`) (decisión del usuario) frente a un componente por carpeta: evita ~13 archivos casi idénticos.
- **Etiquetas genéricas en Costes** (decisión del usuario), ajustables cuando exista la entidad.
- **Sin permiso por carpeta** (decisión del usuario): las entidades no existen; el permiso de cada una se define en su spec.
- **Guardar/Cancelar solo en «Información»** (decisión del usuario): solo afectan a ese formulario.
- **Vehículos y maquinaria comparten lista de carpetas**, tal como indica `tabs.md`; el texto de `tabs.md` para EPIs repite «vehículos y maquinaria» por error de copia y se interpreta como la lista propia de EPIs.
- **El estado de la spec se escribe en español** (`Borrador`), siguiendo las SPEC anteriores.

---

## Identified risks

- **Refactor de `InventarioForm.vue` (~1400 líneas):** extraer título y envoltorio puede romper el alta o la edición. Mitigación: cambio mínimo (prop o slot para no pintar cabecera/envoltorio) y verificación manual de alta y edición de los tres tipos en el paso 4.
- **Estado del formulario al cambiar de pestaña:** si los paneles desmontan «Información», se pierden cambios sin guardar. Mitigación: usar `keep-alive` en `q-tab-panels` para conservar el formulario.
- **Cabeceras provisionales que no coincidan con las columnas finales:** son texto de interfaz y se reemplazan en la spec de cada entidad.
- **Query `?carpeta=` inválida o manipulada:** se normaliza a «Información».
- **Doce pestañas en pantallas estrechas:** `q-tabs` con `outside-arrows` / scroll; verificado en ancho móvil.

---

## What is **not** in this spec

- Las entidades relacionadas (endpoints, stores, tablas reales y CRUD).
- Pantalla de detalle de solo lectura y filas clicables.
- Carpetas en el alta ni carpetas deshabilitadas.
- Permisos por carpeta, contadores en pestañas y carga por carpeta.

Cada uno de esos puntos, si se aborda, va en su propia spec.
