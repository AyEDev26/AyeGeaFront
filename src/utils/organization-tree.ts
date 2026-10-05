import type { Almacen } from '@/stores/almacenes';
import type { Delegacion } from '@/stores/delegaciones';
import type { Ubicacion } from '@/stores/ubicaciones';
import type { AdminUser } from '@/stores/users';

export type OrgNode =
  | {
      kind: 'delegacion';
      key: string;
      id: number | null; // null = grupo "Sin delegación"
      nombre: string;
      ubicaciones: Ubicacion[];
      children: OrgNode[];
      counts: { almacenes: number; ubicaciones: number; usuarios: number };
    }
  | {
      kind: 'almacen';
      key: string;
      almacen: Almacen | null; // null = grupo "Sin almacén"
      children: OrgNode[];
      usuariosCount: number;
    }
  | { kind: 'usuario'; key: string; user: AdminUser };

export interface OrganizationTreeInput {
  delegaciones: Delegacion[];
  ubicaciones: Ubicacion[];
  almacenes: Almacen[];
  users: AdminUser[];
}

const byNombre = (a: { nombre: string }, b: { nombre: string }) => a.nombre.localeCompare(b.nombre);
const byName = (a: { name: string }, b: { name: string }) => a.name.localeCompare(b.name);

function userNodes(users: AdminUser[]): OrgNode[] {
  return [...users].sort(byName).map((user) => ({ kind: 'usuario', key: `u-${user.id}`, user }));
}

function almacenNode(almacen: Almacen, users: AdminUser[]): OrgNode {
  return {
    kind: 'almacen',
    key: `a-${almacen.id}`,
    almacen,
    children: userNodes(users),
    usuariosCount: users.length,
  };
}

function sinAlmacenNode(delegacionKey: string, users: AdminUser[]): OrgNode {
  return {
    kind: 'almacen',
    key: `a-sin-${delegacionKey}`,
    almacen: null,
    children: userNodes(users),
    usuariosCount: users.length,
  };
}

export function buildOrganizationTree(input: OrganizationTreeInput): OrgNode[] {
  const { delegaciones, ubicaciones, almacenes, users } = input;

  const delegacionIds = new Set(delegaciones.map((d) => d.id));
  const almacenById = new Map(almacenes.map((a) => [a.id, a]));

  // Delegación efectiva (null = sin delegación; una referencia a una delegación no cargada cuenta como ninguna).
  const resolveDelegacion = (id: number | null): number | null =>
    id !== null && delegacionIds.has(id) ? id : null;

  // Usuarios por almacén (cuelgan del almacén aunque su delegación propia difiera).
  const usersByAlmacen = new Map<number, AdminUser[]>();
  // Usuarios sin almacén, por delegación efectiva.
  const usersWithoutAlmacen = new Map<number | null, AdminUser[]>();
  for (const user of users) {
    if (user.almacenId !== null && almacenById.has(user.almacenId)) {
      const list = usersByAlmacen.get(user.almacenId) ?? [];
      list.push(user);
      usersByAlmacen.set(user.almacenId, list);
    } else {
      const delegacionId = resolveDelegacion(user.delegacionId);
      const list = usersWithoutAlmacen.get(delegacionId) ?? [];
      list.push(user);
      usersWithoutAlmacen.set(delegacionId, list);
    }
  }

  const almacenesByDelegacion = new Map<number | null, Almacen[]>();
  for (const almacen of almacenes) {
    const delegacionId = resolveDelegacion(almacen.delegacionId);
    const list = almacenesByDelegacion.get(delegacionId) ?? [];
    list.push(almacen);
    almacenesByDelegacion.set(delegacionId, list);
  }

  const ubicacionesByDelegacion = new Map<number | null, Ubicacion[]>();
  for (const ubicacion of ubicaciones) {
    const delegacionId = resolveDelegacion(ubicacion.delegacionId);
    const list = ubicacionesByDelegacion.get(delegacionId) ?? [];
    list.push(ubicacion);
    ubicacionesByDelegacion.set(delegacionId, list);
  }

  function buildGroup(
    delegacionId: number | null,
    nombre: string,
  ): Extract<OrgNode, { kind: 'delegacion' }> {
    const delegacionKey = delegacionId === null ? 'sin' : String(delegacionId);
    const groupAlmacenes = [...(almacenesByDelegacion.get(delegacionId) ?? [])].sort(byNombre);
    const children: OrgNode[] = groupAlmacenes.map((a) =>
      almacenNode(a, usersByAlmacen.get(a.id) ?? []),
    );
    const orphanUsers = usersWithoutAlmacen.get(delegacionId) ?? [];
    if (orphanUsers.length > 0) children.push(sinAlmacenNode(delegacionKey, orphanUsers));

    const groupUbicaciones = [...(ubicacionesByDelegacion.get(delegacionId) ?? [])].sort(byNombre);
    const usuarios = children.reduce(
      (total, child) => total + (child.kind === 'almacen' ? child.usuariosCount : 0),
      0,
    );

    return {
      kind: 'delegacion',
      key: `d-${delegacionKey}`,
      id: delegacionId,
      nombre,
      ubicaciones: groupUbicaciones,
      children,
      counts: {
        almacenes: groupAlmacenes.length,
        ubicaciones: groupUbicaciones.length,
        usuarios,
      },
    };
  }

  const tree: OrgNode[] = [...delegaciones].sort(byNombre).map((d) => buildGroup(d.id, d.nombre));

  // El grupo "Sin delegación" solo aparece si tiene contenido; el nombre lo pone la página (i18n).
  const sinDelegacion = buildGroup(null, '');
  if (sinDelegacion.children.length > 0 || sinDelegacion.ubicaciones.length > 0) {
    tree.push(sinDelegacion);
  }

  return tree;
}
