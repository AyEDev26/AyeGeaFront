# SPEC 21 — Separar columna log/evento en dos columnas con filtros independientes

> **Status:** Aprobado
> **Depends on:** SPEC 13 (log de actividad)
> **Date:** 2026-09-23
> **Objective:** En la página de log de actividad (`/admin/actividad`), separar la columna combinada "Log/Evento" en dos columnas independientes (Log y Evento) y añadir un filtro server-side independiente para `event`, análogo al filtro ya existente para `log_name`.

---

## Por qué existe esta spec

SPEC 13 introdujo la página con una única columna `logEvent` que combina `log_name` y `event` en un chip "logName / event", y un filtro de texto que solo cubre `log_name`. Se confirmó contra la documentación OpenAPI real del backend (`GET /activity-log` en `https://empresa1.ayecore.es/docs?api-docs.json`) que `event` es un query param independiente de `log_name` (string, ejemplo `"login"`, sin nota de "búsqueda parcial" — a diferencia de `description`, que sí la documenta explícitamente). Esto hace que la separación sea viable como filtro real contra el backend, no solo un cambio cosmético de la tabla.

---

## Scope

**In:**

- `src/stores/activityLog.ts`: añadir `event?: string` a `ActivityLogFilters`, y mapear `filters.event` al query param `event` en `fetchLogs`.
- `src/pages/admin/ActivityLogPage.vue`:
  - Columnas de la tabla: reemplazar la columna única `logEvent` por dos columnas independientes `logName` ("Log") y `event` ("Evento"), cada una en su propia celda con un `q-chip` individual (mismo color `indigo-1`/`indigo-9` que el chip combinado actual).
  - Barra de filtros: nuevo input de texto para `event` (mismo patrón que el filtro `logName` existente: `outlined`, `dense`, `clearable`, con hint indicando coincidencia exacta), ubicado junto al filtro de Log.
  - `buildFilters()`: incluir `result.event` cuando `filters.value.event` tenga valor.
  - `onClearClick()`: resetear también `filters.value.event`.
  - Diálogo de detalle: separar la fila combinada "Log/Evento" en dos filas independientes, "Log" y "Evento", cada una con su propio chip.
- i18n (`src/i18n/es/index.ts`, `src/i18n/en-US/index.ts`): reemplazar `admin.activityLog.columns.logEvent` por `columns.logName` y `columns.event`; añadir `filters.eventLabel`/`filters.eventHint`; en el bloque `detail`, separar la clave combinada en dos (una por Log, otra por Evento).

**Out of scope (para specs futuras):**

- Filtro por `properties` — existe en el backend pero no se pidió, y no estaba en SPEC 13.
- Catálogo/dropdown de valores posibles de `event` o `log_name` — igual que SPEC 13, el backend no expone un endpoint de valores distintos.
- Persistir filtros o paginación en la URL — igual que SPEC 13, el estado sigue viviendo solo en el componente.
- Cualquier cambio a la lógica de causante, rango de fechas, paginación o permisos — no se tocan en esta spec.
- Rediseño del resto de columnas (fecha, descripción, causante) — no cambian salvo el ancho relativo de la tabla al dividirse la columna log/evento en dos.

---

## Data model

Este spec no introduce datos de dominio nuevos. Extiende una interfaz existente:

```ts
// src/stores/activityLog.ts
export interface ActivityLogFilters {
  logName?: string;
  event?: string; // nuevo
  description?: string;
  causerId?: number;
  createdFrom?: string;
  createdTo?: string;
}
```

`event` se envía al backend como query param `event` en `GET /activity-log`, junto a los ya existentes.

---

## Implementation plan

