import { defineStore } from 'pinia';
import { ref } from 'vue';
import { api } from '@/boot/axios';

export interface TipoElementoInventario {
  id: number;
  descripcion: string;
}

// Forma cruda del TipoElementoInventarioResource del backend (ver GET /api/documentation).
interface TipoElementoInventarioResource {
  id: number;
  descripcion: string;
}

// Store de solo lectura: la API no permite crear/editar/borrar tipos.
export const useTiposElementoStore = defineStore('tiposElemento', () => {
  const items = ref<TipoElementoInventario[]>([]);
  const loaded = ref(false);
  const loading = ref(false);

  // Listado completo sin paginar; cacheado tras la primera carga (force=true lo recarga).
  async function fetchTipos(force = false) {
    if (loaded.value && !force) return;
    loading.value = true;
    try {
      const response = await api.get<{ data: TipoElementoInventarioResource[] }>(
        '/tipos-elemento-inventario',
      );
      items.value = response.data.data.map((t) => ({ id: t.id, descripcion: t.descripcion }));
      loaded.value = true;
    } finally {
      loading.value = false;
    }
  }

  return { items, loading, fetchTipos };
});
