import { defineStore } from 'pinia';
import { ref } from 'vue';
import { api } from '@/boot/axios';
import type { PaginationMeta } from '@/stores/users';
import type { ElemInventarioRef } from '@/stores/revisiones';

interface IdDescripcion {
  id: number;
  descripcion: string;
}

interface IdName {
  id: number;
  name: string;
}

export interface Itv {
  id: number;
  elemInventarioId: number;
  elemInventario: ElemInventarioRef | null;
  fechaItv: string; // fecha prevista
  fechaProximaItv: string | null;
  resultado: string | null; // máx. 100
  observaciones: string | null; // máx. 255
  kmsItv: number | null;
  horasItv: number | null;
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

export interface ItvForm {
  fechaItv: string | null; // obligatoria
  fechaProximaItv: string | null;
  resultado: string | null; // máx. 100
  observaciones: string | null; // máx. 255
  kmsItv: number | null;
  horasItv: number | null;
  coste: number | null;
}

export interface ItvRealizarForm {
  comentariosRealizacion: string | null; // máx. 255
  resultado: string | null; // máx. 100
  fechaProximaItv: string | null;
  kmsItv: number | null;
  horasItv: number | null;
}

export interface ItvsFilters {
  elemInventarioId?: number;
  fechaHasta?: string; // YYYY-MM-DD
  estadoId?: number;
  page?: number;
  perPage?: number;
}

export const ITV_ESTADO = { PENDIENTE: 1, REALIZADA: 2, CANCELADA: 3 } as const;

// Forma cruda del ItvResource del backend. `documento_id` y `documento` no se mapean.
interface ItvResource {
  id: number;
  elem_inventario_id: number;
  elem_inventario?: ElemInventarioRef | null;
  fecha_itv: string;
  fecha_proxima_itv: string | null;
  resultado: string | null;
  observaciones: string | null;
  kms_itv: number | string | null;
  horas_itv: number | string | null;
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

function mapItv(i: ItvResource): Itv {
  return {
    id: i.id,
    elemInventarioId: i.elem_inventario_id,
    elemInventario: i.elem_inventario ?? null,
    fechaItv: i.fecha_itv,
    fechaProximaItv: i.fecha_proxima_itv ?? null,
    resultado: i.resultado ?? null,
    observaciones: i.observaciones ?? null,
    kmsItv: toNumberOrNull(i.kms_itv),
    horasItv: toNumberOrNull(i.horas_itv),
    estadoId: i.estado_id,
    estado: i.estado,
    coste: toNumberOrNull(i.coste),
    fechaRealizacion: i.fecha_realizacion ?? null,
    usuarioRealizacion: i.usuario_realizacion ?? null,
    comentariosRealizacion: i.comentarios_realizacion ?? null,
    fechaCancelacion: i.fecha_cancelacion ?? null,
    usuarioCancelacion: i.usuario_cancelacion ?? null,
    motivoCancelacion: i.motivo_cancelacion ?? null,
    usuarioCreacion: i.usuario_creacion ?? null,
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
function toPayload(form: ItvForm) {
  return {
    fecha_itv: form.fechaItv,
    fecha_proxima_itv: form.fechaProximaItv,
    resultado: form.resultado?.trim() || null,
    observaciones: form.observaciones?.trim() || null,
    kms_itv: form.kmsItv,
    horas_itv: form.horasItv,
    coste: form.coste,
  };
}

export const useItvsStore = defineStore('itvs', () => {
  const items = ref<Itv[]>([]);
  const meta = ref<PaginationMeta>({ currentPage: 1, lastPage: 1, perPage: 15, total: 0 });
  const loading = ref(false);

  async function fetchItvs(filters: ItvsFilters) {
    loading.value = true;
    try {
      const response = await api.get<{
        data: { items: ItvResource[]; meta: RawPaginationMeta };
      }>('/itvs', {
        params: {
          ...(filters.elemInventarioId != null
            ? { elem_inventario_id: filters.elemInventarioId }
            : {}),
          ...(filters.fechaHasta ? { fecha_hasta: filters.fechaHasta } : {}),
          page: filters.page ?? 1,
          per_page: filters.perPage ?? 15,
          ...(filters.estadoId != null ? { estado_id: filters.estadoId } : {}),
        },
      });
      items.value = response.data.data.items.map(mapItv);
      meta.value = mapMeta(response.data.data.meta);
    } finally {
      loading.value = false;
    }
  }

  async function createItv(elemInventarioId: number, form: ItvForm) {
    await api.post('/itvs', {
      elem_inventario_id: elemInventarioId,
      ...toPayload(form),
    });
  }

  async function updateItv(id: number, elemInventarioId: number, form: ItvForm) {
    await api.put(`/itvs/${id}`, {
      elem_inventario_id: elemInventarioId,
      ...toPayload(form),
    });
  }

  async function deleteItv(id: number) {
    await api.delete(`/itvs/${id}`);
  }

  // Solo se envían los campos rellenados.
  async function realizarItv(id: number, form: ItvRealizarForm) {
    const comentarios = form.comentariosRealizacion?.trim();
    const resultado = form.resultado?.trim();
    await api.post(`/itvs/${id}/realizar`, {
      ...(comentarios ? { comentarios_realizacion: comentarios } : {}),
      ...(resultado ? { resultado } : {}),
      ...(form.fechaProximaItv ? { fecha_proxima_itv: form.fechaProximaItv } : {}),
      ...(form.kmsItv != null ? { kms_itv: form.kmsItv } : {}),
      ...(form.horasItv != null ? { horas_itv: form.horasItv } : {}),
    });
  }

  async function cancelarItv(id: number, motivoCancelacion: string) {
    await api.post(`/itvs/${id}/cancelar`, {
      motivo_cancelacion: motivoCancelacion.trim(),
    });
  }

  return {
    items,
    meta,
    loading,
    fetchItvs,
    createItv,
    updateItv,
    deleteItv,
    realizarItv,
    cancelarItv,
  };
});
