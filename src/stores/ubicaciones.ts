import { defineStore } from 'pinia';
import { ref } from 'vue';
import { api } from '@/boot/axios';
import type { PaginationMeta } from '@/stores/users';

export interface Ubicacion {
  id: number;
  nombre: string;
  direccion: string | null;
  prefijo: string | null;
  delegacionId: number | null;
  delegacion: { id: number; nombre: string } | null;
}

export interface UbicacionesFilters {
  nombre?: string;
}

// Forma cruda del UbicacionResource del backend (ver GET /api/documentation).
interface UbicacionResource {
  id: number;
  nombre: string;
  direccion: string | null;
  prefijo: string | null;
  delegacion_id: number | null;
  delegacion: { id: number; nombre: string } | null;
}

interface RawPaginationMeta {
  current_page: number;
  last_page: number;
  per_page: number;
  total: number;
}

function mapUbicacion(resource: UbicacionResource): Ubicacion {
  return {
    id: resource.id,
    nombre: resource.nombre,
    direccion: resource.direccion,
    prefijo: resource.prefijo,
    delegacionId: resource.delegacion_id,
    delegacion: resource.delegacion,
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

export interface UbicacionPayload {
  nombre: string;
  direccion: string | null;
  prefijo: string | null;
  delegacion_id: number | null;
}

export const useUbicacionesStore = defineStore('ubicaciones', () => {
  const items = ref<Ubicacion[]>([]);
  const meta = ref<PaginationMeta>({
    currentPage: 1,
    lastPage: 1,
    perPage: 15,
    total: 0,
  });
  const loading = ref(false);
  const filters = ref<UbicacionesFilters>({});

  async function fetchUbicaciones(page = 1, perPage = 15, newFilters: UbicacionesFilters = {}) {
    loading.value = true;
    filters.value = newFilters;
    try {
      const response = await api.get<{
        data: { items: UbicacionResource[]; meta: RawPaginationMeta };
      }>('/ubicaciones', {
        params: {
          page,
          per_page: perPage,
          ...(newFilters.nombre ? { nombre: newFilters.nombre } : {}),
        },
      });
      items.value = response.data.data.items.map(mapUbicacion);
      meta.value = mapMeta(response.data.data.meta);
    } finally {
      loading.value = false;
    }
  }

  async function createUbicacion(payload: UbicacionPayload) {
    await api.post('/ubicaciones', payload);
    await fetchUbicaciones(meta.value.currentPage, meta.value.perPage, filters.value);
  }

  async function updateUbicacion(id: number, payload: UbicacionPayload) {
    await api.put(`/ubicaciones/${id}`, payload);
    await fetchUbicaciones(meta.value.currentPage, meta.value.perPage, filters.value);
  }

  async function deleteUbicacion(id: number) {
    await api.delete(`/ubicaciones/${id}`);
    await fetchUbicaciones(meta.value.currentPage, meta.value.perPage, filters.value);
  }

  // Búsqueda parcial por nombre para los selects de relación (no toca items/meta/filters).
  async function searchUbicacionesByNombre(
    nombre: string,
    delegacionId?: number,
  ): Promise<Ubicacion[]> {
    const response = await api.get<{
      data: { items: UbicacionResource[]; meta: RawPaginationMeta };
    }>('/ubicaciones', {
      params: {
        per_page: 10,
        ...(nombre ? { nombre } : {}),
        ...(delegacionId !== undefined ? { delegacion_id: delegacionId } : {}),
      },
    });
    return response.data.data.items.map(mapUbicacion);
  }

  return {
    items,
    meta,
    filters,
    loading,
    searchUbicacionesByNombre,
    fetchUbicaciones,
    createUbicacion,
    updateUbicacion,
    deleteUbicacion,
  };
});
