import { defineStore } from 'pinia';
import { ref } from 'vue';
import { api } from '@/boot/axios';
import type { PaginationMeta } from '@/stores/users';

export type TipoElemInventarioId = 1 | 2 | 3;

interface NamedRef {
  id: number;
  nombre: string;
}

export interface ElemInventario {
  id: number;
  tipoElementoInventarioId: number;
  referencia: string | null;
  nombre: string;
  categoria: NamedRef | null;
  subcategoria: NamedRef | null;
  delegacion: NamedRef | null;
  ubicacion: NamedRef | null;
  estadoId: 0 | 1;
  estado: { id: number; descripcion: string } | null;
  vehiculo?: {
    matricula: string | null;
    marca: string | null;
    modelo: string | null;
    proximaRevision: string | null;
  };
  maquinaria?: { marca: string | null; modelo: string | null; proximaRevision: string | null };
  epi?: { stockMinimo: number | null };
}

export interface ElemsInventarioFilters {
  nombre?: string;
  referencia?: string;
  nSerie?: string;
  estadoId?: 0 | 1 | null;
  categoriaId?: number | null;
  subcategoriaId?: number | null;
  delegacionId?: number | null;
  ubicacionId?: number | null;
  departamentoId?: number | null;
  proveedorId?: number | null;
  matricula?: string; // solo tipo 1
}

// Estado del formulario (camelCase); se mapea a snake_case al enviar.
export interface ElemInventarioVehiculoForm {
  matricula: string | null;
  marca: string | null;
  modelo: string | null;
  fechaCompra: string | null;
  ultimaRevision: string | null;
  proximaRevision: string | null;
  estadoRevisionId: number | null;
  renting: boolean;
  precio: number | null;
  kmsActuales: number | null;
  horasActuales: number | null;
  responsableId: number | null;
  vehiculoEspecial: boolean;
  tipoFuncionamientoId: number | null;
  critico: boolean;
}

export interface ElemInventarioMaquinariaForm {
  marca: string | null;
  modelo: string | null;
  fechaCompra: string | null;
  ultimaRevision: string | null;
  proximaRevision: string | null;
  estadoRevisionId: number | null;
  codInversion: string | null;
  precio: number | null;
  responsableId: number | null;
  vehiculoId: number | null;
  periodicidadId: number | null;
  critico: boolean;
}

export interface ElemInventarioForm {
  nombre: string;
  descripcion: string | null;
  referencia: string | null;
  categoriaId: number | null;
  subcategoriaId: number | null;
  estadoId: 0 | 1;
  fechaAlta: string | null;
  fechaBaja: string | null;
  motivoBaja: string | null;
  delegacionId: number | null;
  ubicacionId: number | null;
  departamentoId: number | null;
  localizacion: string | null;
  comentario: string | null;
  proveedorId: number | null;
  nSerie: string | null;
  vehiculo?: ElemInventarioVehiculoForm;
  maquinaria?: ElemInventarioMaquinariaForm;
  epi?: { stockMinimo: number | null };
}

// Resultado de GET /elems-inventario/{id}: el formulario más los datos que no se editan en él.
export interface ElemInventarioDetail {
  id: number;
  tipoElementoInventarioId: number;
  imagenUrl: string | null;
  form: ElemInventarioForm;
}

// Opción del select de vehículo en el formulario de maquinaria.
export interface VehiculoOption {
  id: number;
  referencia: string | null;
  matricula: string | null;
  nombre: string;
}

// Resultado de buscar un elemento por referencia exacta (ver findElemByReferencia).
export interface ElemReferenciaMatch {
  id: number;
  tipoId: TipoElemInventarioId;
}

// Forma cruda del ElemInventarioResource del backend (ver GET /api/documentation).
interface ElemInventarioResource {
  id: number;
  tipo_elemento_inventario_id: number;
  referencia?: string | null;
  nombre: string;
  categoria?: NamedRef | null;
  subcategoria?: NamedRef | null;
  delegacion?: NamedRef | null;
  ubicacion?: NamedRef | null;
  estado_id: number;
  estado?: { id: number; descripcion: string } | null;
  vehiculo?: {
    matricula?: string | null;
    marca?: string | null;
    modelo?: string | null;
    proxima_revision?: string | null;
  } | null;
  maquinaria?: {
    marca?: string | null;
    modelo?: string | null;
    proxima_revision?: string | null;
  } | null;
  epi?: { stock_minimo?: number | null } | null;
}