1. `src/stores/activityLog.ts`: añadir `event?: string` a `ActivityLogFilters` y mapearlo como `event: filters.event || undefined` en los `params` de `fetchLogs`. Prueba manual: llamar `fetchLogs(1, 15, { event: 'login' })` desde Vue Devtools/consola y confirmar en la pestaña de red que la petición incluye `?event=login` y que el backend devuelve solo entradas con ese evento.
2. i18n: en `es/index.ts` y `en-US/index.ts`, sustituir la clave `admin.activityLog.columns.logEvent` por `columns.logName` y `columns.event`; añadir `filters.eventLabel` y `filters.eventHint` (hint aclarando coincidencia exacta, igual que `logNameHint`); separar la clave combinada de `detail` en dos (Log / Evento). Prueba manual: cambiar de idioma en la app y confirmar que ambos idiomas muestran los textos nuevos sin claves rotas (`[missing]`).
3. `ActivityLogPage.vue` — columnas: reemplazar la definición de la columna `logEvent` por dos columnas `logName` y `event` en el array `columns`, y sus templates `#body-cell-logName`/`#body-cell-event` renderizando cada uno su propio `q-chip` (o `—` si el valor es `null`). Prueba manual: recargar `/admin/actividad` y confirmar que la tabla muestra dos columnas independientes con chips separados.
4. `ActivityLogPage.vue` — filtros: añadir el input de `event` en la barra de filtros (junto al de `logName`), añadir `event: ''` al `ref` de `filters`, incluirlo en `buildFilters()` y en el reset de `onClearClick()`. Prueba manual: escribir un valor en el filtro de Evento y pulsar "Filtrar"; confirmar en la pestaña de red que la petición incluye `event=...` y que la tabla se filtra en consecuencia.
5. `ActivityLogPage.vue` — diálogo de detalle: separar la fila combinada actual en dos filas independientes "Log" y "Evento", cada una con su chip. Prueba manual: hacer clic en una fila y confirmar que el diálogo muestra Log y Evento en líneas separadas.
6. Prueba manual end-to-end contra el backend real: filtrar solo por Log, solo por Evento, y combinando ambos (y opcionalmente con descripción/fechas/causante); confirmar que cada combinación filtra correctamente y que cambiar de página conserva el filtro de Evento activo igual que los demás.
7. Ejecutar `npm run lint` y corregir cualquier error introducido.
8. Ejecutar `npm run build` y confirmar que genera `dist/spa/index.html` sin errores.

---

## Acceptance criteria

- [ ] La tabla de `/admin/actividad` muestra dos columnas separadas, "Log" y "Evento", en vez de la columna combinada anterior, cada una con su propio chip.
- [ ] Existe un filtro de texto para "Evento" independiente del filtro de "Log", que envía el parámetro `event` a `GET /activity-log`.
- [ ] Filtrar solo por Log devuelve entradas con ese `log_name` exacto, sin restringir por evento.
- [ ] Filtrar solo por Evento devuelve entradas con ese `event` exacto, sin restringir por log.
- [ ] Combinar Log + Evento (y opcionalmente otros filtros existentes) aplica todos los filtros simultáneamente.
- [ ] El botón "Limpiar filtros" también resetea el filtro de Evento.
- [ ] Cambiar de página con el filtro de Evento activo lo conserva en la siguiente petición, igual que los demás filtros.
- [ ] El diálogo de detalle muestra "Log" y "Evento" en filas independientes, cada una con su chip.
- [ ] Una entrada con `event` `null` muestra "—" en la columna Evento (mismo criterio que hoy aplica a `log_name` `null`).
- [ ] `npm run lint` termina sin errores.
- [ ] `npm run build` genera `dist/spa/index.html` sin errores.

---

## Decisions

- **Sí:** implementar el filtro de `event` como filtro server-side real (no solo cosmético), tras confirmar contra la documentación OpenAPI en vivo del backend que el parámetro `event` existe en `GET /activity-log`.
- **Sí:** un `q-chip` individual por columna (Log y Evento), manteniendo el lenguaje visual ya usado en la página en vez de pasar a texto plano.
- **Sí:** separar también el diálogo de detalle en dos filas, por consistencia con la tabla.
- **Sí:** filtro de Evento con coincidencia exacta, mismo patrón que el filtro de Log ya existente — el backend no documenta "búsqueda parcial" para `event` (a diferencia de `description`, que sí lo indica explícitamente).
- **No:** filtro por `properties` — existe en el backend pero no se pidió; fuera de alcance de esta spec.
- **No:** catálogo/dropdown de valores posibles de `event` — mismo motivo que SPEC 13 para `log_name`: el backend no expone un endpoint de valores distintos.

---

## Risks

| Riesgo                                                                                                                              | Mitigación                                                                                                                                                        |
| ----------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| El backend podría resolver `event` con coincidencia parcial en vez de exacta, aunque la documentación no lo indique explícitamente. | Verificar manualmente en el paso 6 probando un valor parcial de `event` contra el backend real; si hace match parcial, ajustar el hint del input en consecuencia. |

---

## What is **not** in this spec

- Filtro por `properties`.
- Catálogo/dropdown de valores posibles de `event` o `log_name`.
- Persistencia de filtros o paginación en la URL.
- Cambios a la lógica de causante, rango de fechas, paginación o permisos.
- Rediseño del resto de columnas de la tabla.

Cada uno de estos, si se necesita, va en su propia spec.
