# SPEC 03 — Organización predeterminada de usuarios (delegación, departamento y almacén)

> **Status:** Aprobado
> **Depends on:** SPEC 02 (reutiliza los stores `delegaciones.ts`, `ubicaciones.ts`, `departamentos.ts` y `almacenes.ts` y el patrón de selects con búsqueda en servidor)
> **Date:** 2026-10-05
> **Objective:** Permitir asignar a cada usuario su delegación, departamento y almacén predeterminados mediante una pestaña "Organización" en `UserFormDialog.vue` (los campos actuales pasan a la pestaña "Datos de usuario"), y mostrarlos y filtrarlos en `UsersListPage.vue`.

---

## Scope

**In:**

- `UserFormDialog.vue` se divide en dos pestañas con `q-tabs` / `q-tab-panels` dentro del mismo `q-form`, con un único botón "Guardar":
  - **"Datos de usuario":** avatar, nombre, email, alias, contraseña, confirmación y roles (contenido actual, sin cambios de comportamiento).
  - **"Organización":** tres `q-select` (delegación, departamento, almacén), todos opcionales.
- Pestañas disponibles tanto en alta como en edición.
- Si la validación falla en una pestaña no activa, el diálogo cambia automáticamente a la pestaña que contiene el primer campo con error.
- Selects con búsqueda en servidor por nombre (`use-input`, `nombre` como query param, `per_page=10`), `clearable`, siguiendo `searchDelegacionesByNombre` de `delegaciones.ts`. Se añaden `searchDepartamentosByNombre` (en `departamentos.ts`) y `searchAlmacenesByNombre` (en `almacenes.ts`). Los selects son independientes entre sí (sin cascada).
- En edición, la opción actual de cada select se construye a partir de los objetos `delegacion`, `departamento` y `almacen` que ya devuelve `/users`, sin petición extra.
- Vaciar un select y guardar en edición envía `null` para ese campo (desasignar). En alta, un select vacío no se envía.
- Permiso: la pestaña "Organización" se edita con `usuarios.editar` / `usuarios.crear`, los mismos que ya gobiernan el formulario. No se crean permisos nuevos.
- `users.ts`: mapear `departamentoId`, `departamento`, `delegacionId`, `delegacion`, `almacenId` y `almacen` en `AdminUser`; añadir `departamento_id`, `delegacion_id` y `almacen_id` a `CreateUserPayload` y `UpdateUserPayload`; añadir los tres filtros a `UsersFilters` y `buildFilterParams`.
- `UsersListPage.vue`: tres columnas nuevas (delegación, departamento, almacén) que muestran el `nombre` o "—" si no hay valor, y tres filtros nuevos con el mismo `q-select` de búsqueda en servidor (`use-input`, `clearable`) que se envían como `delegacion_id`, `departamento_id` y `almacen_id`. "Filtrar" y "Limpiar" los incluyen; cambiar de página los conserva.
- Textos nuevos en `src/i18n/es/index.ts` y `src/i18n/en-US/index.ts` (pestañas, etiquetas de selects, columnas y filtros).

**Out of scope (for future specs):**

- Dependencia entre selects (p. ej. limitar almacenes a la delegación elegida) y validación de coherencia delegación ↔ almacén.
- Mapear estos campos en `auth.ts` / `AuthUser` ni refrescar la sesión (`fetchMe`) al editarse a sí mismo; nada en la app los consume todavía.
- Usar la organización predeterminada para precargar valores en otras pantallas (activos, movimientos, etc.).
- Ubicación predeterminada del usuario (la API de `/users` no la expone).
- Ordenación en servidor de las nuevas columnas (solo se ordena sobre la página cargada, igual que el resto).
- Permiso específico para asignar organización.
- Componente genérico reutilizable de select con búsqueda en servidor.

---

## Data model

Contrato con la API (`https://aye.ayegea.es/api/documentation/`): `UserResource` ya incluye `departamento_id`, `departamento`, `delegacion_id`, `delegacion`, `almacen_id` y `almacen` (objetos `{ id, nombre }` o `null`). `POST /users` y `PUT /users/{id}` aceptan `departamento_id`, `delegacion_id` y `almacen_id` (enteros, `nullable`; en `PUT`, `null` desasigna). `GET /users` acepta esos tres parámetros como filtro.