// Campos adicionales que devuelve GET /elems-inventario/{id} (detalle completo).
interface ElemInventarioDetailResource extends ElemInventarioResource {
  descripcion?: string | null;
  categoria_id?: number | null;
  subcategoria_id?: number | null;
  fecha_alta?: string | null;
  fecha_baja?: string | null;
  motivo_baja?: string | null;
  delegacion_id?: number | null;
  ubicacion_id?: number | null;
  departamento_id?: number | null;
  localizacion?: string | null;
  imagenUrl?: string | null;
  comentario?: string | null;
  proveedor_id?: number | null;
  n_serie?: string | null;
  vehiculo?: {
    matricula?: string | null;
    marca?: string | null;
    modelo?: string | null;
    fecha_compra?: string | null;
    ultima_revision?: string | null;
    proxima_revision?: string | null;
    estado_revision_id?: number | null;
    renting?: boolean | null;
    precio?: string | number | null;
    kms_actuales?: number | null;
    horas_actuales?: number | null;
    responsable_id?: number | null;
    vehiculo_especial?: boolean | null;
    tipo_funcionamiento_id?: number | null;
    critico?: boolean | null;
  } | null;
  maquinaria?: {
    marca?: string | null;
    modelo?: string | null;
    fecha_compra?: string | null;
    ultima_revision?: string | null;
    proxima_revision?: string | null;
    estado_revision_id?: number | null;
    cod_inversion?: string | null;
    precio?: string | number | null;
    responsable_id?: number | null;
    vehiculo_id?: number | null;
    periodicidad_id?: number | null;
    critico?: boolean | null;
  } | null;
}

interface RawPaginationMeta {
  current_page: number;
  last_page: number;
  per_page: number;
  total: number;
}

function mapNamed(ref: NamedRef | null | undefined): NamedRef | null {
  return ref ? { id: ref.id, nombre: ref.nombre } : null;
}

function mapElem(resource: ElemInventarioResource): ElemInventario {
  const elem: ElemInventario = {
    id: resource.id,
    tipoElementoInventarioId: resource.tipo_elemento_inventario_id,
    referencia: resource.referencia ?? null,
    nombre: resource.nombre,
    categoria: mapNamed(resource.categoria),
    subcategoria: mapNamed(resource.subcategoria),
    delegacion: mapNamed(resource.delegacion),
    ubicacion: mapNamed(resource.ubicacion),
    estadoId: resource.estado_id === 1 ? 1 : 0,
    estado: resource.estado
      ? { id: resource.estado.id, descripcion: resource.estado.descripcion }
      : null,
  };
  if (resource.vehiculo) {
    elem.vehiculo = {
      matricula: resource.vehiculo.matricula ?? null,
      marca: resource.vehiculo.marca ?? null,
      modelo: resource.vehiculo.modelo ?? null,
      proximaRevision: resource.vehiculo.proxima_revision ?? null,
    };
  }
  if (resource.maquinaria) {
    elem.maquinaria = {
      marca: resource.maquinaria.marca ?? null,
      modelo: resource.maquinaria.modelo ?? null,
      proximaRevision: resource.maquinaria.proxima_revision ?? null,
    };
  }
  if (resource.epi) {
    elem.epi = { stockMinimo: resource.epi.stock_minimo ?? null };
  }
  return elem;
}

function mapMeta(meta: RawPaginationMeta): PaginationMeta {
  return {
    currentPage: meta.current_page,
    lastPage: meta.last_page,
    perPage: meta.per_page,
    total: meta.total,
  };
}

// La API devuelve las fechas de bloque como date y las de alta/baja como date-time;
// el formulario trabaja con YYYY-MM-DD.
function toDate(value: string | null | undefined): string | null {
  return value ? value.slice(0, 10) : null;
}

function toNumber(value: string | number | null | undefined): number | null {
  if (value === null || value === undefined || value === '') return null;
  const n = Number(value);
  return Number.isNaN(n) ? null : n;
}

