import { defineStore } from 'pinia';
import { ref } from 'vue';
import { api } from '@/boot/axios';
import type { PaginationMeta } from '@/stores/users';

export interface Periodicidad {
  id: number;
  descripcion: string;
  meses: number; // 0 = sin periodicidad en meses
}

export interface PeriodicidadesFilters {
  descripcion?: string;
}

// Forma cruda del PeriodicidadResource del backend (ver GET /api/documentation).
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

function mapPeriodicidad(resource: PeriodicidadResource): Periodicidad {
  return {
    id: resource.id,
    descripcion: resource.descripcion,
    meses: Number(resource.meses),
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

// Ningún campo es nullable: no se envían null ni strings vacíos.
export interface PeriodicidadPayload {
  descripcion: string;
  meses: number;
}

export const usePeriodicidadesStore = defineStore('periodicidades', () => {
  const items = ref<Periodicidad[]>([]);
  const meta = ref<PaginationMeta>({
    currentPage: 1,
    lastPage: 1,
    perPage: 15,
    total: 0,
  });
  const loading = ref(false);
  const filters = ref<PeriodicidadesFilters>({});

  async function fetchPeriodicidades(
    page = 1,
    perPage = 15,
    newFilters: PeriodicidadesFilters = {},
  ) {
    loading.value = true;
    filters.value = newFilters;
    try {
      const response = await api.get<{
        data: { items: PeriodicidadResource[]; meta: RawPaginationMeta };
      }>('/periodicidades', {
        params: {
          page,
          per_page: perPage,
          ...(newFilters.descripcion ? { descripcion: newFilters.descripcion } : {}),
        },
      });
      items.value = response.data.data.items.map(mapPeriodicidad);
      meta.value = mapMeta(response.data.data.meta);
    } finally {
      loading.value = false;
    }
  }

  async function createPeriodicidad(payload: PeriodicidadPayload) {
    await api.post('/periodicidades', payload);
    await fetchPeriodicidades(meta.value.currentPage, meta.value.perPage, filters.value);
  }

  async function updatePeriodicidad(id: number, payload: PeriodicidadPayload) {
    await api.put(`/periodicidades/${id}`, payload);
    await fetchPeriodicidades(meta.value.currentPage, meta.value.perPage, filters.value);
  }

  async function deletePeriodicidad(id: number) {
    await api.delete(`/periodicidades/${id}`);
    await fetchPeriodicidades(meta.value.currentPage, meta.value.perPage, filters.value);
  }

  // Recorre todas las páginas (per_page=100) sin tocar items/meta/filters.
  async function fetchAllPeriodicidades(): Promise<Periodicidad[]> {
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
    return [first, ...rest].flatMap((page) => page.items.map(mapPeriodicidad));
  }

  return {
    items,
    meta,
    filters,
    loading,
    fetchPeriodicidades,
    fetchAllPeriodicidades,
    createPeriodicidad,
    updatePeriodicidad,
    deletePeriodicidad,
  };
});
