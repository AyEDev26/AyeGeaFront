import { defineStore } from 'pinia';
import { ref } from 'vue';
import { api } from '@/boot/axios';
import type { PaginationMeta } from '@/stores/users';

interface IdDescripcion {
  id: number;
  descripcion: string;
}

interface IdName {
  id: number;
  name: string;
}

export interface Mantenimiento {
  id: number;
  elemInventarioId: number;
  descripcion: string | null;
  fechaMantenimiento: string; // fecha prevista
  kmsMantenimiento: number | null;
  horasMantenimiento: number | null;
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

export interface MantenimientoForm {
  descripcion: string | null; // máx. 255
  fechaMantenimiento: string | null; // obligatoria
  kmsMantenimiento: number | null;
  horasMantenimiento: number | null;
  prioridadId: number | null;
  coste: number | null;
}

export interface MantenimientoRealizarForm {
  comentariosRealizacion: string | null; // máx. 255
  kmsMantenimiento: number | null;
  horasMantenimiento: number | null;
}

export interface MantenimientosFilters {
  elemInventarioId: number;
  estadoId?: number;
  prioridadId?: number;
  page?: number;
  perPage?: number;
}

export const MANTENIMIENTO_ESTADO = { PENDIENTE: 1, REALIZADA: 2, CANCELADA: 3 } as const;

// Forma cruda del MantenimientoResource del backend. `documento_id` y `documento` no se mapean.
interface MantenimientoResource {
  id: number;
  elem_inventario_id: number;
  descripcion: string | null;
  fecha_mantenimiento: string;
  kms_mantenimiento: number | string | null;
  horas_mantenimiento: number | string | null;
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

function toNumberOrNull(value: string | number | null | undefined): number | null {
  return value == null || value === '' ? null : Number(value);
}

function mapMantenimiento(m: MantenimientoResource): Mantenimiento {
  return {
    id: m.id,
    elemInventarioId: m.elem_inventario_id,
    descripcion: m.descripcion ?? null,
    fechaMantenimiento: m.fecha_mantenimiento,
    kmsMantenimiento: toNumberOrNull(m.kms_mantenimiento),
    horasMantenimiento: toNumberOrNull(m.horas_mantenimiento),
    prioridadId: m.prioridad_id ?? null,
    prioridad: m.prioridad ?? null,
    estadoId: m.estado_id,
    estado: m.estado,
    coste: toNumberOrNull(m.coste),
    fechaRealizacion: m.fecha_realizacion ?? null,
    usuarioRealizacion: m.usuario_realizacion ?? null,
    comentariosRealizacion: m.comentarios_realizacion ?? null,
    fechaCancelacion: m.fecha_cancelacion ?? null,
    usuarioCancelacion: m.usuario_cancelacion ?? null,
    motivoCancelacion: m.motivo_cancelacion ?? null,
    usuarioCreacion: m.usuario_creacion ?? null,
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
function toPayload(form: MantenimientoForm) {
  return {
    descripcion: form.descripcion?.trim() || null,
    fecha_mantenimiento: form.fechaMantenimiento,
    kms_mantenimiento: form.kmsMantenimiento,
    horas_mantenimiento: form.horasMantenimiento,
    prioridad_id: form.prioridadId,
    coste: form.coste,
  };
}

export const useMantenimientosStore = defineStore('mantenimientos', () => {
  const items = ref<Mantenimiento[]>([]);
  const meta = ref<PaginationMeta>({ currentPage: 1, lastPage: 1, perPage: 15, total: 0 });
  const loading = ref(false);

  async function fetchMantenimientos(filters: MantenimientosFilters) {
    loading.value = true;
    try {
      const response = await api.get<{
        data: { items: MantenimientoResource[]; meta: RawPaginationMeta };
      }>('/mantenimientos', {
        params: {
          elem_inventario_id: filters.elemInventarioId,
          page: filters.page ?? 1,
          per_page: filters.perPage ?? 15,
          ...(filters.estadoId != null ? { estado_id: filters.estadoId } : {}),
          ...(filters.prioridadId != null ? { prioridad_id: filters.prioridadId } : {}),
        },
      });
      items.value = response.data.data.items.map(mapMantenimiento);
      meta.value = mapMeta(response.data.data.meta);
    } finally {
      loading.value = false;
    }
  }

  async function createMantenimiento(elemInventarioId: number, form: MantenimientoForm) {
    await api.post('/mantenimientos', {
      elem_inventario_id: elemInventarioId,
      ...toPayload(form),
    });
  }

  async function updateMantenimiento(
    id: number,
    elemInventarioId: number,
    form: MantenimientoForm,
  ) {
    await api.put(`/mantenimientos/${id}`, {
      elem_inventario_id: elemInventarioId,
      ...toPayload(form),
    });
  }

  async function deleteMantenimiento(id: number) {
    await api.delete(`/mantenimientos/${id}`);
  }

  // Solo se envían los campos rellenados.
  async function realizarMantenimiento(id: number, form: MantenimientoRealizarForm) {
    const comentarios = form.comentariosRealizacion?.trim();
    await api.post(`/mantenimientos/${id}/realizar`, {
      ...(comentarios ? { comentarios_realizacion: comentarios } : {}),
      ...(form.kmsMantenimiento != null ? { kms_mantenimiento: form.kmsMantenimiento } : {}),
      ...(form.horasMantenimiento != null ? { horas_mantenimiento: form.horasMantenimiento } : {}),
    });
  }

  async function cancelarMantenimiento(id: number, motivoCancelacion: string) {
    await api.post(`/mantenimientos/${id}/cancelar`, {
      motivo_cancelacion: motivoCancelacion.trim(),
    });
  }

  return {
    items,
    meta,
    loading,
    fetchMantenimientos,
    createMantenimiento,
    updateMantenimiento,
    deleteMantenimiento,
    realizarMantenimiento,
    cancelarMantenimiento,
  };
});
