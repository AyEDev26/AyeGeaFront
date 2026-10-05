# SPEC 02 — Administración de departamentos, delegaciones, almacenes y ubicaciones

> **Status:** Aprobado
> **Depends on:** — (reutiliza el patrón visual y de código de `UsersListPage.vue`, ya existente; no depende de SPEC 01)
> **Date:** 2026-10-05
> **Objective:** Añadir cuatro pantallas de administración (listado con filtro por nombre + diálogo de alta/edición + borrado) para departamentos, delegaciones, almacenes y ubicaciones, con el mismo estilo y estructura que `UsersListPage.vue` y `UserFormDialog.vue`.

---

## Scope

**In:**

- Cuatro páginas de listado en `src/pages/admin/`: `DepartamentosListPage.vue`, `DelegacionesListPage.vue`, `AlmacenesListPage.vue`, `UbicacionesListPage.vue`.
- Cuatro diálogos de formulario en `src/components/admin/`: `DepartamentoFormDialog.vue`, `DelegacionFormDialog.vue`, `AlmacenFormDialog.vue`, `UbicacionFormDialog.vue`.
- Cuatro stores Pinia en `src/stores/`: `departamentos.ts`, `delegaciones.ts`, `almacenes.ts`, `ubicaciones.ts`, con el mismo patrón que `users.ts` (mapeo snake_case → camelCase, `items`, `meta`, `loading`, `fetchX`, `createX`, `updateX`, `deleteX`).
- Estilo idéntico a `UsersListPage.vue`: `AdminPageWrapper wide align-top` + `GlassCard`, título `text-h5 text-teal-10 font-outfit`, botón "Nuevo" `elegant-btn`, filtros con `q-input` `outlined dense clearable elegant-input`, botones "Filtrar"/"Limpiar", `q-table` `flat bordered dense elegant-table`, acciones con botones redondos `flat round dense size="sm"` y tooltips, diálogo con `GlassCard`, confirmación de borrado con `$q.dialog`, notificaciones `teal-9` / `red-9`.
- Listados paginados en servidor (`page`, `per_page`; opciones `[10, 15, 25, 50]`, por defecto 15), con ordenación de columnas solo sobre las filas de la página cargada (mismo comportamiento que Users, el backend no ordena).
- Filtro de listado únicamente por `nombre` (búsqueda parcial) en las cuatro pantallas.
- Columnas y campos de formulario por entidad:
  - **Departamento:** columnas `nombre`; formulario `nombre` (obligatorio, máx. 25).
  - **Delegación:** columnas `nombre`, `prefijo`; formulario `nombre` (obligatorio, máx. 100) y `prefijo` (opcional, máx. 45).
  - **Almacén:** columnas `nombre`, `prefijo`, delegación, ubicación, responsable; formulario `nombre` (obligatorio, máx. 50), `prefijo` (opcional, máx. 45), y selects de delegación, ubicación y responsable (todos opcionales).
  - **Ubicación:** columnas `nombre`, `direccion`, `prefijo`, delegación; formulario `nombre` (obligatorio, máx. 150), `direccion` (opcional, máx. 255), `prefijo` (opcional, máx. 5) y select de delegación (opcional).
- Selects de relación con búsqueda en servidor por nombre (`use-input`, `nombre` como query param, `per_page=10`), siguiendo la idea de `searchUsersByName` en `users.ts`. El responsable de almacén se busca con `searchUsersByName`. En edición, la opción actual se construye a partir del objeto relacionado (`delegacion`, `ubicacion`, `responsable`) que ya devuelve el listado, de modo que se muestra sin hacer una petición extra.
- Rutas en `src/router/routes.ts` (hijas de `MainLayout`, `requiresAuth: true`):
  - `admin/departamentos` → `catalogos.ver`
  - `admin/almacenes` → `catalogos.ver`
  - `admin/ubicaciones` → `catalogos.ver`
  - `admin/delegaciones` → `delegaciones.ver`
