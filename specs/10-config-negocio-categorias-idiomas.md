# SPEC 10 — Adaptación de configuración de negocio a categorías e idiomas

> **Status:** Aprobado
> **Depends on:** SPEC 01, SPEC 03, SPEC 04, SPEC 05, SPEC 08
> **Date:** 2026-09-04
> **Objective:** Adaptar el store `config.ts` y `BusinessConfigPage.vue` (SPEC 05) al nuevo contrato de `/config/business`, que ahora agrupa las reglas por categoría y traduce `label`/`description` en el servidor según el header `X-Locale`.

---

## Por qué existe esta spec

SPEC 05 se escribió contra una versión de `/config/business` que devolvía un objeto plano `{ [clave]: { value, description } }`. El swagger actual (`http://80.240.127.117:8081/api/documentation#/`, revisado el 2026-09-04) documenta un contrato distinto:

- `GET /config/business` devuelve `data.categories.{claveCategoria}` con `label`, `description` e `items.{claveRegla}` (`value`, `description`, `editable`).
- `PATCH /config/business` sigue aceptando `{ [clave]: nuevoValor }`, pero ahora rechaza explícitamente con `422` tanto claves desconocidas como claves con `editable: false`.
- Ambos endpoints aceptan un header `X-Locale` (`es` | `en`, default `es`) que traduce `label`/`description` de categorías y reglas **en el servidor**. Esto es traducción de datos del backend, distinta de `vue-i18n` (SPEC 08), que solo traduce textos estáticos del front — hoy ningún request del proyecto envía `X-Locale` ni `Accept-Language`.

Esta spec reemplaza el modelo de datos y la UI de SPEC 05 por el nuevo contrato, sin tocar el resto de la app (permisos, ruta, ítem de navegación, guard de router de SPEC 05 se mantienen igual).

---

## Scope

**In:**

- Reescribir el modelo de datos de `src/stores/config.ts`: de `BusinessRule[]` plano a una estructura de categorías (`BusinessCategory[]`), cada una con sus propias `BusinessConfigItem[]` (ver Data model).
- `fetchBusinessConfig()` y `updateBusinessConfig(changes)` envían el header `X-Locale` en cada llamada (`GET` y `PATCH`), derivado de `useLocaleStore().current` (`'en-US'` → `'en'`, cualquier otro valor → `'es'`). Esta traducción es una excepción puntual dentro de `config.ts`; no se toca `src/boot/axios.ts` ni se agrega un header global a otros requests (decisión ya tomada en SPEC 08).
- Cada regla (`BusinessConfigItem`) trae su propio flag `editable`. Un campo es editable en la UI solo si se cumplen **ambas** condiciones: el usuario tiene el permiso `configuracion.editar` (ya existente, SPEC 05) **y** la regla trae `editable: true`. Si falta cualquiera de las dos, el campo se muestra deshabilitado.
- Indicador visual de solo-lectura: un ícono (candado) junto a cada campo deshabilitado, con tooltip que explica el motivo — "No tienes permiso para editar esta configuración" si falta `configuracion.editar`, o "Esta regla no se puede editar desde la aplicación" si el usuario sí tiene el permiso pero la regla trae `editable: false`.
- `BusinessConfigPage.vue` reestructurada con `q-tabs`: una tab por categoría, usando `category.label` (ya traducido por el backend) como texto de la tab. El contenido de cada tab muestra `category.description` como subtítulo y, debajo, un campo editable por cada `BusinessConfigItem` de esa categoría (misma detección de tipo por `typeof value` que SPEC 05: número → `q-input type="number"`, booleano → `q-toggle`, string → `q-input` texto, otro tipo → solo lectura con `JSON.stringify`), mostrando `item.description` como `hint`.
- Badge de cambios sin guardar por tab: cada tab muestra un indicador (punto/badge de Quasar) si esa categoría tiene al menos una clave con ediciones locales sin guardar, para detectar cambios pendientes en categorías no visibles en ese momento.
- Guardado y descarte por categoría (no global): cada tab tiene su propio botón "Guardar cambios" y "Descartar cambios" (visibles solo si esa categoría tiene claves sucias, y solo con `configuracion.editar`). "Guardar cambios" arma el `PATCH` únicamente con las claves sucias de la categoría activa; tras éxito, refresca con un nuevo `fetchBusinessConfig()` completo (todas las categorías, igual que SPEC 05) y limpia el estado "sucio" de esa categoría. "Descartar cambios" revierte solo las claves de la categoría activa a su último valor cargado, sin afectar ediciones pendientes en otras categorías.
- Buscador de reglas: un campo de búsqueda único, visible fuera de las tabs, que filtra por coincidencia (case-insensitive) contra la clave o la `description` de cada regla, en todas las categorías a la vez. Si la tab activa no tiene resultados pero otra categoría sí, la tab activa cambia automáticamente a la primera categoría (en el orden devuelto por el backend) con al menos una coincidencia. Dentro de cada tab, con búsqueda activa, solo se muestran las reglas que matchean; si ninguna categoría tiene resultados, se muestra un estado vacío ("Sin resultados para tu búsqueda").
- Notificaciones (Quasar `Notify`), estados de carga y manejo de errores `403`/`422` en el guardado: mismo comportamiento que SPEC 05 (las ediciones locales del usuario no se revierten ante un error).

