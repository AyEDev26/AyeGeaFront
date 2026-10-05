import { defineStore } from 'pinia';
import { ref } from 'vue';
import { api } from '@/boot/axios';
import type { PaginationMeta } from '@/stores/users';

export interface Almacen {
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

export interface AlmacenesFilters {
  nombre?: string;
}

// Forma cruda del AlmacenResource del backend (ver GET /api/documentation).
interface AlmacenResource {
  id: number;
  nombre: string;
  prefijo: string | null;
  delegacion_id: number | null;
  delegacion: { id: number; nombre: string } | null;
  ubicacion_id: number | null;
  ubicacion: { id: number; nombre: string } | null;
  responsable_id: number | null;
  responsable: { id: number; name: string } | null;
}

interface RawPaginationMeta {
  current_page: number;
  last_page: number;
  per_page: number;
  total: number;
}

function mapAlmacen(resource: AlmacenResource): Almacen {
  return {
    id: resource.id,
    nombre: resource.nombre,
    prefijo: resource.prefijo,
    delegacionId: resource.delegacion_id,
    delegacion: resource.delegacion,
    ubicacionId: resource.ubicacion_id,
    ubicacion: resource.ubicacion,
    responsableId: resource.responsable_id,
    responsable: resource.responsable,
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

export interface AlmacenPayload {
  nombre: string;
  prefijo: string | null;
  delegacion_id: number | null;
  ubicacion_id: number | null;
  responsable_id: number | null;
}

export const useAlmacenesStore = defineStore('almacenes', () => {
  const items = ref<Almacen[]>([]);
  const meta = ref<PaginationMeta>({
    currentPage: 1,
    lastPage: 1,
    perPage: 15,
    total: 0,
  });
  const loading = ref(false);
  const filters = ref<AlmacenesFilters>({});

  async function fetchAlmacenes(page = 1, perPage = 15, newFilters: AlmacenesFilters = {}) {
    loading.value = true;
    filters.value = newFilters;
    try {
      const response = await api.get<{
        data: { items: AlmacenResource[]; meta: RawPaginationMeta };
      }>('/almacenes', {
        params: {
          page,
          per_page: perPage,
          ...(newFilters.nombre ? { nombre: newFilters.nombre } : {}),
        },
      });
      items.value = response.data.data.items.map(mapAlmacen);
      meta.value = mapMeta(response.data.data.meta);
    } finally {
      loading.value = false;
    }
  }

  async function createAlmacen(payload: AlmacenPayload) {
    await api.post('/almacenes', payload);
    await fetchAlmacenes(meta.value.currentPage, meta.value.perPage, filters.value);
  }

  async function updateAlmacen(id: number, payload: AlmacenPayload) {
    await api.put(`/almacenes/${id}`, payload);
    await fetchAlmacenes(meta.value.currentPage, meta.value.perPage, filters.value);
  }

  async function deleteAlmacen(id: number) {
    await api.delete(`/almacenes/${id}`);
    await fetchAlmacenes(meta.value.currentPage, meta.value.perPage, filters.value);
  }

  // Búsqueda parcial por nombre para los selects de relación (no toca items/meta/filters).
  async function searchAlmacenesByNombre(nombre: string): Promise<Almacen[]> {
    const response = await api.get<{
      data: { items: AlmacenResource[]; meta: RawPaginationMeta };
    }>('/almacenes', {
      params: { per_page: 10, ...(nombre ? { nombre } : {}) },
    });
    return response.data.data.items.map(mapAlmacen);
  }

  return {
    items,
    meta,
    filters,
    loading,
    searchAlmacenesByNombre,
    fetchAlmacenes,
    createAlmacen,
    updateAlmacen,
    deleteAlmacen,
  };
});
