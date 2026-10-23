import { defineStore } from 'pinia';
import { ref } from 'vue';
import { api } from '@/boot/axios';
import type { PaginationMeta } from '@/stores/users';

export type TipoElemInventarioId = 1 | 2 | 3;

interface NamedRef {
  id: number;
  nombre: string;
}

export interface ElemInventario {
  id: number;
  tipoElementoInventarioId: number;
  referencia: string | null;
  nombre: string;
  categoria: NamedRef | null;
  subcategoria: NamedRef | null;
  delegacion: NamedRef | null;
  ubicacion: NamedRef | null;
  estadoId: 0 | 1;
  estado: { id: number; descripcion: string } | null;
  vehiculo?: {
    matricula: string | null;
    marca: string | null;
    modelo: string | null;
    proximaRevision: string | null;
  };
  maquinaria?: { marca: string | null; modelo: string | null; proximaRevision: string | null };
  epi?: { stockMinimo: number | null };
}

export interface ElemsInventarioFilters {
  nombre?: string;
  referencia?: string;
  nSerie?: string;
  estadoId?: 0 | 1 | null;
  categoriaId?: number | null;
  subcategoriaId?: number | null;
  delegacionId?: number | null;
  ubicacionId?: number | null;
  departamentoId?: number | null;
  proveedorId?: number | null;
  matricula?: string; // solo tipo 1
}

// Forma cruda del ElemInventarioResource del backend (ver GET /api/documentation).
interface ElemInventarioResource {
  id: number;
  tipo_elemento_inventario_id: number;
  referencia?: string | null;
  nombre: string;
  categoria?: NamedRef | null;
  subcategoria?: NamedRef | null;
  delegacion?: NamedRef | null;
  ubicacion?: NamedRef | null;
  estado_id: number;
  estado?: { id: number; descripcion: string } | null;
  vehiculo?: {
    matricula?: string | null;
    marca?: string | null;
    modelo?: string | null;
    proxima_revision?: string | null;
  } | null;
  maquinaria?: {
    marca?: string | null;
    modelo?: string | null;
    proxima_revision?: string | null;
  } | null;
  epi?: { stock_minimo?: number | null } | null;
}

interface RawPaginationMeta {
  current_page: number;
  last_page: number;
  per_page: number;
  total: number;
}

function mapNamed(ref: NamedRef | null | undefined): NamedRef | null {
  return ref ? { id: ref.id, nombre: ref.nombre } : null;
}

function mapElem(resource: ElemInventarioResource): ElemInventario {
  const elem: ElemInventario = {
    id: resource.id,
    tipoElementoInventarioId: resource.tipo_elemento_inventario_id,
    referencia: resource.referencia ?? null,
    nombre: resource.nombre,
    categoria: mapNamed(resource.categoria),
    subcategoria: mapNamed(resource.subcategoria),
    delegacion: mapNamed(resource.delegacion),
    ubicacion: mapNamed(resource.ubicacion),
    estadoId: resource.estado_id === 1 ? 1 : 0,
    estado: resource.estado
      ? { id: resource.estado.id, descripcion: resource.estado.descripcion }
      : null,
  };
  if (resource.vehiculo) {
    elem.vehiculo = {
      matricula: resource.vehiculo.matricula ?? null,
      marca: resource.vehiculo.marca ?? null,
      modelo: resource.vehiculo.modelo ?? null,
      proximaRevision: resource.vehiculo.proxima_revision ?? null,
    };
  }
  if (resource.maquinaria) {
    elem.maquinaria = {
      marca: resource.maquinaria.marca ?? null,
      modelo: resource.maquinaria.modelo ?? null,
      proximaRevision: resource.maquinaria.proxima_revision ?? null,
    };
  }
  if (resource.epi) {
    elem.epi = { stockMinimo: resource.epi.stock_minimo ?? null };
  }
  return elem;
}

function mapMeta(meta: RawPaginationMeta): PaginationMeta {
  return {
    currentPage: meta.current_page,
    lastPage: meta.last_page,
    perPage: meta.per_page,
    total: meta.total,
  };
}

// Los filtros vacíos no se envían; estado_id = 0 sí.
function buildFilterParams(tipoId: TipoElemInventarioId, f: ElemsInventarioFilters) {
  const params: Record<string, string | number> = {};
  if (f.nombre) params.nombre = f.nombre;
  if (f.referencia) params.referencia = f.referencia;
  if (f.nSerie) params.n_serie = f.nSerie;
  if (f.estadoId !== undefined && f.estadoId !== null) params.estado_id = f.estadoId;
  if (f.categoriaId) params.categoria_id = f.categoriaId;
  if (f.subcategoriaId) params.subcategoria_id = f.subcategoriaId;
  if (f.delegacionId) params.delegacion_id = f.delegacionId;
  if (f.ubicacionId) params.ubicacion_id = f.ubicacionId;
  if (f.departamentoId) params.departamento_id = f.departamentoId;
  if (f.proveedorId) params.proveedor_id = f.proveedorId;
  if (tipoId === 1 && f.matricula) params.matricula = f.matricula;
  return params;
}

interface TipoState {
  items: ElemInventario[];
  meta: PaginationMeta;
  loading: boolean;
  filters: ElemsInventarioFilters;
}

function createTipoState(): TipoState {
  return {
    items: [],
    meta: { currentPage: 1, lastPage: 1, perPage: 15, total: 0 },
    loading: false,
    filters: {},
  };
}

export const useElemsInventarioStore = defineStore('elemsInventario', () => {
  // Estado independiente por tipo: cada pantalla conserva su página, filtros y filas por página.
  const byTipo = ref<Record<TipoElemInventarioId, TipoState>>({
    1: createTipoState(),
    2: createTipoState(),
    3: createTipoState(),
  });

  async function fetchElems(
    tipoId: TipoElemInventarioId,
    page = 1,
    perPage = 15,
    newFilters: ElemsInventarioFilters = {},
  ) {
    const state = byTipo.value[tipoId];
    state.loading = true;
    state.filters = newFilters;
    try {
      const response = await api.get<{
        data: { items: ElemInventarioResource[]; meta: RawPaginationMeta };
      }>('/elems-inventario', {
        params: {
          tipo_elemento_inventario_id: tipoId,
          page,
          per_page: perPage,
          ...buildFilterParams(tipoId, newFilters),
        },
      });
      state.items = response.data.data.items.map(mapElem);
      state.meta = mapMeta(response.data.data.meta);
    } finally {
      state.loading = false;
    }
  }

  return { byTipo, fetchElems };
});