- Permisos de acciones en UI: botón "Nuevo", editar y eliminar condicionados a `<prefijo>.crear`, `<prefijo>.editar`, `<prefijo>.eliminar`, donde el prefijo es `catalogos` (departamentos, almacenes, ubicaciones) o `delegaciones` (delegaciones).
- Menú lateral (`MainLayout.vue`): nuevo grupo desplegable "Organización" (`q-expansion-item`) dentro de la sección de administración, con 4 ítems (Departamentos, Delegaciones, Almacenes, Ubicaciones). Cada ítem se muestra solo si el usuario tiene su permiso `.ver`; el grupo solo si tiene al menos uno. La condición `v-if` de la cabecera de la sección admin se amplía para incluir `catalogos.ver` y `delegaciones.ver`.
- Textos en `src/i18n/es/index.ts` y `src/i18n/en-US/index.ts` (claves `admin.departamentos`, `admin.delegaciones`, `admin.almacenes`, `admin.ubicaciones`, sus `*Form` y `layout.nav.*`).
- Gestión de errores del backend con `getApiErrorMessage`, incluido el 409 al borrar una entidad con dependencias (se muestra el mensaje del backend).

**Out of scope (for future specs):**

- Toggles `modulo_epis` y `modulo_vk` y campo `referencia_grupal` de delegaciones (y por tanto el permiso `delegaciones.modificar_modulos`). Quedan sin mostrar ni editar en el formulario.
- Filtros por relaciones (`delegacion_id`, `ubicacion_id`, `responsable_id`) y por `prefijo` o `direccion` en los listados.
- Pantalla de detalle (`GET /<entidad>/{id}`): todo se ve en el listado y se edita en el diálogo.
- Ordenación en servidor, exportación, importación masiva.
- Gestión de los nuevos permisos `catalogos.*` y `delegaciones.*` en `RolesPermissionsPage.vue` (se asume que el backend ya los expone en su catálogo de permisos).
- Refactor de Users para compartir código con las nuevas pantallas.
- Componentes genéricos de tabla/diálogo reutilizables entre las cuatro entidades.

---

## Data model

Contrato con la API (`https://aye.ayegea.es/api/documentation/`). Rutas: `/departamentos`, `/delegaciones`, `/almacenes`, `/ubicaciones`. Respuesta de listado: `{ data: { items, meta: { current_page, last_page, per_page, total } } }`, igual que `/users`.

```ts
// Tipos de dominio (camelCase) — uno por store
interface Departamento { id: number; nombre: string; }

interface Delegacion { id: number; nombre: string; prefijo: string | null; }

interface Ubicacion {
  id: number;
  nombre: string;
  direccion: string | null;
  prefijo: string | null;
  delegacionId: number | null;
  delegacion: { id: number; nombre: string } | null;
}

interface Almacen {
  id: number;
  nombre: string;
  prefijo: string | null;
  delegacionId: number | null;
  delegacion: { id: number; nombre: string } | null;
  ubicacionId: number | null;
  ubicacion: { id: number; nombre: string } | null;
  responsableId: number | null;
  responsable: { id: number; name: string } | null;
}

// Payloads de create/update (snake_case, igual que la API)
// Departamento: { nombre }
// Delegacion:   { nombre, prefijo? }
// Ubicacion:    { nombre, direccion?, prefijo?, delegacion_id? }
// Almacen:      { nombre, prefijo?, delegacion_id?, ubicacion_id?, responsable_id? }
```

Convenciones:

- `PaginationMeta` se reutiliza importándolo de `@/stores/users` (no se duplica).
- Al editar, los campos opcionales vaciados se envían como `null` para poder borrar un valor existente (a diferencia de Users, donde un alias vacío se omite). Los strings vacíos nunca se envían.
- Los campos `modulo_epis`, `modulo_vk`, `referencia_grupal` y `created_at`/`updated_at` no se mapean en el frontend.

---

## Implementation plan