function mapDetail(resource: ElemInventarioDetailResource): ElemInventarioDetail {
  const form: ElemInventarioForm = {
    nombre: resource.nombre,
    descripcion: resource.descripcion ?? null,
    referencia: resource.referencia ?? null,
    categoriaId: resource.categoria_id ?? resource.categoria?.id ?? null,
    subcategoriaId: resource.subcategoria_id ?? resource.subcategoria?.id ?? null,
    estadoId: resource.estado_id === 1 ? 1 : 0,
    fechaAlta: toDate(resource.fecha_alta),
    fechaBaja: toDate(resource.fecha_baja),
    motivoBaja: resource.motivo_baja ?? null,
    delegacionId: resource.delegacion_id ?? resource.delegacion?.id ?? null,
    ubicacionId: resource.ubicacion_id ?? resource.ubicacion?.id ?? null,
    departamentoId: resource.departamento_id ?? null,
    localizacion: resource.localizacion ?? null,
    comentario: resource.comentario ?? null,
    proveedorId: resource.proveedor_id ?? null,
    nSerie: resource.n_serie ?? null,
  };
  const v = resource.vehiculo;
  if (v) {
    form.vehiculo = {
      matricula: v.matricula ?? null,
      marca: v.marca ?? null,
      modelo: v.modelo ?? null,
      fechaCompra: toDate(v.fecha_compra),
      ultimaRevision: toDate(v.ultima_revision),
      proximaRevision: toDate(v.proxima_revision),
      estadoRevisionId: v.estado_revision_id ?? null,
      renting: v.renting ?? false,
      precio: toNumber(v.precio),
      kmsActuales: v.kms_actuales ?? null,
      horasActuales: v.horas_actuales ?? null,
      responsableId: v.responsable_id ?? null,
      vehiculoEspecial: v.vehiculo_especial ?? false,
      tipoFuncionamientoId: v.tipo_funcionamiento_id ?? null,
      critico: v.critico ?? false,
    };
  }
  const m = resource.maquinaria;
  if (m) {
    form.maquinaria = {
      marca: m.marca ?? null,
      modelo: m.modelo ?? null,
      fechaCompra: toDate(m.fecha_compra),
      ultimaRevision: toDate(m.ultima_revision),
      proximaRevision: toDate(m.proxima_revision),
      estadoRevisionId: m.estado_revision_id ?? null,
      codInversion: m.cod_inversion ?? null,
      precio: toNumber(m.precio),
      responsableId: m.responsable_id ?? null,
      vehiculoId: m.vehiculo_id ?? null,
      periodicidadId: m.periodicidad_id ?? null,
      critico: m.critico ?? false,
    };
  }
  if (resource.epi) {
    form.epi = { stockMinimo: resource.epi.stock_minimo ?? null };
  }
  return {
    id: resource.id,
    tipoElementoInventarioId: resource.tipo_elemento_inventario_id,
    imagenUrl: resource.imagenUrl ?? null,
    form,
  };
}

// Los textos vacíos se envían como null.
function nullIfBlank(value: string | null | undefined): string | null {
  const trimmed = value?.trim();
  return trimmed ? trimmed : null;
}

function buildBlockPayload(tipoId: TipoElemInventarioId, form: ElemInventarioForm) {
  if (tipoId === 1 && form.vehiculo) {
    const v = form.vehiculo;
    return {
      vehiculo: {
        matricula: nullIfBlank(v.matricula),
        marca: nullIfBlank(v.marca),
        modelo: nullIfBlank(v.modelo),
        fecha_compra: v.fechaCompra || null,
        ultima_revision: v.ultimaRevision || null,
        proxima_revision: v.proximaRevision || null,
        estado_revision_id: v.estadoRevisionId,
        renting: v.renting,
        precio: v.precio,
        kms_actuales: v.kmsActuales,
        horas_actuales: v.horasActuales,
        responsable_id: v.responsableId,
        vehiculo_especial: v.vehiculoEspecial,
        tipo_funcionamiento_id: v.tipoFuncionamientoId,
        critico: v.critico,
      },
    };
  }
  if (tipoId === 2 && form.maquinaria) {
    const m = form.maquinaria;
    return {
      maquinaria: {
        marca: nullIfBlank(m.marca),
        modelo: nullIfBlank(m.modelo),
        fecha_compra: m.fechaCompra || null,
        ultima_revision: m.ultimaRevision || null,
        proxima_revision: m.proximaRevision || null,
        estado_revision_id: m.estadoRevisionId,
        cod_inversion: nullIfBlank(m.codInversion),
        precio: m.precio,
        responsable_id: m.responsableId,
        en_vehiculo: m.vehiculoId !== null,
        vehiculo_id: m.vehiculoId,
        periodicidad_id: m.periodicidadId,
        critico: m.critico,
      },
    };
  }
  if (tipoId === 3 && form.epi) {
    return { epi: { stock_minimo: form.epi.stockMinimo } };
  }
  return {};
}

