import { defineStore } from 'pinia';
import { computed, ref } from 'vue';
import { useRevisionesStore, REVISION_ESTADO, type Revision } from '@/stores/revisiones';
import {
  useMantenimientosStore,
  MANTENIMIENTO_ESTADO,
  type Mantenimiento,
} from '@/stores/mantenimientos';
import { useItvsStore, ITV_ESTADO, type Itv } from '@/stores/itvs';

export type VencimientoTipo = 'revision' | 'mantenimiento' | 'itv';
export type VencimientoUrgencia = 'vencida' | 'inminente' | 'proxima';

export interface Vencimiento {
  tipo: VencimientoTipo;
  id: number; // id de la tarea en su recurso
  elemInventarioId: number;
  elemNombre: string;
  titulo: string; // revisión: nombre; mantenimiento: descripción; ITV: «ITV»
  fecha: string; // fecha prevista (fecha_revision | fecha_mantenimiento | fecha_itv)
  diasRestantes: number; // negativo si vencida; calculado con la fecha local de hoy
  urgencia: VencimientoUrgencia;
  prioridad: { id: number; descripcion: string } | null; // null en ITV
  raw: Revision | Mantenimiento | Itv; // para pasar a los diálogos existentes
}

// Umbrales por tipo, persistidos en localStorage
export interface UmbralesTipo {
  inminenteDias: number; // por defecto 15
  proximaDias: number; // por defecto 30; máx. 30
}
export type Umbrales = Record<VencimientoTipo, UmbralesTipo>;

export const VENCIMIENTOS_HORIZONTE_DIAS = 30;
export const VENCIMIENTOS_PER_PAGE = 100;
export const UMBRALES_STORAGE_KEY = 'vencimientos:umbrales:v1';

export const VENCIMIENTO_TIPOS: VencimientoTipo[] = ['revision', 'mantenimiento', 'itv'];

export function defaultUmbrales(): Umbrales {
  return {
    revision: { inminenteDias: 15, proximaDias: VENCIMIENTOS_HORIZONTE_DIAS },
    mantenimiento: { inminenteDias: 15, proximaDias: VENCIMIENTOS_HORIZONTE_DIAS },
    itv: { inminenteDias: 15, proximaDias: VENCIMIENTOS_HORIZONTE_DIAS },
  };
}

export interface VencimientosTruncado {
  tipo: VencimientoTipo;
  mostrados: number;
  total: number;
}

// ---- Utilidades de fecha (medianoche local, sin horas) ----

function pad(n: number): string {
  return String(n).padStart(2, '0');
}

