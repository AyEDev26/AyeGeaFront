# SPEC 17 — Tarjeta «Buscar» por referencia en la página Home

> **Status:** Aprobado
> **Depends on:** SPEC 13 (listados y store `elemsInventario.ts`, filtro `referencia`, `TipoElemInventarioId`), SPEC 14 (rutas `inventario/*/:id/editar`), SPEC 15 (la edición es la pantalla con carpetas). Complementa a SPEC 16 (el QR de la ficha codifica la referencia).
> **Date:** 2026-10-24
> **Objective:** Añadir a la página Home una tarjeta «Buscar» con un campo de referencia y un botón que busque el elemento de inventario con esa referencia (vehículo, maquinaria o EPI) y navegue a su pantalla de detalle, o muestre un mensaje si no existe.

---

## Scope

**In:**

- **Tarjeta «Buscar»** en `IndexPage.vue`, justo debajo de la tarjeta hero y encima de «Funcionalidades destacadas». Usa `GlassCard`, título `font-outfit text-teal-10`, icono `search` y los inputs densos de la guía de estilo.
- **Visibilidad:** solo si el usuario tiene `elementos_inventario.ver` (`auth.hasPermission`). Sin permiso, la tarjeta no se renderiza.
- **Campo de referencia** (`q-input`, un único valor de texto) y botón «Buscar» (`no-caps`, `elegant-btn`, colores teal). El botón se desactiva con el campo vacío (tras `trim`) y muestra `loading` durante la búsqueda. Pulsar Enter en el campo equivale a pulsar el botón.
- **Búsqueda en los 3 tipos a la vez:** tres peticiones en paralelo a `GET /elems-inventario` (una por `tipo_elemento_inventario_id` 1, 2 y 3) con `referencia=<texto>` y `per_page=100`, sin tocar el estado `byTipo` de los listados.
- **Coincidencia exacta sin distinguir mayúsculas:** el filtro de la API puede ser parcial; en cliente se comparan `trim` + minúsculas de `referencia` con las de cada resultado y solo se acepta la igualdad exacta.
- **Resultado único:** navega con `router.push` a `inventario/<vehiculos|maquinaria|epis>/<id>/editar` (la pantalla de detalle con carpetas de SPEC 15) y limpia el campo.
- **Resultado no encontrado:** mensaje inline bajo el campo (`q-input` con `error` + `error-message`, color `red-9`): «No existe ningún elemento con la referencia «X» en el inventario». Se borra al volver a escribir. No se usa notificación.
- **Sin permiso de edición:** si se encuentra el elemento pero el usuario no tiene `elementos_inventario.editar` (permiso de la ruta de destino), no se navega y se muestra un mensaje inline distinto: «El elemento existe pero no tienes permiso para abrir su ficha».
- **Referencia repetida:** si hay más de un elemento con la misma referencia exacta, se usa el primero y se continúa sin aviso (la API no garantiza unicidad; ver riesgos).
- **Errores de red/API:** si alguna de las peticiones falla, mensaje inline con `getApiErrorMessage` / mensaje genérico en `red-9` y el botón vuelve a su estado normal; no se navega aunque otra petición haya devuelto resultado.
- **Código nuevo:**
  - `src/components/home/HomeSearchCard.vue`: la tarjeta, con su estado local (texto, loading, error).
  - `findElemByReferencia(referencia)` en `src/stores/elemsInventario.ts`: ejecuta las tres peticiones, filtra por igualdad exacta y devuelve `{ id, tipoId } | null`.
  - Mapa tipo → ruta (`1: 'vehiculos'`, `2: 'maquinaria'`, `3: 'epis'`) reutilizando el que ya exista en el proyecto si lo hay; si no, constante local.
- **Cambios en archivos existentes:** `src/pages/IndexPage.vue` (incluye la tarjeta), `src/stores/elemsInventario.ts`, `src/i18n/es/index.ts` y `src/i18n/en-US/index.ts`.
- **i18n** (`es` y `en-US`): `home.search.*` (título, etiqueta del campo, placeholder, botón, no encontrado con parámetro `{referencia}`, sin permiso, error genérico).