1. **i18n y rutas esqueleto.** Añadir las claves de i18n (es y en-US) de las cuatro entidades y del menú. Verificación: `pnpm build` (o type-check) sin errores.
2. **Departamentos completo (vertical).** Crear `stores/departamentos.ts`, `DepartamentoFormDialog.vue` y `DepartamentosListPage.vue`; añadir la ruta `admin/departamentos`. Verificación manual: abrir `/#/admin/departamentos` y listar, filtrar por nombre, crear, editar y borrar. Esta entidad sirve de plantilla para las demás.
3. **Delegaciones.** Crear `stores/delegaciones.ts`, `DelegacionFormDialog.vue`, `DelegacionesListPage.vue` y la ruta con permiso `delegaciones.ver`. Verificación manual: CRUD completo y error 409 al borrar una delegación con dependencias.
4. **Ubicaciones.** Crear `stores/ubicaciones.ts`, `UbicacionFormDialog.vue`, `UbicacionesListPage.vue`, la ruta y la función de búsqueda de delegaciones por nombre (en `delegaciones.ts`) para el select. Verificación manual: CRUD con y sin delegación asignada.
5. **Almacenes.** Crear `stores/almacenes.ts`, `AlmacenFormDialog.vue`, `AlmacenesListPage.vue`, la ruta y la búsqueda de ubicaciones por nombre (en `ubicaciones.ts`). Verificación manual: CRUD con delegación, ubicación y responsable, y con todos vacíos.
6. **Menú lateral.** Añadir en `MainLayout.vue` el grupo "Organización" con sus 4 ítems y los permisos. Verificación manual: con un usuario que solo tenga `catalogos.ver` aparecen 3 ítems; con solo `delegaciones.ver`, 1; sin ninguno, el grupo no aparece.

---

## Acceptance criteria

- [ ] Existen las rutas `/#/admin/departamentos`, `/#/admin/delegaciones`, `/#/admin/almacenes` y `/#/admin/ubicaciones`, y cada una carga su página sin errores en consola.
- [ ] Un usuario sin `catalogos.ver` es redirigido (comportamiento actual del guard de rutas) al intentar abrir departamentos, almacenes o ubicaciones; lo mismo con `delegaciones.ver` en delegaciones.
- [ ] Cada listado usa `GlassCard`, `q-table` con clase `elegant-table`, `dense`, `flat`, `bordered`, y filtros con clase `elegant-input`, igual que `UsersListPage.vue`.
- [ ] Cada listado se pagina en servidor: cambiar de página o de filas por página lanza `GET` con `page` y `per_page`, y conserva el filtro aplicado.
- [ ] Escribir un texto en el filtro de nombre y pulsar "Filtrar" lanza `GET` con `nombre=<texto>` y vuelve a la página 1; "Limpiar" vacía el filtro y recarga sin él.
- [ ] El botón "Nuevo" y los iconos de editar/eliminar solo aparecen con los permisos `.crear`, `.editar` y `.eliminar` correspondientes (`catalogos.*` o `delegaciones.*`).
- [ ] Crear un registro válido muestra notificación `teal-9`, cierra el diálogo y el nuevo registro aparece en el listado.
- [ ] Editar un registro precarga sus valores en el diálogo; guardar actualiza la fila y notifica éxito.
- [ ] Dejar `nombre` vacío en cualquier formulario muestra el error de validación y no envía ninguna petición.
- [ ] Superar la longitud máxima de un campo (departamento 25, delegación 100, almacén 50, ubicación 150, prefijo de ubicación 5) muestra error de validación y no envía petición.
- [ ] En el formulario de almacén, escribir en el select de delegación, ubicación o responsable lanza una búsqueda en servidor por nombre y muestra hasta 10 resultados.
- [ ] Al editar un almacén o ubicación con relaciones asignadas, los selects muestran el nombre actual sin interacción previa; vaciar un select y guardar envía `null` para ese campo.
- [ ] Borrar pide confirmación; al confirmar, el registro desaparece y se notifica éxito.
- [ ] Borrar una delegación con ubicaciones, almacenes o usuarios asociados muestra una notificación `red-9` con el mensaje del backend y el registro permanece.
- [ ] El formulario de delegación no contiene campos `modulo_epis`, `modulo_vk` ni `referencia_grupal`, y las peticiones create/update no los envían.
- [ ] El menú lateral muestra el grupo "Organización" con los ítems permitidos y marca como activo (`drawer-item--active`) el ítem de la ruta actual.
- [ ] Todos los textos nuevos existen en `es` y `en-US`; cambiar de idioma no deja claves sin traducir en las nuevas pantallas.
- [ ] `pnpm lint` y el type-check del proyecto pasan sin errores nuevos.