export function toYmd(d: Date): string {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

function startOfToday(): Date {
  const now = new Date();
  return new Date(now.getFullYear(), now.getMonth(), now.getDate());
}

// La API puede devolver `YYYY-MM-DD` o un date-time ISO. Se toma solo la parte de fecha
// (sin convertir de zona horaria) para que el día no se desplace.
function parseLocalDate(value: string): Date {
  const [y, m, d] = value.slice(0, 10).split('-').map(Number);
  return new Date(y ?? 1970, (m ?? 1) - 1, d ?? 1);
}

export function diasHasta(fecha: string, hoy: Date = startOfToday()): number {
  const target = parseLocalDate(fecha);
  return Math.round((target.getTime() - hoy.getTime()) / 86_400_000);
}

export function clasificarUrgencia(
  diasRestantes: number,
  umbral: UmbralesTipo,
): VencimientoUrgencia | null {
  if (diasRestantes < 0) return 'vencida';
  if (diasRestantes > umbral.proximaDias) return null; // fuera del umbral: no se muestra
  return diasRestantes <= umbral.inminenteDias ? 'inminente' : 'proxima';
}

// ---- Umbrales en localStorage ----

function sanitizeTipo(raw: unknown, fallback: UmbralesTipo): UmbralesTipo {
  if (!raw || typeof raw !== 'object') return { ...fallback };
  const { inminenteDias, proximaDias } = raw as Partial<UmbralesTipo>;
  const ok =
    Number.isInteger(inminenteDias) &&
    Number.isInteger(proximaDias) &&
    (inminenteDias as number) >= 0 &&
    (proximaDias as number) <= VENCIMIENTOS_HORIZONTE_DIAS &&
    (proximaDias as number) >= (inminenteDias as number);
  return ok
    ? { inminenteDias: inminenteDias as number, proximaDias: proximaDias as number }
    : { ...fallback };
}

export function loadUmbrales(): Umbrales {
  const defaults = defaultUmbrales();
  try {
    const raw = localStorage.getItem(UMBRALES_STORAGE_KEY);
    if (!raw) return defaults;
    const parsed = JSON.parse(raw) as Partial<Record<VencimientoTipo, unknown>> | null;
    if (!parsed || typeof parsed !== 'object') return defaults;
    return {
      revision: sanitizeTipo(parsed.revision, defaults.revision),
      mantenimiento: sanitizeTipo(parsed.mantenimiento, defaults.mantenimiento),
      itv: sanitizeTipo(parsed.itv, defaults.itv),
    };
  } catch {
    return defaults;
  }
}

function saveUmbrales(value: Umbrales) {
  try {
    localStorage.setItem(UMBRALES_STORAGE_KEY, JSON.stringify(value));
  } catch {
    // localStorage bloqueado: los umbrales solo viven en memoria durante la sesión.
  }
}

// ---- Normalización ----

interface BaseTarea {
  tipo: VencimientoTipo;
  id: number;
  elemInventarioId: number;
  elemNombre: string;
  titulo: string;
  fecha: string;
  prioridad: { id: number; descripcion: string } | null;
  raw: Revision | Mantenimiento | Itv;
}

function elemNombreDe(elem: { nombre: string } | null, elemInventarioId: number): string {
  return elem?.nombre ?? `#${elemInventarioId}`;
}

export const useVencimientosStore = defineStore('vencimientos', () => {
  const revisionesStore = useRevisionesStore();
  const mantenimientosStore = useMantenimientosStore();
  const itvsStore = useItvsStore();

  const tareas = ref<BaseTarea[]>([]);
  const totales = ref<Record<VencimientoTipo, number>>({ revision: 0, mantenimiento: 0, itv: 0 });
  const umbrales = ref<Umbrales>(loadUmbrales());
  const loading = ref(false);
  const error = ref(false);
  const loaded = ref(false);

  // Clasificación derivada: cambiar un umbral reclasifica sin nueva petición.
  const items = computed<Vencimiento[]>(() => {
    const hoy = startOfToday();
    const result: Vencimiento[] = [];
    for (const t of tareas.value) {
      const diasRestantes = diasHasta(t.fecha, hoy);
      const urgencia = clasificarUrgencia(diasRestantes, umbrales.value[t.tipo]);
      if (urgencia) result.push({ ...t, diasRestantes, urgencia });
    }
    return result.sort(
      (a, b) => a.fecha.slice(0, 10).localeCompare(b.fecha.slice(0, 10)) || a.id - b.id,
    );
  });

  const truncados = computed<VencimientosTruncado[]>(() =>
    VENCIMIENTO_TIPOS.filter((tipo) => totales.value[tipo] > VENCIMIENTOS_PER_PAGE).map((tipo) => ({
      tipo,
      mostrados: VENCIMIENTOS_PER_PAGE,
      total: totales.value[tipo],
    })),
  );

  async function fetchVencimientos() {
    if (loading.value) return;
    loading.value = true;
    error.value = false;
    try {
      const hoy = startOfToday();
      const fechaHasta = toYmd(
        new Date(hoy.getFullYear(), hoy.getMonth(), hoy.getDate() + VENCIMIENTOS_HORIZONTE_DIAS),
      );

      // Se llaman los fetch de los stores existentes en paralelo; cada uno escribe en su propio
      // estado, así que se leen los resultados justo después de que todos terminen.
      await Promise.all([
        revisionesStore.fetchRevisiones({
          estadoId: REVISION_ESTADO.PENDIENTE,
          fechaHasta,
          perPage: VENCIMIENTOS_PER_PAGE,
        }),
        mantenimientosStore.fetchMantenimientos({
          estadoId: MANTENIMIENTO_ESTADO.PENDIENTE,
          fechaHasta,
          perPage: VENCIMIENTOS_PER_PAGE,
        }),
        itvsStore.fetchItvs({
          estadoId: ITV_ESTADO.PENDIENTE,
          fechaHasta,
          perPage: VENCIMIENTOS_PER_PAGE,
        }),
      ]);

      const merged: BaseTarea[] = [
        ...revisionesStore.items.map((r) => ({
          tipo: 'revision' as const,
          id: r.id,
          elemInventarioId: r.elemInventarioId,
          elemNombre: elemNombreDe(r.elemInventario, r.elemInventarioId),
          titulo: r.nombre ?? '',
          fecha: r.fechaRevision,
          prioridad: r.prioridad,
          raw: r,
        })),
        ...mantenimientosStore.items.map((m) => ({
          tipo: 'mantenimiento' as const,
          id: m.id,
          elemInventarioId: m.elemInventarioId,
          elemNombre: elemNombreDe(m.elemInventario, m.elemInventarioId),
          titulo: m.descripcion ?? '',
          fecha: m.fechaMantenimiento,
          prioridad: m.prioridad,
          raw: m,
        })),
        ...itvsStore.items.map((i) => ({
          tipo: 'itv' as const,
          id: i.id,
          elemInventarioId: i.elemInventarioId,
          elemNombre: elemNombreDe(i.elemInventario, i.elemInventarioId),
          titulo: 'ITV',
          fecha: i.fechaItv,
          prioridad: null,
          raw: i,
        })),
      ];

      tareas.value = merged;
      totales.value = {
        revision: revisionesStore.meta.total,
        mantenimiento: mantenimientosStore.meta.total,
        itv: itvsStore.meta.total,
      };
      loaded.value = true;
    } catch {
      error.value = true;
    } finally {
      loading.value = false;
    }
  }

  function setUmbrales(value: Umbrales) {
    umbrales.value = value;
    saveUmbrales(value);
  }

  return {
    items,
    totales,
    truncados,
    umbrales,
    loading,
    error,
    loaded,
    fetchVencimientos,
    setUmbrales,
  };
});