**Out of scope (for future specs):**

- Todo lo ya declarado fuera de alcance en SPEC 05 y no afectado por este cambio de contrato: crear/eliminar/renombrar reglas o categorías, editar `label`/`description` de categorías o reglas, historial/auditoría de cambios, advertencia de "cambios sin guardar" al navegar fuera de la pantalla, y cualquier namespace de configuración además de `business`.
- Revisar o ajustar el catálogo real de permisos `configuracion.ver`/`configuracion.editar` contra el backend — sigue siendo el riesgo ya documentado en SPEC 05, no forma parte de esta adaptación.
- Enviar `X-Locale` en cualquier otro request de la app fuera de `config.ts`. Sigue vigente la decisión de SPEC 08 de no usar un header de idioma global.
- Permitir cambiar el idioma activo desde `BusinessConfigPage.vue` — el idioma sigue determinado únicamente por el selector de las pantallas de auth (SPEC 08); esta pantalla solo lee el idioma ya elegido.
- Un editor genérico para reglas cuyo `value` sea objeto/array/`null` — se mantienen de solo lectura, igual que en SPEC 05.
- Traducción del texto propio de la pantalla (botones "Guardar cambios"/"Descartar cambios", placeholder del buscador, tooltip de solo-lectura, estado vacío de búsqueda) — se agrega como claves i18n normales dentro del alcance ya existente de SPEC 08 (`admin.businessConfig.*`), no requiere una spec aparte.

---

## Data model

```ts
// src/stores/config.ts
export interface BusinessConfigItem {
  key: string;
  value: number | string | boolean | null | unknown[] | Record<string, unknown>;
  description: string;
  editable: boolean;
}

export interface BusinessCategory {
  key: string;
  label: string;
  description: string;
  items: BusinessConfigItem[];
}

// Forma cruda de GET /config/business:
// data.categories.{claveCategoria} = { label, description, items: { [claveRegla]: { value, description, editable } } }
type RawBusinessConfig = {
  categories: Record<
    string,
    {
      label: string;
      description: string;
      items: Record<
        string,
        { value: BusinessConfigItem['value']; description: string; editable: boolean }
      >;
    }
  >;
};

interface ConfigState {
  categories: BusinessCategory[];
  loading: boolean;
  saving: boolean;
}
```

```ts
// src/stores/config.ts — header X-Locale derivado del locale activo
function toApiLocale(locale: AppLocale): 'es' | 'en' {
  return locale === 'en-US' ? 'en' : 'es';
}

async function fetchBusinessConfig() {
  const localeStore = useLocaleStore();
  const response = await api.get<{ data: RawBusinessConfig }>('/config/business', {
    headers: { 'X-Locale': toApiLocale(localeStore.current) },
  });
  categories.value = mapCategories(response.data.data.categories);
}

async function updateBusinessConfig(changes: Record<string, number | string | boolean>) {
  const localeStore = useLocaleStore();
  await api.patch('/config/business', changes, {
    headers: { 'X-Locale': toApiLocale(localeStore.current) },
  });
  await fetchBusinessConfig();
}
```

