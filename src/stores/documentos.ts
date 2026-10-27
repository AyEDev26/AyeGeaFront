import { defineStore } from 'pinia';
import { ref } from 'vue';
import { api } from '@/boot/axios';
import type { PaginationMeta } from '@/stores/users';

export interface DocumentoRelacion {
  id: number;
  nombre: string;
}

export interface Documento {
  id: number;
  descripcion: string;
  tipoDocumentoId: number;
  tipoDocumento: { id: number; descripcion: string } | null;
  fechaCaducidad: string | null;
  caducado: boolean;
  nombreOriginal: string;
  mime: string;
  tamano: number;
  subidoPor: { id: number; name: string } | null;
  categorias: DocumentoRelacion[];
  subcategorias: DocumentoRelacion[];
  createdAt: string;
}

export interface DocumentosFilters {
  descripcion?: string;
  tipoDocumentoId?: number;
  categoriaId?: number;
  subcategoriaId?: number;
}

// Forma cruda del DocumentoResource del backend (ver GET /api/documentation).
// `elems_inventario`, `url_descarga` y `updated_at` no se mapean.
interface DocumentoResource {
  id: number;
  descripcion: string;
  tipo_documento_id: number;
  tipo_documento: { id: number; descripcion: string } | null;
  fecha_caducidad: string | null;
  caducado: boolean;
  nombre_original: string;
  mime: string;
  tamano: number;
  subido_por: { id: number; name: string } | null;
  categorias: DocumentoRelacion[];
  subcategorias: DocumentoRelacion[];
  created_at: string;
}

interface RawPaginationMeta {
  current_page: number;
  last_page: number;
  per_page: number;
  total: number;
}

function mapDocumento(resource: DocumentoResource): Documento {
  return {
    id: resource.id,
    descripcion: resource.descripcion,
    tipoDocumentoId: resource.tipo_documento_id,
    tipoDocumento: resource.tipo_documento ?? null,
    fechaCaducidad: resource.fecha_caducidad ?? null,
    caducado: resource.caducado,
    nombreOriginal: resource.nombre_original,
    mime: resource.mime,
    tamano: resource.tamano,
    subidoPor: resource.subido_por ?? null,
    categorias: resource.categorias ?? [],
    subcategorias: resource.subcategorias ?? [],
    createdAt: resource.created_at,
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

export interface DocumentoCreatePayload {
  fichero: File;
  descripcion: string;
  tipoDocumentoId: number;
  fechaCaducidad: string | null;
  categorias: number[];
  subcategorias: number[];
}

export interface DocumentoUpdatePayload {
  descripcion: string;
  tipoDocumentoId: number;
  fechaCaducidad: string | null;
  categorias: number[];
  subcategorias: number[];
}

function triggerDownload(blob: Blob, fileName: string) {
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = fileName;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}

export const useDocumentosStore = defineStore('documentos', () => {
  const items = ref<Documento[]>([]);
  const meta = ref<PaginationMeta>({
    currentPage: 1,
    lastPage: 1,
    perPage: 15,
    total: 0,
  });
  const loading = ref(false);
  const filters = ref<DocumentosFilters>({});

  async function fetchDocumentos(page = 1, perPage = 15, newFilters: DocumentosFilters = {}) {
    loading.value = true;
    filters.value = newFilters;
    try {
      const response = await api.get<{
        data: { items: DocumentoResource[]; meta: RawPaginationMeta };
      }>('/documentos', {
        params: {
          page,
          per_page: perPage,
          ...(newFilters.descripcion ? { descripcion: newFilters.descripcion } : {}),
          ...(newFilters.tipoDocumentoId != null
            ? { tipo_documento_id: newFilters.tipoDocumentoId }
            : {}),
          ...(newFilters.categoriaId != null ? { categoria_id: newFilters.categoriaId } : {}),
          ...(newFilters.subcategoriaId != null
            ? { subcategoria_id: newFilters.subcategoriaId }
            : {}),
        },
      });
      items.value = response.data.data.items.map(mapDocumento);
      meta.value = mapMeta(response.data.data.meta);
    } finally {
      loading.value = false;
    }
  }

  async function refresh() {
    await fetchDocumentos(meta.value.currentPage, meta.value.perPage, filters.value);
  }

  // Multipart: los opcionales vacíos se omiten y los arrays vacíos no se envían.
  async function createDocumento(payload: DocumentoCreatePayload) {
    const formData = new FormData();
    formData.append('fichero', payload.fichero);
    formData.append('descripcion', payload.descripcion.trim());
    formData.append('tipo_documento_id', String(payload.tipoDocumentoId));
    if (payload.fechaCaducidad) formData.append('fecha_caducidad', payload.fechaCaducidad);
    payload.categorias.forEach((id) => formData.append('categorias[]', String(id)));
    payload.subcategorias.forEach((id) => formData.append('subcategorias[]', String(id)));
    await api.post('/documentos', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    await refresh();
  }

  // JSON: fecha vaciada = null; categorias/subcategorias siempre se envían. Sin `elems_inventario`.
  async function updateDocumento(id: number, payload: DocumentoUpdatePayload) {
    await api.put(`/documentos/${id}`, {
      descripcion: payload.descripcion.trim(),
      tipo_documento_id: payload.tipoDocumentoId,
      fecha_caducidad: payload.fechaCaducidad || null,
      categorias: payload.categorias,
      subcategorias: payload.subcategorias,
    });
    await refresh();
  }

  async function replaceFichero(id: number, fichero: File) {
    const formData = new FormData();
    formData.append('fichero', fichero);
    await api.post(`/documentos/${id}/fichero`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    await refresh();
  }

  async function downloadDocumento(documento: Pick<Documento, 'id' | 'nombreOriginal'>) {
    const response = await api.get<Blob>(`/documentos/${documento.id}/descarga`, {
      responseType: 'blob',
    });
    triggerDownload(response.data, documento.nombreOriginal);
  }

  async function deleteDocumento(id: number) {
    await api.delete(`/documentos/${id}`);
    await refresh();
  }

  return {
    items,
    meta,
    filters,
    loading,
    fetchDocumentos,
    createDocumento,
    updateDocumento,
    replaceFichero,
    downloadDocumento,
    deleteDocumento,
  };
});