**Out of scope (for future specs):**

- Pantalla de detalle de solo lectura y rutas nuevas (el destino es la edición actual).
- Búsqueda por otros campos (nombre, matrícula, nº de serie) o búsqueda parcial con lista de resultados.
- Lectura/escaneo de QR con la cámara.
- Selector de tipo en la tarjeta.
- Autocompletado, historial de búsquedas o búsqueda global en la barra superior.
- Búsqueda en entidades que aún no existen (alertas, mantenimientos, etc.).
- Cambios en el backend (endpoint dedicado de búsqueda por referencia).

---

## Data model

Esta feature no introduce datos persistentes ni endpoints nuevos. Solo una estructura de retorno en memoria:

```ts
// src/stores/elemsInventario.ts
interface ElemReferenciaMatch {
  id: number;
  tipoId: TipoElemInventarioId; // 1 vehículos, 2 maquinaria, 3 EPIs
}

// Devuelve null si no hay coincidencia exacta en ninguno de los 3 tipos.
function findElemByReferencia(referencia: string): Promise<ElemReferenciaMatch | null>;
```

Convenciones:

- La petición reutiliza el mapeo existente (`mapElem`) y el filtro `referencia` de `buildFilterParams`.
- Las claves de i18n siguen el patrón `home.*` ya existente.

---

## Implementation plan

1. **i18n.** Añadir `home.search.*` en `es` y `en-US`. Verificación: type-check sin errores.
2. **Búsqueda en el store.** Añadir `findElemByReferencia` en `elemsInventario.ts` (tres peticiones en paralelo, igualdad exacta `trim` + minúsculas, sin modificar `byTipo`). Verificación: llamarla desde la consola/devtools con una referencia existente de cada tipo y con una inexistente.
3. **Tarjeta.** Crear `HomeSearchCard.vue` con campo, botón, `loading`, Enter, mensajes inline y navegación por tipo, con comprobación de `elementos_inventario.editar` antes de navegar. Verificación: montada en Home, un elemento de cada tipo abre su `…/editar`; una referencia inexistente muestra el mensaje.
4. **Integrar en Home.** Incluir la tarjeta en `IndexPage.vue` bajo el hero y condicionada a `elementos_inventario.ver`. Verificación: con y sin permiso, en temas Clásico y Claro y en ancho móvil.
5. **Casos límite.** Probar mayúsculas/minúsculas, espacios alrededor, referencia parcial (no debe navegar), campo vacío, error de red y usuario sin permiso `editar`. Verificación: cada caso se comporta según los criterios.

---

## Acceptance criteria

- [ ] En Home aparece la tarjeta «Buscar» bajo el hero con campo de referencia y botón «Buscar» si el usuario tiene `elementos_inventario.ver`; sin ese permiso no aparece.
- [ ] El botón está desactivado con el campo vacío o solo con espacios y muestra `loading` mientras dura la búsqueda.
- [ ] Pulsar el botón o Enter lanza exactamente tres peticiones `GET /elems-inventario` (tipos 1, 2 y 3) con el filtro `referencia`, y ninguna otra.
- [ ] Con la referencia de un vehículo, una maquinaria y un EPI existentes se navega a `/#/inventario/vehiculos/<id>/editar`, `/#/inventario/maquinaria/<id>/editar` y `/#/inventario/epis/<id>/editar` respectivamente, mostrando la carpeta «Información».
- [ ] La búsqueda no distingue mayúsculas/minúsculas ni espacios al inicio o al final.
- [ ] Una referencia que solo coincide parcialmente con otra existente no navega y muestra el mensaje de no encontrado.
- [ ] Una referencia inexistente muestra bajo el campo, en `red-9`, el mensaje con la referencia escrita; no se navega y desaparece al editar el campo.
- [ ] Si el elemento existe pero el usuario carece de `elementos_inventario.editar`, no se navega y se muestra el mensaje de falta de permiso.
- [ ] Si una petición falla, se muestra el error inline, no se navega y el botón recupera su estado normal.
- [ ] Tras una navegación correcta el campo queda vacío al volver a Home.
- [ ] La búsqueda no modifica el estado `byTipo` de los listados (la página, filtros y filas de los listados se conservan).
- [ ] La tarjeta usa `GlassCard`, `font-outfit` y colores teal, coherente con Home en temas Clásico y Claro y sin desbordar en ancho móvil.
- [ ] Todos los textos nuevos existen en `es` y `en-US`.
- [ ] `pnpm lint` y el type-check pasan sin errores nuevos.