El orden de categorías y de reglas dentro de cada categoría se preserva tal como llega del backend (los objetos JS conservan el orden de inserción de claves string), igual que hacía SPEC 05 con las reglas planas.

En `BusinessConfigPage.vue`, el estado local de ediciones (`draft`) deja de estar acotado a una sola lista de reglas y pasa a ser un único `Record<string, number | string | boolean>` que puede contener claves de cualquier categoría a la vez (necesario para que el badge de cambios sin guardar funcione en tabs no activas). Al calcular las claves "sucias" por categoría, se filtra `draft` contra las claves de `items` de esa categoría específica.

No se persiste nada de esto en `localStorage`: se recarga desde el backend cada vez que se entra a `/admin/configuracion`, igual que SPEC 05.

---

## Implementation plan

1. Reescribir `src/stores/config.ts`: reemplazar `BusinessRule`/`rules` por `BusinessCategory`/`categories` (ver Data model), con una función `mapCategories(raw)` que transforma el objeto crudo en `BusinessCategory[]`. Prueba manual: en Vue Devtools, tras llamar a `fetchBusinessConfig()`, `categories` contiene las categorías de ejemplo documentadas (`modo_funcionamiento`, `smtp_config`) con sus `items`.
2. Agregar el header `X-Locale` a `fetchBusinessConfig()` y `updateBusinessConfig()`, derivado de `useLocaleStore().current` vía `toApiLocale()`. Prueba manual contra el backend real: con el idioma activo en inglés (elegido en una pantalla de auth antes de loguearse), el `label`/`description` de las categorías y reglas llega en inglés; con español, en español (verificable en la pestaña Network, header del request y contenido de la respuesta).
3. Actualizar `updateBusinessConfig(changes)` sin cambios de firma (sigue recibiendo `Record<string, valor>` con claves de cualquier categoría); confirmar que el backend acepta un `PATCH` con claves de distintas categorías en un mismo request si hiciera falta, aunque el flujo normal de la UI solo envíe claves de una categoría a la vez (paso 8). Prueba manual: `PATCH` con una clave marcada `editable: false` responde `422`, confirmando el nuevo comportamiento de validación del backend.
4. Reestructurar `BusinessConfigPage.vue` con `q-tabs`/`q-tab-panels`: una tab por `category.key`, título `category.label`, contenido con `category.description` como subtítulo. Prueba manual: la pantalla muestra una tab por cada categoría real devuelta por el backend, con el label correcto.
5. Renderizar dentro de cada tab un campo por `BusinessConfigItem`, con la misma detección de tipo por `typeof value` que SPEC 05 y `item.description` como `hint`. Campo editable solo si `configuracion.editar` **y** `item.editable === true`; en caso contrario, deshabilitado con ícono de candado y tooltip según el motivo (ver Scope). Prueba manual: una regla con `editable: false` se muestra deshabilitada con el tooltip correcto aunque el usuario tenga `configuracion.editar`.
6. Cambiar el estado local de ediciones (`draft`) de por-categoría a un único mapa global de claves sucias (ver Data model), y calcular el badge de cambios sin guardar por tab comparando `draft` contra las claves de `items` de cada categoría. Prueba manual: editar un campo en la categoría A y cambiar a la tab B muestra el badge en la tab A (no activa) indicando cambios pendientes.
7. Implementar "Guardar cambios" y "Descartar cambios" por categoría: el botón de guardado arma el `PATCH` solo con las claves sucias de la categoría activa, llama a `updateBusinessConfig(changes)`, refresca con `fetchBusinessConfig()` y limpia el estado sucio de esa categoría; "Descartar cambios" revierte solo las claves de la categoría activa. Prueba manual end-to-end contra el backend real: editar una regla, guardar desde su tab, recargar la página y confirmar que persiste; confirmar que ediciones sin guardar en otra categoría no se pierden ni se envían.
8. Agregar el campo de búsqueda global (fuera de las tabs) que filtra reglas por clave/`description` en todas las categorías, con auto-cambio de tab a la primera categoría con resultados y estado vacío si ninguna categoría tiene coincidencias. Prueba manual: buscar el texto de una regla que está en una categoría distinta a la tab activa cambia automáticamente a esa tab y solo muestra las reglas que matchean.
9. Agregar las claves i18n nuevas bajo `admin.businessConfig.*` en `src/i18n/es/index.ts` y `src/i18n/en-US/index.ts` (placeholder del buscador, tooltips de solo-lectura, estado vacío de búsqueda, textos de botones si cambian respecto a SPEC 05). Prueba manual: con el idioma en inglés, la pantalla completa (tabs, botones, tooltips, buscador) se muestra traducida.
10. Manejo de errores de `updateBusinessConfig`: mismo comportamiento que SPEC 05 (`Notify` de error con `getApiErrorMessage`, sin revertir ediciones locales del usuario) aplicado al guardado por categoría. Prueba manual: forzar un `422` (ej. editar una regla `editable: false` vía Devtools) y confirmar que aparece la notificación de error y el campo conserva el valor editado.

