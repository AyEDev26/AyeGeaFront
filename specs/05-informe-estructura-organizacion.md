# SPEC 05 — Informe de la estructura jerárquica de la organización

> **Status:** Aprobado
> **Depends on:** SPEC 02 (stores `delegaciones.ts`, `ubicaciones.ts`, `almacenes.ts`, `departamentos.ts` y rutas de administración), SPEC 03 (campos `delegacion`, `departamento` y `almacen` en `AdminUser` de `users.ts`)
> **Date:** 2026-10-05
> **Objective:** Mostrar en una página de solo lectura el árbol Delegación → Almacén → Usuarios, con las ubicaciones de cada delegación y la ubicación, el responsable y el departamento en los nodos que corresponda.

---

## Scope

**In:**

- Nueva página `src/pages/admin/OrganizationReportPage.vue`, ruta `admin/informes/organizacion`, de solo lectura, con un árbol (`q-tree`) de tres niveles:
  - **Delegación** (nivel 1): nombre, contador de almacenes, de ubicaciones y de usuarios. Contiene un bloque "Ubicaciones" con las ubicaciones de esa delegación (nombre y dirección) y sus almacenes.
  - **Almacén** (nivel 2): nombre, prefijo, ubicación, responsable y contador de usuarios.
  - **Usuario** (nivel 3): nombre, alias y departamento (o "—").
- Grupos de agrupación para datos incompletos (no se descartan registros):
  - "Sin delegación" (nivel 1): almacenes y usuarios sin delegación asignada.
  - "Sin almacén" (nivel 2, dentro de cada delegación): usuarios de esa delegación sin almacén.
- Regla de colocación de usuarios: si el usuario tiene almacén, cuelga de ese almacén (y por tanto de la delegación del almacén); si no, cuelga de "Sin almacén" de su delegación; si tampoco tiene delegación, de "Sin delegación".
- Botones "Expandir todo" y "Contraer todo". Estado inicial: delegaciones contraídas.
- Carga completa al abrir: se recorren todas las páginas de `/delegaciones`, `/ubicaciones`, `/almacenes` y `/users` con `per_page=100`, y el árbol se arma en cliente. Botón "Actualizar" que repite la carga.
- Funciones de carga total en los stores (sin tocar `items`, `meta` ni `filters` de las listas): `fetchAllDelegaciones`, `fetchAllUbicaciones`, `fetchAllAlmacenes` y `fetchAllUsers`.
- Función pura de construcción del árbol en `src/utils/organization-tree.ts`.
- Permisos: el ítem de menú aparece solo con `usuarios.ver`, `delegaciones.ver` y `catalogos.ver` a la vez; la ruta exige `usuarios.ver` (el guard de `router/index.ts` solo admite un permiso). Si alguna petición devuelve 403, la página muestra un aviso de permisos insuficientes en lugar del árbol.
- Ítem "Informe de organización" en el grupo "Organización" de `MainLayout.vue`; la condición de visibilidad del grupo y la lista de rutas activas se actualizan para incluirlo.
- Textos nuevos en `src/i18n/es/index.ts` y `src/i18n/en-US/index.ts`.
- Estilo siguiendo `notas-jcn/guia-estilo-visual-corestarter.md` (`GlassCard`, `AdminPageWrapper`).

**Out of scope (for future specs):**

- Exportar a PDF, Excel/CSV o imprimir.
- Filtros por delegación, búsqueda dentro del árbol u ordenación configurable.
- Carga perezosa por delegación o endpoint de informe agregado en el backend.
- Permiso nuevo `informes.ver`.
- Acciones sobre los nodos (editar, asignar, enlaces a las listas).
- Departamentos como nivel del árbol y listado global de departamentos (el departamento solo aparece como dato del usuario).
- Validación o saneamiento de datos incoherentes (p. ej. usuario cuya delegación difiere de la de su almacén): se colocan según la regla de arriba, sin avisos.
- Activos, movimientos y otras entidades.

---

## Data model

Esta feature no introduce datos persistentes ni nuevos endpoints; reutiliza los modelos de SPEC 02 y SPEC 03. Solo añade la estructura derivada del árbol en `src/utils/organization-tree.ts`:

```ts
type OrgNode =
  | { kind: 'delegacion'; key: string; id: number | null; nombre: string;
      ubicaciones: Ubicacion[]; children: OrgNode[]; counts: { almacenes: number; ubicaciones: number; usuarios: number } }
  | { kind: 'almacen'; key: string; almacen: Almacen | null; children: OrgNode[]; usuariosCount: number }
  | { kind: 'usuario'; key: string; user: AdminUser };

buildOrganizationTree(input: {
  delegaciones: Delegacion[];
  ubicaciones: Ubicacion[];
  almacenes: Almacen[];
  users: AdminUser[];
}): OrgNode[]
```

Firmas nuevas en los stores (todas recorren `page=1..lastPage` con `per_page=100` y devuelven el array completo):

```ts
fetchAllDelegaciones(): Promise<Delegacion[]>
fetchAllUbicaciones(): Promise<Ubicacion[]>
fetchAllAlmacenes(): Promise<Almacen[]>
fetchAllUsers(): Promise<AdminUser[]>
```

Convenciones:

- `key` único por nodo (`d-<id>`, `d-sin`, `a-<id>`, `a-sin-<delegacionId|sin>`, `u-<id>`) para `node-key` de `q-tree`.
- `almacen: null` en un nodo `almacen` representa el grupo "Sin almacén".
- `id: null` en un nodo `delegacion` representa el grupo "Sin delegación".
- Orden: delegaciones y almacenes por `nombre`, usuarios por `name` (alfabético, `localeCompare`); los grupos "Sin …" van al final.
- La función es pura: no hace peticiones ni usa Pinia, para poder verificarla con datos de ejemplo.

---

## Implementation plan

1. **Cargas completas en los stores.** Añadir `fetchAllDelegaciones`, `fetchAllUbicaciones`, `fetchAllAlmacenes` y `fetchAllUsers` (recorrido por páginas con `per_page=100`). Verificación: type-check sin errores y las listas actuales siguen funcionando igual.
2. **Construcción del árbol.** Crear `src/utils/organization-tree.ts` con `OrgNode` y `buildOrganizationTree`. Verificación: type-check sin errores y comprobación manual con un conjunto de datos de ejemplo que incluya almacén sin delegación, usuario sin almacén y usuario sin delegación.
3. **i18n.** Añadir las claves nuevas en `es` y `en-US` (título, bloques, grupos "Sin …", contadores, botones, aviso de permisos, estados vacío y error). Verificación: type-check sin errores.
4. **Página y ruta.** Crear `OrganizationReportPage.vue`, registrar `admin/informes/organizacion` en `routes.ts` con `requiresPermission: 'usuarios.ver'`, y mostrar carga, estado vacío, error y aviso 403. Verificación manual: abrir la URL y ver el árbol con los datos reales.
5. **Menú.** Añadir el ítem en el grupo "Organización" de `MainLayout.vue` con la visibilidad indicada y actualizar la condición del grupo y la lista de rutas activas. Verificación manual con usuarios que tengan y no tengan los tres permisos.
6. **Pulido visual.** Ajustar estilos según la guía visual (tarjeta glass, píldoras de contador, chips de departamento, modo oscuro). Verificación visual en claro y oscuro y en ancho móvil.

---

## Acceptance criteria

- [ ] La ruta `/admin/informes/organizacion` muestra un árbol con las delegaciones en el primer nivel, ordenadas por nombre.
- [ ] Cada delegación muestra los contadores de almacenes, ubicaciones y usuarios, y al expandirla lista sus ubicaciones (nombre y dirección) y sus almacenes.
- [ ] Cada almacén muestra nombre, prefijo, ubicación, responsable (o "—") y el contador de usuarios.
- [ ] Cada usuario muestra nombre, alias y departamento, o "—" cuando no tiene departamento.
- [ ] Un usuario con almacén aparece bajo ese almacén; uno sin almacén aparece en "Sin almacén" de su delegación; uno sin delegación ni almacén aparece en "Sin delegación".
- [ ] Un almacén sin delegación aparece en el grupo "Sin delegación".
- [ ] La suma de usuarios del árbol coincide con el total de `GET /users` y la de almacenes con el de `GET /almacenes`.
- [ ] Con más de 100 registros en una entidad, el árbol los contiene todos (se hacen las peticiones de páginas adicionales).
- [ ] "Expandir todo" y "Contraer todo" abren y cierran todos los nodos; el estado inicial tiene las delegaciones contraídas.
- [ ] "Actualizar" repite las peticiones y refleja cambios hechos en otra pestaña.
- [ ] Mientras carga se ve un indicador; con una organización vacía se ve un estado vacío; ante un error de red se ve un mensaje (`getApiErrorMessage`) y un botón de reintento.
- [ ] Si alguna petición responde 403, se muestra el aviso de permisos insuficientes y no un árbol parcial.
- [ ] El ítem de menú solo aparece con `usuarios.ver`, `delegaciones.ver` y `catalogos.ver`; sin `usuarios.ver`, acceder a la URL redirige a `/` con la notificación existente del guard.
- [ ] La página no ofrece ninguna acción de edición, creación ni borrado.
- [ ] Todos los textos nuevos existen en `es` y `en-US`.
- [ ] La página se ve correctamente en modo claro, oscuro y ancho móvil sin scroll horizontal de página.
- [ ] `pnpm lint` y el type-check del proyecto pasan sin errores nuevos.

