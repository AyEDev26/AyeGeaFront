import { defineStore } from 'pinia';
import { ref } from 'vue';
import { api } from '@/boot/axios';
import type { PaginationMeta } from '@/stores/users';

export interface Subcategoria {
  id: number;
  categoriaId: number;
  categoria: { id: number; nombre: string; tipoElementoInventarioId: number } | null;
  nombre: string;
  periodicidadId: number | null;
  periodicidad: { id: number; descripcion: string; meses: number } | null;
  prefijo: string | null;
}

export interface PeriodicidadOption {
  id: number;
  descripcion: string;
  meses: number;
}

export interface SubcategoriasFilters {
  nombre?: string;
  prefijo?: string;
  categoriaId?: number;
  tipoElementoInventarioId?: number;
  periodicidadId?: number;
}

// Forma cruda del SubcategoriaResource del backend (ver GET /api/documentation).
interface SubcategoriaResource {
  id: number;
  categoria_id: number;
  categoria?: { id: number; nombre: string; tipo_elemento_inventario_id: number } | null;
  nombre: string;
  periodicidad_id: number | null;
  periodicidad?: { id: number; descripcion: string; meses: number } | null;
  prefijo: string | null;
}

interface PeriodicidadResource {
  id: number;
  descripcion: string;
  meses: number;
}

interface RawPaginationMeta {
  current_page: number;
  last_page: number;
  per_page: number;
  total: number;
}

function mapSubcategoria(resource: SubcategoriaResource): Subcategoria {
  return {
    id: resource.id,
    categoriaId: resource.categoria_id,
    categoria: resource.categoria
      ? {
          id: resource.categoria.id,
          nombre: resource.categoria.nombre,
          tipoElementoInventarioId: resource.categoria.tipo_elemento_inventario_id,
        }
      : null,
    nombre: resource.nombre,
    periodicidadId: resource.periodicidad_id ?? null,
    periodicidad: resource.periodicidad
      ? {
          id: resource.periodicidad.id,
          descripcion: resource.periodicidad.descripcion,
          meses: resource.periodicidad.meses,
        }
      : null,
    prefijo: resource.prefijo ?? null,
  };
}

function mapMeta(meta: RawPaginationMeta): PaginationMeta {
  return {
    currentPage: meta.current_page,
    lastPage: meta.last_page,
    perPage: meta.per_page,
    total: meta.total,
  };
}

// En edición, prefijo y periodicidad_id vaciados se envían como null (campos nullable en la API).
export interface SubcategoriaPayload {
  categoria_id: number;
  nombre: string;
  periodicidad_id?: number | null;
  prefijo?: string | null;
}

export const useSubcategoriasStore = defineStore('subcategorias', () => {
  const items = ref<Subcategoria[]>([]);
  const meta = ref<PaginationMeta>({
    currentPage: 1,
    lastPage: 1,
    perPage: 15,
    total: 0,
  });
  const loading = ref(false);
  const filters = ref<SubcategoriasFilters>({});

  async function fetchSubcategorias(page = 1, perPage = 15, newFilters: SubcategoriasFilters = {}) {
    loading.value = true;
    filters.value = newFilters;
    try {
      const response = await api.get<{
        data: { items: SubcategoriaResource[]; meta: RawPaginationMeta };
      }>('/subcategorias', {
        params: {
          page,
          per_page: perPage,
          ...(newFilters.nombre ? { nombre: newFilters.nombre } : {}),
          ...(newFilters.prefijo ? { prefijo: newFilters.prefijo } : {}),
          ...(newFilters.categoriaId ? { categoria_id: newFilters.categoriaId } : {}),
          ...(newFilters.tipoElementoInventarioId
            ? { tipo_elemento_inventario_id: newFilters.tipoElementoInventarioId }
            : {}),
          ...(newFilters.periodicidadId ? { periodicidad_id: newFilters.periodicidadId } : {}),
        },
      });
      items.value = response.data.data.items.map(mapSubcategoria);
      meta.value = mapMeta(response.data.data.meta);
    } finally {
      loading.value = false;
    }
  }

  async function createSubcategoria(payload: SubcategoriaPayload) {
    await api.post('/subcategorias', payload);
    await fetchSubcategorias(meta.value.currentPage, meta.value.perPage, filters.value);
  }

  async function updateSubcategoria(id: number, payload: SubcategoriaPayload) {
    await api.put(`/subcategorias/${id}`, payload);
    await fetchSubcategorias(meta.value.currentPage, meta.value.perPage, filters.value);
  }

  async function deleteSubcategoria(id: number) {
    await api.delete(`/subcategorias/${id}`);
    await fetchSubcategorias(meta.value.currentPage, meta.value.perPage, filters.value);
  }

  // Lectura de GET /periodicidades recorriendo todas las páginas (per_page=100), solo para selects.
  // No depende del store de periodicidades de SPEC 09.
  async function fetchPeriodicidadOptions(): Promise<PeriodicidadOption[]> {
    const fetchPage = async (page: number) => {
      const response = await api.get<{
        data: { items: PeriodicidadResource[]; meta: RawPaginationMeta };
      }>('/periodicidades', { params: { page, per_page: 100 } });
      return response.data.data;
    };
    const first = await fetchPage(1);
    const rest = await Promise.all(
      Array.from({ length: Math.max(first.meta.last_page - 1, 0) }, (_, i) => fetchPage(i + 2)),
    );
    return [first, ...rest].flatMap((page) =>
      page.items.map((p) => ({ id: p.id, descripcion: p.descripcion, meses: p.meses })),
    );
  }

  return {
    items,
    meta,
    filters,
    loading,
    fetchSubcategorias,
    createSubcategoria,
    updateSubcategoria,
    deleteSubcategoria,
    fetchPeriodicidadOptions,
  };
});