---

## Decisions

- **Yes:** cuatro stores, cuatro páginas y cuatro diálogos separados, replicando el patrón de Users. Es explícito, coherente con el código existente y cada entidad puede divergir sin condicionales.
- **No:** componentes genéricos de tabla/diálogo configurables. Menos código, pero más abstracción y riesgo con las particularidades de almacén (selects de relación) para un caso de solo cuatro entidades.
- **Yes:** permisos `catalogos.*` para departamentos, almacenes y ubicaciones, y `delegaciones.*` para delegaciones (decisión del usuario). La API no los documenta, así que se confirman contra el backend al implementar.
- **Yes:** menú en un grupo desplegable "Organización" con 4 ítems, para no saturar la sección de administración ya existente.
- **Yes:** selects de relación con búsqueda en servidor por nombre en lugar de cargar todo el listado. La API limita `per_page` a 100, por lo que una carga completa dejaría de funcionar al superarse.
- **Yes:** enviar `null` en campos opcionales vaciados durante la edición, para poder quitar delegación, ubicación o responsable. Es un cambio deliberado respecto a Users, que omite el alias vacío.
- **Yes:** filtro solo por `nombre`, que existe en los cuatro endpoints. Mantiene los listados simples y homogéneos.
- **No:** filtros por relaciones, `prefijo` o `direccion`, aunque la API los admita para algunas entidades. Se descartan en esta spec por simplicidad.
- **No:** `modulo_epis`, `modulo_vk` y `referencia_grupal` en delegaciones. Dependen de un permiso adicional y `referencia_grupal` no tiene significado documentado; irán en otra spec si hacen falta.
- **No:** pantalla de detalle por entidad. Los datos mostrados en listado y diálogo cubren todos los campos editables.
- **Yes:** el estado se escribe en español (`Borrador`), siguiendo el idioma de la SPEC 01 (`Aprobado`).

---

## Risks

| Risk                                                                                           | Mitigation                                                                                                                                  |
| ---------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------- |
| Los permisos `catalogos.*` / `delegaciones.*` no existen o se llaman distinto en el backend    | Verificarlos contra el backend (catálogo de permisos / usuario de prueba) en el paso 2 antes de continuar; si difieren, ajustar la spec.    |
| El rol del usuario de prueba no tiene los nuevos permisos y las pantallas no se pueden probar  | Asignarlos desde `RolesPermissionsPage.vue` o en el backend antes de verificar.                                                             |
| Borrar con dependencias devuelve 409                                                           | Se muestra el mensaje del backend mediante `getApiErrorMessage`; criterio de aceptación explícito.                                          |
| Cuatro entidades repiten mucho código y pueden divergir en estilo con el tiempo                | Departamentos se implementa primero como plantilla; las demás la copian. Un posible refactor a componentes genéricos queda para otra spec.  |
| Ordenación solo sobre la página cargada puede confundir al usuario                             | Mismo comportamiento ya aceptado en Users; se documenta como limitación del backend.                                                        |

---

## What is **not** in this spec

- Módulos `modulo_epis` / `modulo_vk` y `referencia_grupal` de delegaciones.
- Filtros por relaciones, prefijo o dirección.
- Pantallas de detalle, exportación o importación.
- Ordenación en servidor.
- Alta de los nuevos permisos en la pantalla de roles.
- Refactor de Users o componentes genéricos compartidos.

Cada uno de esos puntos, si se aborda, va en su propia spec.
