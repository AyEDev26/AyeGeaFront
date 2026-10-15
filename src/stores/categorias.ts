import { defineStore } from 'pinia';
import { ref } from 'vue';
import { api } from '@/boot/axios';
import type { PaginationMeta } from '@/stores/users';

export interface Categoria {
  id: number;
  tipoElementoInventarioId: number;
  tipoElementoInventario: { id: number; descripcion: string } | null;
  nombre: string;
  prefijo: string | null;
}

export interface CategoriasFilters {
  nombre?: string;
  prefijo?: string;
  tipoElementoInventarioId?: number;
}

// Forma cruda del CategoriaResource del backend (ver GET /api/documentation).
interface CategoriaResource {
  id: number;
  tipo_elemento_inventario_id: number;
  tipo_elemento_inventario?: { id: number; descripcion: string } | null;
  nombre: string;
  prefijo: string | null;
}

interface RawPaginationMeta {
  current_page: number;
  last_page: number;
  per_page: number;
  total: number;
}

function mapCategoria(resource: CategoriaResource): Categoria {
  return {
    id: resource.id,
    tipoElementoInventarioId: resource.tipo_elemento_inventario_id,
    tipoElementoInventario: resource.tipo_elemento_inventario
      ? {
          id: resource.tipo_elemento_inventario.id,
          descripcion: resource.tipo_elemento_inventario.descripcion,
        }
      : null,
    nombre: resource.nombre,
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

// En edición, prefijo vaciado se envía como null (campo nullable en la API).
export interface CategoriaPayload {
  tipo_elemento_inventario_id: number;
  nombre: string;
  prefijo?: string | null;
}

export const useCategoriasStore = defineStore('categorias', () => {
  const items = ref<Categoria[]>([]);
  const meta = ref<PaginationMeta>({
    currentPage: 1,
    lastPage: 1,
    perPage: 15,
    total: 0,
  });
  const loading = ref(false);
  const filters = ref<CategoriasFilters>({});

  async function fetchCategorias(page = 1, perPage = 15, newFilters: CategoriasFilters = {}) {
    loading.value = true;
    filters.value = newFilters;
    try {
      const response = await api.get<{
        data: { items: CategoriaResource[]; meta: RawPaginationMeta };
      }>('/categorias', {
        params: {
          page,
          per_page: perPage,
          ...(newFilters.nombre ? { nombre: newFilters.nombre } : {}),
          ...(newFilters.prefijo ? { prefijo: newFilters.prefijo } : {}),
          ...(newFilters.tipoElementoInventarioId
            ? { tipo_elemento_inventario_id: newFilters.tipoElementoInventarioId }
            : {}),
        },
      });
      items.value = response.data.data.items.map(mapCategoria);
      meta.value = mapMeta(response.data.data.meta);
    } finally {
      loading.value = false;
    }
  }

  async function createCategoria(payload: CategoriaPayload) {
    await api.post('/categorias', payload);
    await fetchCategorias(meta.value.currentPage, meta.value.perPage, filters.value);
  }

  async function updateCategoria(id: number, payload: CategoriaPayload) {
    await api.put(`/categorias/${id}`, payload);
    await fetchCategorias(meta.value.currentPage, meta.value.perPage, filters.value);
  }

  async function deleteCategoria(id: number) {
    await api.delete(`/categorias/${id}`);
    await fetchCategorias(meta.value.currentPage, meta.value.perPage, filters.value);
  }

  // Recorre todas las páginas (per_page=100) sin tocar items/meta/filters.
  async function fetchAllCategorias(): Promise<Categoria[]> {
    const fetchPage = async (page: number) => {
      const response = await api.get<{
        data: { items: CategoriaResource[]; meta: RawPaginationMeta };
      }>('/categorias', { params: { page, per_page: 100 } });
      return response.data.data;
    };
    const first = await fetchPage(1);
    const rest = await Promise.all(
      Array.from({ length: Math.max(first.meta.last_page - 1, 0) }, (_, i) => fetchPage(i + 2)),
    );
    return [first, ...rest].flatMap((page) => page.items.map(mapCategoria));
  }

  return {
    items,
    meta,
    filters,
    loading,
    fetchCategorias,
    createCategoria,
    updateCategoria,
    deleteCategoria,
    fetchAllCategorias,
  };
});
