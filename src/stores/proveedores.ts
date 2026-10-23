import { defineStore } from 'pinia';
import { ref } from 'vue';
import { api } from '@/boot/axios';
import type { PaginationMeta } from '@/stores/users';

export interface Proveedor {
  id: number;
  nombre: string;
  direccion: string | null;
  telefono: string | null;
}

export interface ProveedoresFilters {
  nombre?: string;
  telefono?: string;
}

// Forma cruda del ProveedorResource del backend (ver GET /api/documentation).
interface ProveedorResource {
  id: number;
  nombre: string;
  direccion: string | null;
  telefono: string | null;
}

interface RawPaginationMeta {
  current_page: number;
  last_page: number;
  per_page: number;
  total: number;
}

function mapProveedor(resource: ProveedorResource): Proveedor {
  return {
    id: resource.id,
    nombre: resource.nombre,
    direccion: resource.direccion ?? null,
    telefono: resource.telefono ?? null,
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

// En edición, direccion/telefono vaciados se envían como null (campos nullable en la API).
export interface ProveedorPayload {
  nombre: string;
  direccion?: string | null;
  telefono?: string | null;
}

export const useProveedoresStore = defineStore('proveedores', () => {
  const items = ref<Proveedor[]>([]);
  const meta = ref<PaginationMeta>({
    currentPage: 1,
    lastPage: 1,
    perPage: 15,
    total: 0,
  });
  const loading = ref(false);
  const filters = ref<ProveedoresFilters>({});

  async function fetchProveedores(page = 1, perPage = 15, newFilters: ProveedoresFilters = {}) {
    loading.value = true;
    filters.value = newFilters;
    try {
      const response = await api.get<{
        data: { items: ProveedorResource[]; meta: RawPaginationMeta };
      }>('/proveedores', {
        params: {
          page,
          per_page: perPage,
          ...(newFilters.nombre ? { nombre: newFilters.nombre } : {}),
          ...(newFilters.telefono ? { telefono: newFilters.telefono } : {}),
        },
      });
      items.value = response.data.data.items.map(mapProveedor);
      meta.value = mapMeta(response.data.data.meta);
    } finally {
      loading.value = false;
    }
  }

  async function createProveedor(payload: ProveedorPayload) {
    await api.post('/proveedores', payload);
    await fetchProveedores(meta.value.currentPage, meta.value.perPage, filters.value);
  }

  async function updateProveedor(id: number, payload: ProveedorPayload) {
    await api.put(`/proveedores/${id}`, payload);
    await fetchProveedores(meta.value.currentPage, meta.value.perPage, filters.value);
  }

  async function deleteProveedor(id: number) {
    await api.delete(`/proveedores/${id}`);
    await fetchProveedores(meta.value.currentPage, meta.value.perPage, filters.value);
  }

  // Recorre todas las páginas (per_page=100) sin tocar items/meta/filters.
  async function fetchAllProveedores(): Promise<Proveedor[]> {
    const fetchPage = async (page: number) => {
      const response = await api.get<{
        data: { items: ProveedorResource[]; meta: RawPaginationMeta };
      }>('/proveedores', { params: { page, per_page: 100 } });
      return response.data.data;
    };
    const first = await fetchPage(1);
    const rest = await Promise.all(
      Array.from({ length: Math.max(first.meta.last_page - 1, 0) }, (_, i) => fetchPage(i + 2)),
    );
    return [first, ...rest].flatMap((page) => page.items.map(mapProveedor));
  }

  return {
    items,
    meta,
    filters,
    loading,
    fetchProveedores,
    createProveedor,
    updateProveedor,
    deleteProveedor,
    fetchAllProveedores,
  };
});