---

## Decisions

- **Yes:** página en pantalla de solo lectura. Es lo mínimo que cubre "informe jerárquico" sin dependencias nuevas.
- **No:** exportación a PDF/Excel/impresión. Se puede añadir después sobre el mismo árbol; va en otra spec.
- **Yes:** jerarquía Delegación → Almacén → Usuarios, con la ubicación como dato del almacén y del bloque de ubicaciones de la delegación. Refleja las dependencias de `notas-jcn/dependencias.md`.
- **No:** ubicación como nivel intermedio. Oculta ubicaciones sin almacenes y alarga el árbol; se muestran en su propio bloque dentro de la delegación.
- **No:** departamentos como nivel o listado. El departamento no depende de la delegación (SPEC 04); se muestra solo como dato del usuario.
- **Yes:** carga completa paginada en cliente. La API limita `per_page` a 100, así que se recorren las páginas; es lo más simple y suficiente para el volumen actual.
- **No:** carga perezosa por delegación o endpoint agregado. Más peticiones y lógica, o dependencia del backend.
- **Yes:** funciones `fetchAll*` en los stores que no alteran el estado de las listas, para que abrir el informe no pise los filtros ni la paginación de las pantallas de administración.
- **Yes:** el usuario cuelga de su almacén cuando lo tiene, aunque su delegación propia difiera. El almacén es el nivel más específico; el dato incoherente se muestra tal cual (criterio de SPEC 04).
- **Yes:** grupos "Sin delegación" y "Sin almacén" en lugar de descartar registros, para que el informe sea completo.
- **Yes:** reutilizar permisos `.ver` existentes. La ruta exige `usuarios.ver` porque el guard solo admite un permiso; el menú exige los tres. No se crea permiso nuevo ni se tocan roles en el backend.
- **No:** filtros y búsqueda dentro del árbol. No se han pedido.
- **Yes:** función de construcción del árbol pura en `src/utils/`, separada de la página, para poder comprobarla con datos de ejemplo.
- **Yes:** el estado se escribe en español (`Borrador`), siguiendo las SPEC 01–04.

---

## Risks

| Risk                                                                                       | Mitigation                                                                                                                      |
| ------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------- |
| Volumen alto de usuarios (miles) hace lenta la carga completa                              | Peticiones de las páginas adicionales en paralelo tras la primera; indicador de carga. Si se queda corto, otra spec con carga perezosa. |
| Un usuario con `usuarios.ver` pero sin `catalogos.ver` o `delegaciones.ver` accede por URL | Aviso de permisos insuficientes ante 403 en lugar de un árbol parcial; el ítem de menú no se muestra.                           |
| Datos incoherentes (usuario con delegación distinta a la de su almacén) confunden          | Se colocan bajo el almacén sin aviso; la validación retroactiva queda fuera de alcance.                                         |
| Cambios hechos mientras la página está abierta no se reflejan                              | Botón "Actualizar"; no hay refresco automático.                                                                                 |
| `GET /users` no devuelve `almacen` o `delegacion` en alguna fila                           | Se usan `almacenId` / `delegacionId` para colocar y los objetos solo para mostrar nombres; se cruzan con los listados cargados. |

---

## What is **not** in this spec

- Exportación a PDF, Excel/CSV o impresión.
- Filtros, búsqueda u ordenación configurable del árbol.
- Carga perezosa o endpoint agregado en el backend.
- Permiso nuevo para el informe.
- Departamentos como nivel del árbol.
- Acciones de edición sobre los nodos.
- Saneamiento de datos incoherentes.

Cada uno de esos puntos, si se aborda, va en su propia spec.
