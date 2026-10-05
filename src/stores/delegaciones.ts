import { defineStore } from 'pinia';
import { ref } from 'vue';
import { api } from '@/boot/axios';
import type { PaginationMeta } from '@/stores/users';

export interface Delegacion {
  id: number;
  nombre: string;
  prefijo: string | null;
}

export interface DelegacionesFilters {
  nombre?: string;
}

// Forma cruda del DelegacionResource del backend (ver GET /api/documentation).
// modulo_epis, modulo_vk y referencia_grupal no se mapean (fuera de alcance, ver SPEC 02).
interface DelegacionResource {
  id: number;
  nombre: string;
  prefijo: string | null;
}

interface RawPaginationMeta {
  current_page: number;
  last_page: number;
  per_page: number;
  total: number;
}

function mapDelegacion(resource: DelegacionResource): Delegacion {
  return { id: resource.id, nombre: resource.nombre, prefijo: resource.prefijo };
}

function mapMeta(meta: RawPaginationMeta): PaginationMeta {
  return {
    currentPage: meta.current_page,
    lastPage: meta.last_page,
    perPage: meta.per_page,
    total: meta.total,
  };
}

export interface DelegacionPayload {
  nombre: string;
  prefijo: string | null;
}

export const useDelegacionesStore = defineStore('delegaciones', () => {
  const items = ref<Delegacion[]>([]);
  const meta = ref<PaginationMeta>({
    currentPage: 1,
    lastPage: 1,
    perPage: 15,
    total: 0,
  });
  const loading = ref(false);
  const filters = ref<DelegacionesFilters>({});

  async function fetchDelegaciones(page = 1, perPage = 15, newFilters: DelegacionesFilters = {}) {
    loading.value = true;
    filters.value = newFilters;
    try {
      const response = await api.get<{
        data: { items: DelegacionResource[]; meta: RawPaginationMeta };
      }>('/delegaciones', {
        params: {
          page,
          per_page: perPage,
          ...(newFilters.nombre ? { nombre: newFilters.nombre } : {}),
        },
      });
      items.value = response.data.data.items.map(mapDelegacion);
      meta.value = mapMeta(response.data.data.meta);
    } finally {
      loading.value = false;
    }
  }

  async function createDelegacion(payload: DelegacionPayload) {
    await api.post('/delegaciones', payload);
    await fetchDelegaciones(meta.value.currentPage, meta.value.perPage, filters.value);
  }

  async function updateDelegacion(id: number, payload: DelegacionPayload) {
    await api.put(`/delegaciones/${id}`, payload);
    await fetchDelegaciones(meta.value.currentPage, meta.value.perPage, filters.value);
  }

  async function deleteDelegacion(id: number) {
    await api.delete(`/delegaciones/${id}`);
    await fetchDelegaciones(meta.value.currentPage, meta.value.perPage, filters.value);
  }

  // Búsqueda parcial por nombre para los selects de relación (no toca items/meta/filters).
  async function searchDelegacionesByNombre(nombre: string): Promise<Delegacion[]> {
    const response = await api.get<{
      data: { items: DelegacionResource[]; meta: RawPaginationMeta };
    }>('/delegaciones', {
      params: { per_page: 10, ...(nombre ? { nombre } : {}) },
    });
    return response.data.data.items.map(mapDelegacion);
  }

  // Recorre todas las páginas (per_page=100) sin tocar items/meta/filters.
  async function fetchAllDelegaciones(): Promise<Delegacion[]> {
    const fetchPage = async (page: number) => {
      const response = await api.get<{
        data: { items: DelegacionResource[]; meta: RawPaginationMeta };
      }>('/delegaciones', { params: { page, per_page: 100 } });
      return response.data.data;
    };
    const first = await fetchPage(1);
    const rest = await Promise.all(
      Array.from({ length: Math.max(first.meta.last_page - 1, 0) }, (_, i) => fetchPage(i + 2)),
    );
    return [first, ...rest].flatMap((page) => page.items.map(mapDelegacion));
  }

  return {
    items,
    meta,
    filters,
    loading,
    fetchAllDelegaciones,
    searchDelegacionesByNombre,
    fetchDelegaciones,
    createDelegacion,
    updateDelegacion,
    deleteDelegacion,
  };
});