```ts
// src/stores/users.ts
interface OrgRef { id: number; nombre: string }

interface AdminUser {
  // ...campos existentes
  departamentoId: number | null;
  departamento: OrgRef | null;
  delegacionId: number | null;
  delegacion: OrgRef | null;
  almacenId: number | null;
  almacen: OrgRef | null;
}

interface UsersFilters {
  // ...campos existentes
  departamentoId?: number;
  delegacionId?: number;
  almacenId?: number;
}

// Payloads (snake_case, igual que la API)
// CreateUserPayload: + departamento_id?, delegacion_id?, almacen_id?  (number)
// UpdateUserPayload: + departamento_id?, delegacion_id?, almacen_id?  (number | null)
```

Convenciones:

- `AuthUser` en `auth.ts` no cambia.
- Estado local del formulario: tres `ref<OrgRef | null>` (objeto completo, no solo el id, para poder mostrar la etiqueta sin petición extra); al guardar se envía `?.id`.
- Los valores vacíos nunca se envían como string vacío.

---

## Implementation plan

1. **Store de usuarios.** Ampliar `AdminUser`, `UserResource`, `mapUser`, `UsersFilters`, `buildFilterParams` y los dos payloads en `users.ts`. Verificación: type-check sin errores y la lista de usuarios sigue cargando igual.
2. **Búsquedas por nombre.** Añadir `searchDepartamentosByNombre` en `departamentos.ts` y `searchAlmacenesByNombre` en `almacenes.ts`, con el mismo patrón que `searchDelegacionesByNombre`. Verificación: type-check sin errores.
3. **i18n.** Añadir las claves nuevas en `es` y `en-US`. Verificación: type-check sin errores.
4. **Pestañas en `UserFormDialog.vue`.** Introducir `q-tabs` / `q-tab-panels` y mover los campos actuales a "Datos de usuario"; "Organización" queda como panel vacío. Verificación manual: alta y edición funcionan exactamente igual que antes.
5. **Selects de organización.** Implementar los tres `q-select` con búsqueda en servidor, precarga en edición, envío de `null` al vaciar y cambio automático de pestaña ante error de validación. Verificación manual: asignar, cambiar y quitar cada valor en alta y edición, y comprobarlo reabriendo el diálogo.
6. **Columnas y filtros en `UsersListPage.vue`.** Añadir las tres columnas y los tres filtros, integrados con `appliedFilters`, "Filtrar" y "Limpiar". Verificación manual: filtrar por cada uno, combinarlos y cambiar de página.

---

## Acceptance criteria

- [ ] El diálogo de usuario muestra dos pestañas, "Datos de usuario" y "Organización", tanto al crear como al editar.
- [ ] La pestaña "Datos de usuario" contiene avatar (solo edición), nombre, email, alias, contraseña, confirmación y roles, con las mismas validaciones que antes.
- [ ] La pestaña "Organización" contiene tres selects (delegación, departamento, almacén), todos opcionales y con `clearable`.
- [ ] Escribir en cualquiera de los tres selects lanza `GET` a su endpoint con `nombre=<texto>` y `per_page=10`, y muestra hasta 10 resultados.
- [ ] Al editar un usuario con organización asignada, los tres selects muestran el nombre actual al abrir la pestaña, sin interacción previa ni petición adicional.
- [ ] Crear un usuario con los tres selects rellenos envía `departamento_id`, `delegacion_id` y `almacen_id`, y el usuario aparece con esos valores en el listado.
- [ ] Crear un usuario con los selects vacíos no envía ninguno de los tres campos.
- [ ] Editar un usuario, vaciar un select y guardar envía `null` para ese campo, y al reabrir el diálogo ese select aparece vacío.
- [ ] Guardar con un error de validación en "Datos de usuario" estando en "Organización" cambia el diálogo a "Datos de usuario" y no envía petición.
- [ ] Un usuario sin `usuarios.editar` no ve el botón de editar, por lo que no accede a la pestaña "Organización".
- [ ] La tabla de usuarios muestra las columnas delegación, departamento y almacén con el nombre, o "—" cuando no hay valor.
- [ ] Elegir un valor en un filtro de organización y pulsar "Filtrar" lanza `GET /users` con el parámetro correspondiente (`delegacion_id`, `departamento_id` o `almacen_id`) y vuelve a la página 1.
- [ ] Cambiar de página o de filas por página conserva los filtros de organización aplicados.
- [ ] "Limpiar" vacía los tres filtros de organización y recarga sin esos parámetros.
- [ ] Todos los textos nuevos existen en `es` y `en-US`.
- [ ] `pnpm lint` y el type-check del proyecto pasan sin errores nuevos.

