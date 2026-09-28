# SPEC 05 — Configuración de negocio

> **Status:** Aprobado
> **Depends on:** SPEC 01, SPEC 03
> **Date:** 2026-08-30
> **Objective:** Implementar una pantalla de administración que consulte y actualice las reglas de negocio expuestas por `GET`/`PATCH /config/business` de la API.

---

## Por qué existe esta spec

El backend expone un único módulo de configuración (`GET /docs?api-docs.json`, revisado el 2026-08-30): `/config/business`. `GET` devuelve un objeto dinámico `{ [clave]: { value, description } }` sin un schema fijo de reglas (el único ejemplo documentado, `numero_dias_desde_fecha_prevista_llegada_forecast`, tiene `value` numérico, pero el tipo no está restringido). `PATCH` acepta un objeto `{ [clave]: nuevoValor }` con una o varias claves ya existentes; no crea reglas nuevas ni permite tocar `description`. A diferencia de `/users` o `/roles` (SPEC 03), este endpoint no documenta ningún permiso de módulo específico — solo requiere `bearerAuth`. Esta spec sigue el mismo patrón de pantalla de administración que SPEC 03/04 (store Pinia + página protegida + guard de router + ítem de navegación), adaptado a un formulario de claves dinámicas en vez de una tabla paginada.

---

## Scope

**In:**

- Store `src/stores/config.ts` (Pinia store `config`): consulta de reglas de negocio (`GET /config/business`) y actualización de una o varias reglas a la vez (`PATCH /config/business`).
- Ruta `/admin/configuracion` con `BusinessConfigPage.vue`: formulario con un campo editable por cada regla devuelta por el backend, mostrando su descripción como texto de ayuda debajo del campo.
- Detección de tipo en runtime por regla: `value` numérico → `q-input type="number"`; `value` booleano → toggle; `value` string → `q-input` de texto. Cualquier otro tipo (objeto, array, `null`) se muestra como texto de solo lectura (`JSON.stringify`), sin campo editable.
- Edición local acumulada (sin guardar contra el backend hasta confirmar) y botón único "Guardar cambios" que envía en un solo `PATCH` solo las claves cuyo valor cambió respecto al último `GET`.
- Botón "Descartar cambios", visible solo si hay ediciones locales sin guardar, que revierte el formulario a los valores del último `fetchBusinessConfig()`.
- Tras un `PATCH` exitoso, refrescar el formulario volviendo a llamar a `GET /config/business` (no se asume la forma del `data` de la respuesta del `PATCH`, que no está documentada en el swagger).
- Nuevos permisos asumidos `configuracion.ver` (acceso a la ruta) y `configuracion.editar` (habilita los campos y el botón "Guardar cambios"); sin `configuracion.editar`, los campos se muestran deshabilitados (solo lectura) y no aparecen los botones "Guardar cambios"/"Descartar cambios".
- Guard de router: `/admin/configuracion` lleva `meta: { requiresAuth: true, requiresPermission: 'configuracion.ver' }`, igual mecanismo que SPEC 03 (redirige a `/` con notificación de error si falta el permiso).
- Ítem de navegación "Configuración" en el layout principal (`MainLayout.vue`), agrupado en la sección "Administración" junto a "Usuarios" y "Roles y permisos", visible solo si `hasPermission('configuracion.ver')`.
- Notificaciones (Quasar `Notify`) para: guardado exitoso, `403` (no autorizado) y `422` (regla desconocida o valor inválido) al hacer `PATCH`; en caso de error, las ediciones locales del usuario **no** se revierten, para que pueda corregir y reintentar.
- Estado de carga (spinner/skeleton) mientras se resuelve `GET /config/business`, y estado vacío si el backend devuelve un objeto sin claves.

**Out of scope (for future specs):**

- Crear, eliminar o renombrar reglas de negocio (el backend no lo permite; `PATCH` solo actualiza `value` de claves ya existentes).
- Editar la `description` de una regla (el backend no expone esa capacidad — se define a mano en `config/business_rules.json`).
- Edición de reglas cuyo valor no sea `number`, `string` o `boolean` (se muestran de solo lectura en esta spec).
- Historial o auditoría de cambios de configuración.
- Advertencia de "cambios sin guardar" al navegar fuera de la pantalla (no existe ese patrón en ninguna otra pantalla del proyecto).
- Cualquier otro namespace de configuración además de `business` (el swagger actual solo documenta `/config/business`).
- Internacionalización (i18n) de los textos de esta pantalla.

---

## Data model

```ts
// src/stores/config.ts (Pinia store "config")
interface BusinessRule {
  key: string;
  value: number | string | boolean | null | unknown[] | Record<string, unknown>;
  description: string;
}

interface ConfigState {
  rules: BusinessRule[];
  loading: boolean;
  saving: boolean;
}
```

