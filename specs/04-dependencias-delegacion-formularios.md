# SPEC 04 — Dependencias por delegación en los formularios de almacén y usuario

> **Status:** Aprobado
> **Depends on:** SPEC 02 (`AlmacenFormDialog.vue`, stores `ubicaciones.ts` y `almacenes.ts`), SPEC 03 (pestaña "Organización" de `UserFormDialog.vue`)
> **Date:** 2026-10-05
> **Objective:** Limitar las ubicaciones seleccionables en el formulario de almacén y los almacenes seleccionables en el formulario de usuario a los de la delegación elegida en ese mismo formulario.

---

## Scope

**In:**

- Regla de negocio (`notas-jcn/dependencias.md`): los almacenes y las ubicaciones pertenecen a una delegación.
- `AlmacenFormDialog.vue`: el select de ubicación solo ofrece ubicaciones de la delegación seleccionada.
- `UserFormDialog.vue` (pestaña "Organización"): el select de almacén solo ofrece almacenes de la delegación seleccionada.
- Sin delegación elegida, el select dependiente aparece deshabilitado (`disable`) con un hint "Selecciona primero una delegación".
- Al cambiar o vaciar la delegación, el select dependiente se vacía siempre. En edición, guardar así envía `null` para ese campo (criterio de SPEC 02/03).
- En edición, el valor ya asignado se precarga tal cual (a partir de `ubicacion` / `almacen`), aunque no pertenezca a la delegación actual. El filtro solo se aplica al buscar nuevas opciones y al cambiar la delegación.
- Las búsquedas por nombre del select dependiente envían `delegacion_id` junto con `nombre` y `per_page=10`:
  - `searchUbicacionesByNombre(nombre, delegacionId)` en `ubicaciones.ts`.
  - `searchAlmacenesByNombre(nombre, delegacionId)` en `almacenes.ts`, con el parámetro `delegacionId` opcional para no romper otros usos.
- Textos nuevos (hint de selección previa de delegación) en `src/i18n/es/index.ts` y `src/i18n/en-US/index.ts`.

**Out of scope (for future specs):**

- Filtro de almacén dependiente del filtro de delegación en `UsersListPage.vue` (los filtros siguen independientes, como en SPEC 03).
- Departamento del usuario: no depende de la delegación y queda independiente.
- Validación o saneamiento de datos previos incoherentes (ubicación/almacén ya asignados que no pertenecen a la delegación): se muestran sin cambios.
- Validación de coherencia en backend; esta spec solo cubre la interfaz.
- Otros selects (responsable de almacén, delegación) y otras pantallas.
- Componente genérico de select dependiente.

---

## Data model

Esta feature no introduce nuevas estructuras de datos. Reutiliza los modelos de SPEC 02 y SPEC 03; solo cambia la firma de dos funciones de búsqueda:

```ts
// src/stores/ubicaciones.ts
searchUbicacionesByNombre(nombre: string, delegacionId?: number): Promise<Ubicacion[]>

// src/stores/almacenes.ts
searchAlmacenesByNombre(nombre: string, delegacionId?: number): Promise<Almacen[]>
```

Convenciones:

- `delegacion_id` solo se envía como query param cuando `delegacionId` está definido; nunca como string vacío.
- Los selects dependientes se deshabilitan cuando el estado local de delegación (`ref<RelationOption | null>` en almacén, `ref<OrgRef | null>` en usuario) es `null`.
- El vaciado del select dependiente se dispara desde el evento `update:model-value` del select de delegación, no desde un `watch` sobre el valor, para que la precarga inicial en edición no lo vacíe.

---

## Implementation plan

1. **Verificar la API.** Confirmar contra el backend que `GET /ubicaciones` y `GET /almacenes` aceptan `delegacion_id` (la documentación Swagger no se puede leer automáticamente). Verificación: petición manual con `delegacion_id` y comprobar que solo devuelve registros de esa delegación. Si `/ubicaciones` no lo admite, detenerse y revisar la spec.
2. **Stores.** Añadir el parámetro `delegacionId` opcional a `searchUbicacionesByNombre` y `searchAlmacenesByNombre`. Verificación: type-check sin errores y los usos actuales siguen funcionando igual.
3. **i18n.** Añadir en `es` y `en-US` el hint de "selecciona primero una delegación" para almacén y usuario. Verificación: type-check sin errores.
4. **`AlmacenFormDialog.vue`.** Filtrar la búsqueda de ubicaciones por la delegación, deshabilitar el select sin delegación y vaciarlo al cambiar o vaciar la delegación. Verificación manual: crear y editar un almacén en distintas delegaciones.
5. **`UserFormDialog.vue`.** Mismo comportamiento para el select de almacén en la pestaña "Organización". Verificación manual: crear y editar un usuario cambiando de delegación.