---

## Acceptance criteria

- [ ] `GET /config/business` se llama con el header `X-Locale` correcto (`es` o `en`) según el idioma activo, verificable en la pestaña Network.
- [ ] `BusinessConfigPage.vue` muestra una tab por cada categoría real devuelta por el backend, con el `label` traducido según el idioma activo.
- [ ] El subtítulo/descripción de cada categoría (`category.description`) es visible dentro de su tab.
- [ ] Una regla con `editable: true` y con el permiso `configuracion.editar` presente se muestra editable.
- [ ] Una regla con `editable: false` se muestra deshabilitada con un ícono/tooltip explicando el motivo, incluso si el usuario tiene `configuracion.editar`.
- [ ] Sin el permiso `configuracion.editar`, todos los campos de todas las categorías están deshabilitados (comportamiento heredado de SPEC 05).
- [ ] Editar un campo en una categoría y cambiar a otra tab muestra un badge de cambios sin guardar en la tab con ediciones pendientes.
- [ ] "Guardar cambios" en una categoría envía un único `PATCH /config/business` con solo las claves sucias de esa categoría (verificable en Network), sin incluir claves sucias de otras categorías.
- [ ] Tras guardar en una categoría, el formulario refleja los valores actualizados (releídos con un nuevo `GET`) y las ediciones pendientes en otras categorías no se pierden.
- [ ] "Descartar cambios" en una categoría revierte solo los campos de esa categoría a su último valor cargado, sin afectar ediciones pendientes en otras categorías.
- [ ] El buscador filtra reglas por clave o descripción en todas las categorías; si la coincidencia está en una categoría distinta a la activa, la pantalla cambia automáticamente a esa tab.
- [ ] Buscar un texto sin coincidencias en ninguna categoría muestra un estado vacío de búsqueda.
- [ ] Una respuesta `422` al guardar (ej. clave no editable) muestra una notificación de error legible y conserva el valor editado por el usuario en el campo.
- [ ] Un valor cuyo tipo no es `number`, `string` ni `boolean` se muestra como texto de solo lectura, sin campo editable, dentro de su categoría.
- [ ] Cambiar el idioma en una pantalla de auth y luego entrar a `/admin/configuracion` muestra tabs, textos propios de la pantalla, y `label`/`description` de categorías/reglas traducidos al idioma elegido.
- [ ] Recargar la página después de guardar muestra el valor actualizado (confirma que persistió en el backend).

---

## Decisions