---

## Decisions taken and discarded

- **Coincidencia exacta sin distinguir mayúsculas** (decisión del usuario) frente a búsqueda parcial: la acción «navegar a un elemento» exige un resultado inequívoco y es el valor que codifica el QR de SPEC 16.
- **Búsqueda en los 3 tipos a la vez** (decisión del usuario) frente a un selector de tipo: el usuario tiene la referencia, no tiene por qué saber el tipo. Se hacen tres peticiones en paralelo en lugar de una sin tipo para no depender de que la API admita omitir `tipo_elemento_inventario_id`; si la API lo admitiera, se puede simplificar en otra spec.
- **Destino: la edición con carpetas** (decisión del usuario) frente a crear una pantalla de solo lectura: es la única «página de detalle» que existe (SPEC 15) y una vista de solo lectura requiere su propia spec y modelo de permisos.
- **Mensaje inline y tarjeta con permiso `ver`** (decisión del usuario) frente a notificación y tarjeta siempre visible: el mensaje queda asociado al campo y no se ofrece una acción a quien no puede usarla.
- **Aviso específico si falta `editar`:** el guard de la ruta redirigiría sin explicación; es preferible distinguir «no existe» de «no puedes abrirla».
- **Primer resultado ante referencias duplicadas:** la API no garantiza unicidad de `referencia`; no se bloquea al usuario. Asumido por defecto (no confirmado expresamente).
- **Ubicación bajo el hero** (asumido por defecto): visible sin scroll y antes de las funcionalidades destacadas.
- **Función en el store, sin tocar `byTipo`:** evita que una búsqueda desde Home sobrescriba página y filtros de los listados.
- **El estado de la spec se escribe en español** (`Borrador`), siguiendo las SPEC anteriores.

---

## Identified risks

- **Filtro `referencia` parcial o sensible a mayúsculas en el backend:** si es exacto y sensible a mayúsculas, una búsqueda en minúsculas podría no devolver el elemento aunque exista. Mitigación: comprobar en el paso 2 el comportamiento real; si el backend no es insensible, pedirlo o aplicar `per_page` mayor con filtro parcial.
- **Referencias duplicadas** entre tipos o dentro de un tipo: se navega al primero. Mitigación: verificar si el backend impone unicidad; si no, tratar en otra spec.
- **Paginación:** `per_page=100` con filtro parcial podría dejar fuera la coincidencia exacta si hubiera más de 100 parciales. Riesgo bajo; verificar en el paso 5.
- **Tres peticiones por búsqueda:** coste mínimo; si alguna falla, se aborta la búsqueda y se informa.
- **Usuarios con `ver` pero sin `editar`:** no pueden abrir ninguna ficha hasta que exista el detalle de solo lectura. Mitigación: mensaje explícito.

---

## What is **not** in this spec

- Pantalla de detalle de solo lectura ni rutas nuevas.
- Búsqueda por nombre, matrícula, nº de serie o parcial con lista de resultados.
- Escaneo de QR.
- Selector de tipo, autocompletado o búsqueda global en la barra superior.
- Endpoint de búsqueda en el backend.

Cada uno de esos puntos, si se aborda, va en su propia spec.