El backend devuelve `data` como un objeto `{ [clave]: { value, description } }`; el store lo transforma a `BusinessRule[]` preservando el orden de claves recibido (los objetos JS conservan el orden de inserción de claves string). La página mantiene además un mapa local de ediciones en curso (`Record<string, number | string | boolean>`), comparado contra `rules` para calcular qué claves están "sucias" (con cambios sin guardar) y armar el body del `PATCH`.

No se persiste nada de esto en `localStorage`: se recarga desde el backend cada vez que se entra a `/admin/configuracion`.

---

## Implementation plan

1. Crear `src/stores/config.ts` con estado inicial vacío y la acción `fetchBusinessConfig()` contra `GET /config/business`, transformando el objeto `data` en `BusinessRule[]`. Prueba manual: en Vue Devtools, tras llamar a la acción, `rules` contiene la regla de ejemplo documentada con su `value` y `description`.
2. Añadir a `src/stores/config.ts` la acción `updateBusinessConfig(changes: Record<string, number | string | boolean>)` contra `PATCH /config/business`, que al resolver exitosamente vuelve a llamar a `fetchBusinessConfig()` para refrescar `rules` desde la fuente de verdad. Prueba manual: llamar a la acción con la clave de ejemplo y un valor distinto, confirmar en Devtools que `rules` refleja el nuevo valor tras la llamada.
3. Registrar la ruta `/admin/configuracion` en `src/router/routes.ts` con `meta: { requiresAuth: true, requiresPermission: 'configuracion.ver' }`, apuntando a un `BusinessConfigPage.vue` todavía vacío (placeholder). El guard existente de `src/router/index.ts` (SPEC 03) ya reacciona a `requiresPermission` sin cambios adicionales.
4. Añadir el ítem de navegación "Configuración" en `MainLayout.vue`, agrupado en la sección "Administración", envuelto en `v-if="authStore.hasPermission('configuracion.ver')"`.
5. Crear `src/pages/admin/BusinessConfigPage.vue` envuelta en `AdminPageWrapper`+`GlassCard` (SPEC 04): al montar, llama a `fetchBusinessConfig()` y muestra spinner mientras `loading`, o estado vacío si `rules` queda vacío tras cargar.
6. Renderizar en `BusinessConfigPage.vue` un campo editable por cada `BusinessRule`, con detección de tipo por `typeof value` (número → `q-input type="number"` + `.elegant-input`; booleano → `q-toggle`; string → `q-input` texto + `.elegant-input`; otro tipo → texto de solo lectura con `JSON.stringify(value)`), mostrando `description` como `hint`/caption debajo del campo. Todos los campos deshabilitados si falta `configuracion.editar`. Prueba manual: la pantalla muestra la regla de ejemplo con su input numérico y la descripción visible debajo.
7. Añadir el estado local de ediciones (`draft`) y el cálculo de claves "sucias" comparando `draft` contra `rules`; mostrar los botones "Guardar cambios" y "Descartar cambios" solo cuando hay al menos una clave sucia, y solo si el usuario tiene `configuracion.editar`. Prueba manual: cambiar el valor de un campo hace aparecer ambos botones; "Descartar cambios" revierte el campo a su valor original y oculta los botones.
8. Implementar el botón "Guardar cambios": arma el body solo con las claves sucias, llama a `updateBusinessConfig(changes)`, muestra `Notify` de éxito y limpia el estado "sucio" tras la respuesta. Prueba manual end-to-end contra el backend real: editar la regla de ejemplo, guardar, recargar la página y confirmar que el nuevo valor persiste.
9. Manejar errores de `updateBusinessConfig`: `Notify` de error con `getApiErrorMessage` (mensaje del backend para `403`/`422`), sin revertir las ediciones locales del usuario. Prueba manual: forzar un valor inválido (si se conoce alguna regla con restricción) o una clave inexistente vía Devtools y confirmar que aparece la notificación de error y el campo conserva el valor editado.

---

## Acceptance criteria

