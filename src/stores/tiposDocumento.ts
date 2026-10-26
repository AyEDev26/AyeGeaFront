import { defineStore } from 'pinia';
import { ref } from 'vue';
import { api } from '@/boot/axios';
import type { PaginationMeta } from '@/stores/users';

export interface TipoDocumento {
  id: number;
  descripcion: string;
}

export interface TiposDocumentoFilters {
  descripcion?: string;
}

// Forma cruda del TipoDocumentoResource del backend (ver GET /api/documentation).
interface TipoDocumentoResource {
  id: number;
  descripcion: string;
}

interface RawPaginationMeta {
  current_page: number;
  last_page: number;
  per_page: number;
  total: number;
}

function mapTipoDocumento(resource: TipoDocumentoResource): TipoDocumento {
  return {
    id: resource.id,
    descripcion: resource.descripcion,
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
export interface TipoDocumentoPayload {
  descripcion: string;
}

export const useTiposDocumentoStore = defineStore('tiposDocumento', () => {
  const items = ref<TipoDocumento[]>([]);
  const meta = ref<PaginationMeta>({
    currentPage: 1,
    lastPage: 1,
    perPage: 15,
    total: 0,
  });
  const loading = ref(false);
  const filters = ref<TiposDocumentoFilters>({});

  async function fetchTiposDocumento(
    page = 1,
    perPage = 15,
    newFilters: TiposDocumentoFilters = {},
  ) {
    loading.value = true;
    filters.value = newFilters;
    try {
      const response = await api.get<{
        data: { items: TipoDocumentoResource[]; meta: RawPaginationMeta };
      }>('/tipos-documento', {
        params: {
          page,
          per_page: perPage,
          ...(newFilters.descripcion ? { descripcion: newFilters.descripcion } : {}),
        },
      });
      items.value = response.data.data.items.map(mapTipoDocumento);
      meta.value = mapMeta(response.data.data.meta);
    } finally {
      loading.value = false;
    }
  }

  async function createTipoDocumento(payload: TipoDocumentoPayload) {
    await api.post('/tipos-documento', payload);
    await fetchTiposDocumento(meta.value.currentPage, meta.value.perPage, filters.value);
  }

  async function updateTipoDocumento(id: number, payload: TipoDocumentoPayload) {
    await api.put(`/tipos-documento/${id}`, payload);
    await fetchTiposDocumento(meta.value.currentPage, meta.value.perPage, filters.value);
  }

  async function deleteTipoDocumento(id: number) {
    await api.delete(`/tipos-documento/${id}`);
    await fetchTiposDocumento(meta.value.currentPage, meta.value.perPage, filters.value);
  }

  return {
    items,
    meta,
    filters,
    loading,
    fetchTiposDocumento,
    createTipoDocumento,
    updateTipoDocumento,
    deleteTipoDocumento,
  };
});
