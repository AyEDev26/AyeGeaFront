import { defineStore } from 'pinia';
import { ref } from 'vue';
import { api } from '@/boot/axios';
import type { PaginationMeta } from '@/stores/users';

export interface Departamento {
  id: number;
  nombre: string;
}

export interface DepartamentosFilters {
  nombre?: string;
}

// Forma cruda del DepartamentoResource del backend (ver GET /api/documentation).
interface DepartamentoResource {
  id: number;
  nombre: string;
}

interface RawPaginationMeta {
  current_page: number;
  last_page: number;
  per_page: number;
  total: number;
}

function mapDepartamento(resource: DepartamentoResource): Departamento {
  return { id: resource.id, nombre: resource.nombre };
}

function mapMeta(meta: RawPaginationMeta): PaginationMeta {
  return {
    currentPage: meta.current_page,
    lastPage: meta.last_page,
    perPage: meta.per_page,
    total: meta.total,
  };
}

export interface DepartamentoPayload {
  nombre: string;
}

export const useDepartamentosStore = defineStore('departamentos', () => {
  const items = ref<Departamento[]>([]);
  const meta = ref<PaginationMeta>({
    currentPage: 1,
    lastPage: 1,
    perPage: 15,
    total: 0,
  });
  const loading = ref(false);
  const filters = ref<DepartamentosFilters>({});

  async function fetchDepartamentos(page = 1, perPage = 15, newFilters: DepartamentosFilters = {}) {
    loading.value = true;
    filters.value = newFilters;
    try {
      const response = await api.get<{
        data: { items: DepartamentoResource[]; meta: RawPaginationMeta };
      }>('/departamentos', {
        params: {
          page,
          per_page: perPage,
          ...(newFilters.nombre ? { nombre: newFilters.nombre } : {}),
        },
      });
      items.value = response.data.data.items.map(mapDepartamento);
      meta.value = mapMeta(response.data.data.meta);
    } finally {
      loading.value = false;
    }
  }

  async function createDepartamento(payload: DepartamentoPayload) {
    await api.post('/departamentos', payload);
    await fetchDepartamentos(meta.value.currentPage, meta.value.perPage, filters.value);
  }

  async function updateDepartamento(id: number, payload: DepartamentoPayload) {
    await api.put(`/departamentos/${id}`, payload);
    await fetchDepartamentos(meta.value.currentPage, meta.value.perPage, filters.value);
  }

  async function deleteDepartamento(id: number) {
    await api.delete(`/departamentos/${id}`);
    await fetchDepartamentos(meta.value.currentPage, meta.value.perPage, filters.value);
  }

  // Búsqueda parcial por nombre para los selects de relación (no toca items/meta/filters).
  async function searchDepartamentosByNombre(nombre: string): Promise<Departamento[]> {
    const response = await api.get<{
      data: { items: DepartamentoResource[]; meta: RawPaginationMeta };
    }>('/departamentos', {
      params: { per_page: 10, ...(nombre ? { nombre } : {}) },
    });
    return response.data.data.items.map(mapDepartamento);
  }

  return {
    items,
    meta,
    filters,
    loading,
    searchDepartamentosByNombre,
    fetchDepartamentos,
    createDepartamento,
    updateDepartamento,
    deleteDepartamento,
  };
});