function buildPayload(tipoId: TipoElemInventarioId, form: ElemInventarioForm) {
  return {
    nombre: form.nombre.trim(),
    descripcion: nullIfBlank(form.descripcion),
    referencia: nullIfBlank(form.referencia),
    categoria_id: form.categoriaId,
    subcategoria_id: form.subcategoriaId,
    estado_id: form.estadoId,
    fecha_alta: form.fechaAlta || null,
    fecha_baja: form.fechaBaja || null,
    motivo_baja: nullIfBlank(form.motivoBaja),
    delegacion_id: form.delegacionId,
    ubicacion_id: form.ubicacionId,
    departamento_id: form.departamentoId,
    localizacion: nullIfBlank(form.localizacion),
    comentario: nullIfBlank(form.comentario),
    proveedor_id: form.proveedorId,
    n_serie: nullIfBlank(form.nSerie),
    ...buildBlockPayload(tipoId, form),
  };
}

// Los filtros vacíos no se envían; estado_id = 0 sí.
function buildFilterParams(tipoId: TipoElemInventarioId, f: ElemsInventarioFilters) {
  const params: Record<string, string | number> = {};
  if (f.nombre) params.nombre = f.nombre;
  if (f.referencia) params.referencia = f.referencia;
  if (f.nSerie) params.n_serie = f.nSerie;
  if (f.estadoId !== undefined && f.estadoId !== null) params.estado_id = f.estadoId;
  if (f.categoriaId) params.categoria_id = f.categoriaId;
  if (f.subcategoriaId) params.subcategoria_id = f.subcategoriaId;
  if (f.delegacionId) params.delegacion_id = f.delegacionId;
  if (f.ubicacionId) params.ubicacion_id = f.ubicacionId;
  if (f.departamentoId) params.departamento_id = f.departamentoId;
  if (f.proveedorId) params.proveedor_id = f.proveedorId;
  if (tipoId === 1 && f.matricula) params.matricula = f.matricula;
  return params;
}

interface TipoState {
  items: ElemInventario[];
  meta: PaginationMeta;
  loading: boolean;
  filters: ElemsInventarioFilters;
}

function createTipoState(): TipoState {
  return {
    items: [],
    meta: { currentPage: 1, lastPage: 1, perPage: 15, total: 0 },
    loading: false,
    filters: {},
  };
}

