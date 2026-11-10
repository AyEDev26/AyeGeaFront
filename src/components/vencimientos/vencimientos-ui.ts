import { useI18n } from 'vue-i18n';
import type { Vencimiento, VencimientoTipo, VencimientoUrgencia } from '@/stores/vencimientos';

export const URGENCIAS: VencimientoUrgencia[] = ['vencida', 'inminente', 'proxima'];

// Color + icono + texto: el estado no depende solo del color.
export const URGENCIA_META: Record<
  VencimientoUrgencia,
  { icon: string; color: string; chipBg: string; chipText: string }
> = {
  vencida: { icon: 'error', color: 'red-8', chipBg: 'red-1', chipText: 'red-10' },
  inminente: { icon: 'schedule', color: 'amber-9', chipBg: 'amber-1', chipText: 'amber-10' },
  proxima: { icon: 'event', color: 'blue-7', chipBg: 'blue-1', chipText: 'blue-10' },
};

export const TIPO_ICON: Record<VencimientoTipo, string> = {
  revision: 'fact_check',
  mantenimiento: 'build',
  itv: 'directions_car',
};

export function rowKey(v: Vencimiento): string {
  return `${v.tipo}-${v.id}`;
}

// La API puede devolver `YYYY-MM-DD` o un date-time ISO: se usa solo la parte de fecha.
export function ymdOf(value: string): string {
  return value.slice(0, 10);
}

export function useVencimientoFormat() {
  const { t, locale } = useI18n();

  function formatDate(value: string): string {
    const [y, m, d] = ymdOf(value).split('-').map(Number);
    const date = new Date(y ?? 1970, (m ?? 1) - 1, d ?? 1);
    return Number.isNaN(date.getTime()) ? value : date.toLocaleDateString(locale.value);
  }

  function relativeText(dias: number): string {
    if (dias === 0) return t('vencimientos.relative.hoy');
    if (dias < 0) return t('vencimientos.relative.vencida', { n: -dias }, -dias);
    return t('vencimientos.relative.futuro', { n: dias }, dias);
  }

  return { formatDate, relativeText };
}