---

## Decisions

- **Yes:** pestañas dentro de `UserFormDialog.vue` con un único `q-form` y un único "Guardar". Es el cambio mínimo sobre el diálogo existente y evita guardar en dos pasos.
- **No:** extraer cada pestaña a un componente hijo. Más limpio, pero obliga a un refactor mayor del diálogo para un cambio de alcance acotado.
- **Yes:** pestaña "Organización" también en el alta. Los tres campos son `nullable` en la API, así que no bloquean la creación y evitan tener que editar justo después.
- **Yes:** al fallar la validación en la pestaña oculta, cambiar automáticamente a la pestaña con el error. Sin esto, el usuario pulsa "Guardar" y no ve ningún mensaje.
- **Yes:** reutilizar `usuarios.editar` / `usuarios.crear`. Evita altas de permisos en el backend y en `RolesPermissionsPage.vue`; la granularidad extra no se ha pedido.
- **Yes:** búsqueda en servidor por nombre, igual que la SPEC 02. La API limita `per_page` a 100, así que cargar todo al abrir dejaría de funcionar al superarse.
- **Yes:** selects independientes. `/almacenes` admite `delegacion_id`, pero la API no garantiza esa coherencia y una cascada añade reglas de negocio no pedidas.
- **Yes:** guardar el objeto `{ id, nombre }` en el estado de cada select en lugar de solo el id, para mostrar la etiqueta actual sin petición extra.
- **Yes:** enviar `null` al vaciar un select en edición, para poder desasignar (la API lo documenta así). Mismo criterio que la SPEC 02.
- **Yes:** columnas y filtros en `UsersListPage.vue` dentro de esta spec (decisión del usuario), ya que la API los soporta y comparten stores y búsquedas con el formulario.
- **No:** mapear los campos en `auth.ts` ni refrescar la sesión del propio usuario. Nada los consume todavía; se hará en la spec que los use.
- **Yes:** el estado se escribe en español (`Borrador`), siguiendo las SPEC 01 y 02.

---

## Risks

| Risk                                                                                                           | Mitigation                                                                                                                                  |
| -------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------- |
| Un usuario sin `catalogos.ver` / `delegaciones.ver` puede recibir 403 al buscar en los selects de organización | Mostrar la notificación `red-9` con `getApiErrorMessage`; el select queda sin opciones. Confirmar contra el backend en el paso 5.          |
| La fila de la lista trae el objeto relacionado pero la opción actual no aparece en la primera búsqueda        | La opción actual se inyecta a mano en las opciones del select (`options` incluye el valor seleccionado) para que la etiqueta siempre se vea. |
| La barra de filtros de `UsersListPage.vue` ya tiene 5 columnas y 3 filtros más desbordan el layout            | Pasar la barra a dos filas (`col-12 col-md-2` por filtro, botones en la segunda). Revisión visual en el paso 6.                              |
| Cambio de pestaña automático confunde si hay varios errores                                                    | Se salta a la pestaña del primer campo con error; las reglas actuales de "Datos de usuario" tienen prioridad.                               |
| Editar un usuario cuyo almacén/delegación fue eliminado devuelve `null` en el objeto                           | El select aparece vacío; guardar sin tocarlo no envía cambios sobre ese campo no modificado.                                                |

---

## What is **not** in this spec

- Cascada o validación de coherencia entre delegación y almacén.
- Cambios en `auth.ts`, `AuthUser` o refresco de sesión.
- Uso de la organización predeterminada en otras pantallas.
- Ubicación predeterminada del usuario.
- Permiso nuevo para asignar organización.
- Ordenación en servidor y componente genérico de select con búsqueda.

Cada uno de esos puntos, si se aborda, va en su propia spec.