---

## Acceptance criteria

- [ ] En el formulario de almacén sin delegación elegida, el select de ubicación está deshabilitado y muestra el hint de selección previa.
- [ ] En el formulario de usuario sin delegación elegida, el select de almacén está deshabilitado y muestra el hint de selección previa.
- [ ] Con una delegación elegida, escribir en el select de ubicación (almacén) lanza `GET /ubicaciones` con `nombre=<texto>`, `delegacion_id=<id>` y `per_page=10`.
- [ ] Con una delegación elegida, escribir en el select de almacén (usuario) lanza `GET /almacenes` con `nombre=<texto>`, `delegacion_id=<id>` y `per_page=10`.
- [ ] Cambiar la delegación a otra distinta vacía el select dependiente en ambos formularios.
- [ ] Vaciar la delegación (clear) vacía y deshabilita el select dependiente en ambos formularios.
- [ ] Al editar un almacén con ubicación asignada, la ubicación aparece precargada y no se vacía al abrir el diálogo.
- [ ] Al editar un usuario con almacén asignado, el almacén aparece precargado y no se vacía al abrir la pestaña "Organización".
- [ ] Al editar un registro cuyo valor dependiente no pertenece a su delegación, se muestra tal cual sin error de validación.
- [ ] Editar un registro, cambiar la delegación y guardar envía `null` para `ubicacion_id` (almacén) o `almacen_id` (usuario).
- [ ] Los demás usos de `searchAlmacenesByNombre` y `searchUbicacionesByNombre` (sin `delegacionId`) no envían `delegacion_id`.
- [ ] Los filtros de `UsersListPage.vue` y el select de departamento del usuario siguen siendo independientes.
- [ ] El hint existe en `es` y `en-US`.
- [ ] `pnpm lint` y el type-check del proyecto pasan sin errores nuevos.

---

## Decisions

- **Yes:** deshabilitar el select dependiente sin delegación. Evita combinaciones incoherentes y deja clara la dependencia.
- **No:** mostrar todas las opciones sin delegación. Es más permisivo, pero permite elegir una ubicación/almacén y luego una delegación que no coincide.
- **Yes:** vaciar siempre el select dependiente al cambiar la delegación. Es simple y predecible.
- **No:** conservarlo si sigue perteneciendo a la nueva delegación. Exige conocer la delegación de cada opción y más lógica para un caso poco frecuente.
- **Yes:** mostrar tal cual los datos previos incoherentes en edición. No se altera información existente sin que el usuario lo pida.
- **No:** vaciarlos al abrir o marcarlos como error. Se perderían datos o se bloquearía el guardado por una incoherencia heredada.
- **Yes:** filtrado en servidor con `delegacion_id` en la búsqueda, coherente con la búsqueda por nombre de SPEC 02/03 y el límite de `per_page` de la API.
- **Yes:** vaciar desde el evento del select de delegación y no desde un `watch`, para no borrar la precarga inicial.
- **No:** filtro de almacén dependiente en `UsersListPage.vue`. Los filtros de SPEC 03 siguen independientes; no se ha pedido.
- **Yes:** el estado se escribe en español (`Borrador`), siguiendo las SPEC 01–03.

---

## Risks

| Risk                                                                                          | Mitigation                                                                                                                   |
| --------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------- |
| `GET /ubicaciones` podría no admitir `delegacion_id` (la API no se pudo leer automáticamente) | Paso 1 lo verifica antes de tocar código; si no lo admite, se revisa la spec en lugar de filtrar en cliente por suposición. |
| Un `watch` sobre la delegación vaciaría la precarga al abrir el diálogo en edición            | Se vacía solo desde el evento `update:model-value` del select de delegación; criterio de aceptación explícito.              |
| Usuario sin permisos sobre `/almacenes` o `/ubicaciones` recibe 403 al buscar                 | Mismo tratamiento que SPEC 03: notificación `red-9` con `getApiErrorMessage` y select sin opciones.                          |
| Dato previo incoherente se conserva al guardar sin tocar la delegación                        | Comportamiento aceptado y documentado; la coherencia retroactiva queda para otra spec.                                      |

---

## What is **not** in this spec

- Filtros dependientes en `UsersListPage.vue`.
- Dependencia del departamento respecto a la delegación.
- Saneamiento o validación de datos previos incoherentes.
- Validación de coherencia en backend.
- Componente genérico de select dependiente.

Cada uno de esos puntos, si se aborda, va en su propia spec.
