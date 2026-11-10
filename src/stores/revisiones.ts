import { defineStore } from 'pinia';
import { ref } from 'vue';
import { api } from '@/boot/axios';
import type { PaginationMeta } from '@/stores/users';

interface IdDescripcion {
  id: number;
  descripcion: string;
}

export interface ElemInventarioRef {
  id: number;
  nombre: string;
}

interface IdName {
  id: number;
  name: string;
}

export interface Revision {
  id: number;
  elemInventarioId: number;
  elemInventario: ElemInventarioRef | null;
  nombre: string | null;
  fechaRevision: string; // fecha prevista
  fechaProximaRevision: string | null;
  prioridadId: number | null;
  prioridad: IdDescripcion | null;
  estadoId: number; // 1 Pendiente, 2 Realizada, 3 Cancelada
  estado: IdDescripcion;
  coste: number | null;
  fechaRealizacion: string | null;
  usuarioRealizacion: IdName | null;
  comentariosRealizacion: string | null;
  fechaCancelacion: string | null;
  usuarioCancelacion: IdName | null;
  motivoCancelacion: string | null;
  usuarioCreacion: IdName | null;
}

export interface RevisionForm {
  nombre: string | null; // máx. 50
  fechaRevision: string | null; // obligatoria
  fechaProximaRevision: string | null;
  prioridadId: number | null;
  coste: number | null;
}

export interface RevisionesFilters {
  elemInventarioId?: number;
  fechaHasta?: string; // YYYY-MM-DD
  estadoId?: number;
  prioridadId?: number;
  page?: number;
  perPage?: number;
}

export interface RevisionRealizarPayload {
  comentariosRealizacion?: string | null;
  fechaProximaRevision?: string | null;
}

export const REVISION_ESTADO = { PENDIENTE: 1, REALIZADA: 2, CANCELADA: 3 } as const;

// Forma cruda del RevisionResource del backend. `documento_id` y `documento` no se mapean.
interface RevisionResource {
  id: number;
  elem_inventario_id: number;
  elem_inventario?: ElemInventarioRef | null;
  nombre: string | null;
  fecha_revision: string;
  fecha_proxima_revision: string | null;
  prioridad_id: number | null;
  prioridad: IdDescripcion | null;
  estado_id: number;
  estado: IdDescripcion;
  coste: string | number | null;
  fecha_realizacion: string | null;
  usuario_realizacion: IdName | null;
  comentarios_realizacion: string | null;
  fecha_cancelacion: string | null;
  usuario_cancelacion: IdName | null;
  motivo_cancelacion: string | null;
  usuario_creacion: IdName | null;
}

interface RawPaginationMeta {
  current_page: number;
  last_page: number;
  per_page: number;
  total: number;
}

function mapRevision(r: RevisionResource): Revision {
  return {
    id: r.id,
    elemInventarioId: r.elem_inventario_id,
    elemInventario: r.elem_inventario ?? null,
    nombre: r.nombre ?? null,
    fechaRevision: r.fecha_revision,
    fechaProximaRevision: r.fecha_proxima_revision ?? null,
    prioridadId: r.prioridad_id ?? null,
    prioridad: r.prioridad ?? null,
    estadoId: r.estado_id,
    estado: r.estado,
    coste: r.coste == null || r.coste === '' ? null : Number(r.coste),
    fechaRealizacion: r.fecha_realizacion ?? null,
    usuarioRealizacion: r.usuario_realizacion ?? null,
    comentariosRealizacion: r.comentarios_realizacion ?? null,
    fechaCancelacion: r.fecha_cancelacion ?? null,
    usuarioCancelacion: r.usuario_cancelacion ?? null,
    motivoCancelacion: r.motivo_cancelacion ?? null,
    usuarioCreacion: r.usuario_creacion ?? null,
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

// Sin `documento_id` ni `estado_id`: el estado solo cambia con /realizar y /cancelar.
function toPayload(form: RevisionForm) {
  return {
    nombre: form.nombre?.trim() || null,
    fecha_revision: form.fechaRevision,
    fecha_proxima_revision: form.fechaProximaRevision || null,
    prioridad_id: form.prioridadId,
    coste: form.coste,
  };
}

export const useRevisionesStore = defineStore('revisiones', () => {
  const items = ref<Revision[]>([]);
  const meta = ref<PaginationMeta>({ currentPage: 1, lastPage: 1, perPage: 15, total: 0 });
  const loading = ref(false);

  async function fetchRevisiones(filters: RevisionesFilters) {
    loading.value = true;
    try {
      const response = await api.get<{
        data: { items: RevisionResource[]; meta: RawPaginationMeta };
      }>('/revisiones', {
        params: {
          ...(filters.elemInventarioId != null
            ? { elem_inventario_id: filters.elemInventarioId }
            : {}),
          ...(filters.fechaHasta ? { fecha_hasta: filters.fechaHasta } : {}),
          page: filters.page ?? 1,
          per_page: filters.perPage ?? 15,
          ...(filters.estadoId != null ? { estado_id: filters.estadoId } : {}),
          ...(filters.prioridadId != null ? { prioridad_id: filters.prioridadId } : {}),
        },
      });
      items.value = response.data.data.items.map(mapRevision);
      meta.value = mapMeta(response.data.data.meta);
    } finally {
      loading.value = false;
    }
  }

  async function createRevision(elemInventarioId: number, form: RevisionForm) {
    await api.post('/revisiones', {
      elem_inventario_id: elemInventarioId,
      ...toPayload(form),
    });
  }

  async function updateRevision(id: number, elemInventarioId: number, form: RevisionForm) {
    await api.put(`/revisiones/${id}`, {
      elem_inventario_id: elemInventarioId,
      ...toPayload(form),
    });
  }

  async function deleteRevision(id: number) {
    await api.delete(`/revisiones/${id}`);
  }

  // Los opcionales vacíos no se envían.
  async function realizarRevision(id: number, payload: RevisionRealizarPayload = {}) {
    const comentarios = payload.comentariosRealizacion?.trim();
    await api.post(`/revisiones/${id}/realizar`, {
      ...(comentarios ? { comentarios_realizacion: comentarios } : {}),
      ...(payload.fechaProximaRevision
        ? { fecha_proxima_revision: payload.fechaProximaRevision }
        : {}),
    });
  }

  async function cancelarRevision(id: number, motivoCancelacion: string) {
    await api.post(`/revisiones/${id}/cancelar`, {
      motivo_cancelacion: motivoCancelacion.trim(),
    });
  }

  return {
    items,
    meta,
    loading,
    fetchRevisiones,
    createRevision,
    updateRevision,
    deleteRevision,
    realizarRevision,
    cancelarRevision,
  };
});