export const useElemsInventarioStore = defineStore('elemsInventario', () => {
  // Estado independiente por tipo: cada pantalla conserva su página, filtros y filas por página.
  const byTipo = ref<Record<TipoElemInventarioId, TipoState>>({
    1: createTipoState(),
    2: createTipoState(),
    3: createTipoState(),
  });

  async function fetchElems(
    tipoId: TipoElemInventarioId,
    page = 1,
    perPage = 15,
    newFilters: ElemsInventarioFilters = {},
  ) {
    const state = byTipo.value[tipoId];
    state.loading = true;
    state.filters = newFilters;
    try {
      const response = await api.get<{
        data: { items: ElemInventarioResource[]; meta: RawPaginationMeta };
      }>('/elems-inventario', {
        params: {
          tipo_elemento_inventario_id: tipoId,
          page,
          per_page: perPage,
          ...buildFilterParams(tipoId, newFilters),
        },
      });
      state.items = response.data.data.items.map(mapElem);
      state.meta = mapMeta(response.data.data.meta);
    } finally {
      state.loading = false;
    }
  }

  // El listado del tipo se recarga al montarse: basta con descartar el estado en caché.
  function invalidateTipo(tipoId: TipoElemInventarioId) {
    byTipo.value[tipoId] = createTipoState();
  }

  async function fetchElem(id: number): Promise<ElemInventarioDetail> {
    const response = await api.get<{ data: ElemInventarioDetailResource }>(
      `/elems-inventario/${id}`,
    );
    return mapDetail(response.data.data);
  }

  // Devuelve el id del elemento creado (necesario para subir la imagen después).
  async function createElem(tipoId: TipoElemInventarioId, form: ElemInventarioForm) {
    const response = await api.post<{ data: { id: number } }>('/elems-inventario', {
      tipo_elemento_inventario_id: tipoId,
      ...buildPayload(tipoId, form),
    });
    invalidateTipo(tipoId);
    return response.data.data.id;
  }

  // El tipo no se puede cambiar: no se envía tipo_elemento_inventario_id.
  async function updateElem(id: number, tipoId: TipoElemInventarioId, form: ElemInventarioForm) {
    await api.put(`/elems-inventario/${id}`, buildPayload(tipoId, form));
    invalidateTipo(tipoId);
  }

  async function deleteElem(id: number, tipoId: TipoElemInventarioId) {
    await api.delete(`/elems-inventario/${id}`);
    invalidateTipo(tipoId);
  }

  // Devuelve la nueva imagenUrl.
  async function uploadImagen(id: number, tipoId: TipoElemInventarioId, file: File) {
    const formData = new FormData();
    formData.append('imagen', file);
    const response = await api.post<{ data: { imagenUrl?: string | null } }>(
      `/elems-inventario/${id}/imagen`,
      formData,
      { headers: { 'Content-Type': 'multipart/form-data' } },
    );
    invalidateTipo(tipoId);
    return response.data.data.imagenUrl ?? null;
  }

  // Todos los vehículos (tipo 1) recorriendo las páginas (per_page=100), sin tocar byTipo.
  async function fetchAllVehiculos(): Promise<VehiculoOption[]> {
    const fetchPage = async (page: number) => {
      const response = await api.get<{
        data: { items: ElemInventarioResource[]; meta: RawPaginationMeta };
      }>('/elems-inventario', {
        params: { tipo_elemento_inventario_id: 1, page, per_page: 100 },
      });
      return response.data.data;
    };
    const first = await fetchPage(1);
    const rest = await Promise.all(
      Array.from({ length: Math.max(first.meta.last_page - 1, 0) }, (_, i) => fetchPage(i + 2)),
    );
    return [first, ...rest].flatMap((page) =>
      page.items.map((r) => ({
        id: r.id,
        referencia: r.referencia ?? null,
        matricula: r.vehiculo?.matricula ?? null,
        nombre: r.nombre,
      })),
    );
  }

  // Busca por referencia exacta (sin distinguir mayúsculas) en los 3 tipos, sin tocar byTipo.
  // El filtro de la API puede ser parcial: la igualdad exacta se comprueba en cliente.
  // Si alguna petición falla se propaga el error y no se devuelve ningún resultado.
  async function findElemByReferencia(referencia: string): Promise<ElemReferenciaMatch | null> {
    const wanted = referencia.trim().toLowerCase();
    const tipos: TipoElemInventarioId[] = [1, 2, 3];
    const results = await Promise.all(
      tipos.map((tipoId) =>
        api.get<{ data: { items: ElemInventarioResource[] } }>('/elems-inventario', {
          params: {
            tipo_elemento_inventario_id: tipoId,
            per_page: 100,
            ...buildFilterParams(tipoId, { referencia: referencia.trim() }),
          },
        }),
      ),
    );
    for (const [i, response] of results.entries()) {
      const match = response.data.data.items
        .map(mapElem)
        .find((elem) => elem.referencia?.trim().toLowerCase() === wanted);
      if (match) return { id: match.id, tipoId: tipos[i]! };
    }
    return null;
  }

  return {
    byTipo,
    fetchElems,
    invalidateTipo,
    fetchElem,
    createElem,
    updateElem,
    deleteElem,
    uploadImagen,
    fetchAllVehiculos,
    findElemByReferencia,
  };
});