- [ ] Entrar a `/admin/configuracion` con un usuario que tiene `configuracion.ver` muestra el formulario con las reglas reales devueltas por el backend.
- [ ] Entrar a `/admin/configuracion` con un usuario sin `configuracion.ver` redirige a `/` con una notificación de error, sin llegar a renderizar la pantalla.
- [ ] El ítem de navegación "Configuración" no aparece en el menú si el usuario logueado no tiene `configuracion.ver`.
- [ ] Con `configuracion.ver` pero sin `configuracion.editar`, los campos se muestran deshabilitados y no aparecen los botones "Guardar cambios" ni "Descartar cambios".
- [ ] Cada regla numérica se muestra con un input numérico; su descripción aparece como texto de ayuda debajo del campo.
- [ ] Editar un campo hace aparecer los botones "Guardar cambios" y "Descartar cambios"; antes de tocar nada, ninguno de los dos es visible.
- [ ] Pulsar "Descartar cambios" revierte todos los campos editados a su último valor cargado del backend y oculta ambos botones.
- [ ] Pulsar "Guardar cambios" envía un único `PATCH /config/business` con solo las claves modificadas (verificable en la pestaña Network).
- [ ] Tras un guardado exitoso, el formulario refleja los valores actualizados (releídos con un nuevo `GET`) y aparece una notificación de éxito.
- [ ] Recargar la página después de guardar muestra el valor actualizado (confirma que persistió en el backend).
- [ ] Una respuesta `422` al guardar muestra una notificación de error legible y conserva el valor editado por el usuario en el campo (no lo revierte).
- [ ] Un valor cuyo tipo no es `number`, `string` ni `boolean` se muestra como texto de solo lectura, sin campo editable.

---

## Decisions

- **Sí:** asumir los permisos `configuracion.ver`/`configuracion.editar` como nuevo módulo, en vez de reutilizar `usuarios.*` o no gatear la pantalla. Decisión explícita del usuario al definir esta spec, aceptando el riesgo de que el catálogo real de permisos del backend no los tenga todavía (ver Risks).
- **Sí:** un único botón "Guardar cambios" que agrupa todas las ediciones pendientes en un solo `PATCH`, en vez de guardado inmediato por campo (como el checklist de permisos de SPEC 03). El endpoint ya está pensado para aceptar varias claves a la vez, y evita disparar una llamada por cada tecla/blur en un formulario de reglas de negocio.
- **Sí:** detectar el tipo de cada regla en runtime (`typeof value`) en vez de asumir que todas son numéricas. El schema del backend no restringe el tipo de `value`; el único ejemplo documentado es solo eso, un ejemplo.
- **Sí:** valores de tipo objeto/array/`null` se muestran de solo lectura en vez de intentar un editor genérico JSON. Ninguna regla documentada hoy tiene ese tipo; añadir un editor JSON completo sería sobre-ingeniería para un caso hipotético.
- **Sí:** tras un `PATCH` exitoso, refrescar con un nuevo `GET /config/business` en vez de confiar en la forma del `data` de la respuesta del `PATCH`. El swagger no documenta el shape de esa respuesta (`data: object` genérico, sin ejemplo); re-consultar la fuente de verdad es más robusto que asumir.
- **No:** revertir las ediciones locales del usuario ante un error `422`/`403` al guardar. Le permite corregir el valor que causó el error sin perder el resto de sus cambios.
- **No:** advertencia de "cambios sin guardar" al salir de la pantalla. No existe ese patrón en ninguna otra pantalla del proyecto (ej. `UserFormDialog`); sería inconsistente introducirlo solo aquí.
- **Sí:** descripción de cada regla como `hint` visible debajo del campo (no tooltip). Decisión explícita del usuario al definir esta spec: más legible sin requerir interacción extra.

---

## Risks

| Riesgo                                                                                                                                                                                       | Mitigación                                                                                                                                                                                                                             |
| -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Los permisos `configuracion.ver`/`configuracion.editar` no existen todavía en el catálogo real del backend (`GET /permissions`), lo que dejaría la pantalla inaccesible para todos.          | Verificar contra el entorno real qué devuelve `GET /permissions` antes de dar por cerrada la implementación; si no existen, coordinarlos con el equipo de backend o ajustar el `meta.requiresPermission` sin tocar el resto del guard. |
| El shape del `data` en la respuesta de `PATCH /config/business` no está documentado; si en producción sí devuelve el objeto actualizado, refrescar con un `GET` extra es una llamada de más. | Aceptado como costo menor a cambio de robustez; si se confirma el shape real, se puede optimizar en una spec futura para usar directamente la respuesta del `PATCH`.                                                                   |
| Una regla de negocio con un valor de tipo objeto/array aparece en el futuro y queda de solo lectura en esta pantalla, sin forma de editarla desde la UI.                                     | Aceptado como límite conocido de esta spec (ver Scope); si ocurre, se define un editor específico en una spec futura.                                                                                                                  |

---

## What is **not** in this spec

- Crear, eliminar o renombrar reglas de negocio.
- Editar la `description` de una regla.
- Edición de reglas con valor de tipo objeto/array/`null`.
- Historial o auditoría de cambios de configuración.
- Advertencia de "cambios sin guardar" al navegar fuera de la pantalla.
- Otros namespaces de configuración además de `business`.
- Internacionalización de textos.

Cada uno de estos, si se necesita, va en su propio spec.