- **Sí:** enviar `X-Locale` únicamente dentro de `src/stores/config.ts` (`GET`/`PATCH` de `/config/business`), en vez de agregar un header de idioma global en `src/boot/axios.ts`. Decisión explícita del usuario — respeta la decisión ya tomada en SPEC 08 de no mandar `Accept-Language`/idioma en cada request, tratando esta necesidad como una excepción puntual acotada al único endpoint que hoy la requiere.
- **Sí:** un campo es editable solo si se cumplen **ambas** condiciones — `configuracion.editar` (permiso de la app) **y** `item.editable === true` (flag del backend). Decisión explícita del usuario — combina de forma restrictiva el modelo de permisos de la app con el modelo de "reglas intocables" que ahora expone el backend.
- **Sí:** agrupación por categorías mediante `q-tabs`/`q-tab-panels`, en vez de acordeón o secciones apiladas. Decisión explícita del usuario.
- **Sí:** guardado y descarte por categoría (un botón por tab), en vez de un único botón global como en SPEC 05. Decisión explícita del usuario — con tabs, un botón global forzaría a revisar todas las categorías antes de guardar cualquier cambio.
- **Sí:** buscador global (todas las categorías) con auto-cambio de tab, en vez de un buscador acotado a la tab activa. Decisión explícita del usuario.
- **Sí:** indicador visual (ícono + tooltip) en cada campo de solo lectura, distinguiendo el motivo ("sin permiso" vs. "regla no editable"). Decisión explícita del usuario, agregada como mejora de UX sobre el contrato mínimo.
- **Sí:** badge de cambios sin guardar por tab. Decisión explícita del usuario, agregada como mejora de UX sobre el contrato mínimo.
- **No:** permitir un `PATCH` que combine claves de varias categorías desde la UI (aunque el endpoint lo soporte). Con guardado por categoría, cada `PATCH` real que dispara la UI solo contiene claves de la categoría activa; queda como comportamiento implícito de la UI, no como una restricción del backend.
- **No:** exponer un selector de idioma dentro de `BusinessConfigPage.vue`. Sigue vigente la decisión de SPEC 08: el idioma se elige únicamente en las pantallas de auth.
- **Sí (heredado de SPEC 05):** tras un `PATCH` exitoso, refrescar con un nuevo `GET /config/business` completo en vez de confiar en la forma de `data` de la respuesta del `PATCH`, que sigue sin documentar su shape en el swagger.

---

## Risks

| Riesgo                                                                                                                                                                                                                                                 | Mitigación                                                                                                                                                                                                                          |
| ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| El swagger no garantiza que el backend rechace un `PATCH` con claves de varias categorías a la vez; si la UI llegara a enviar una mezcla por un bug, el comportamiento real del backend ante eso no está probado.                                      | El guardado por categoría (paso 7 del plan) arma el `PATCH` filtrando estrictamente por las claves de `items` de la categoría activa; se verifica en Network durante la prueba manual que nunca se cuelan claves de otra categoría. |
| Si el backend no soporta `X-Locale` de forma consistente entre `GET` y `PATCH` (ej. un mensaje de error de `PATCH` queda en español aunque el idioma activo sea inglés), la UI mostraría una mezcla de idiomas en la notificación de error.            | Aceptado como límite del backend fuera de control del frontend; `getApiErrorMessage` sigue mostrando el mensaje tal como lo envía la API, igual que la decisión ya tomada en SPEC 08 sobre errores del backend.                     |
| El riesgo ya documentado en SPEC 05 sobre `configuracion.ver`/`configuracion.editar` no existiendo en el catálogo real de permisos sigue vigente y no se resuelve en esta spec.                                                                        | Ya evaluado en SPEC 05; no se repite el trabajo de verificación aquí, esta spec asume que la pantalla ya es accesible con esos permisos.                                                                                            |
| El buscador con auto-cambio de tab puede resultar desorientador si el usuario está a mitad de editar un campo en la tab activa y una búsqueda dispara un cambio de tab, ocultando temporalmente ese campo (aunque su edición en `draft` no se pierde). | Aceptado como trade-off de UX explícito del usuario; el badge de cambios sin guardar en la tab original permite volver a encontrarla fácilmente.                                                                                    |

---

## What is **not** in this spec

- Crear, eliminar o renombrar reglas o categorías de negocio.
- Editar `label`/`description` de categorías o reglas.
- Revisar el catálogo real de permisos `configuracion.ver`/`configuracion.editar` contra el backend.
- Enviar `X-Locale` en cualquier otro request de la app fuera de `config.ts`.
- Selector de idioma dentro de `BusinessConfigPage.vue`.
- Editor genérico para reglas con `value` de tipo objeto/array/`null`.
- Historial o auditoría de cambios de configuración.
- Advertencia de "cambios sin guardar" al navegar fuera de la pantalla.

Cada uno de estos, si se necesita, va en su propio spec.
