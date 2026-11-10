<template>
  <div>
    <div class="row items-center justify-between q-mb-sm">
      <div class="row items-center q-gutter-x-xs">
        <q-btn
          flat
          round
          dense
          icon="chevron_left"
          :aria-label="t('vencimientos.calendar.prev')"
          @click="shiftMonth(-1)"
        />
        <q-btn
          flat
          round
          dense
          icon="chevron_right"
          :aria-label="t('vencimientos.calendar.next')"
          @click="shiftMonth(1)"
        />
        <q-btn
          flat
          dense
          no-caps
          color="primary"
          :label="t('vencimientos.calendar.today')"
          @click="goToday"
        />
      </div>
      <div class="text-subtitle1 text-weight-bold font-outfit" aria-live="polite">
        {{ monthLabel }}
      </div>
    </div>

    <div class="cal-grid cal-head text-caption text-blue-grey-7 text-center">
      <div v-for="w in weekdays" :key="w" class="text-capitalize">{{ w }}</div>
    </div>
    <div class="cal-grid">
      <button
        v-for="cell in cells"
        :key="cell.ymd"
        type="button"
        class="cal-cell"
        :class="{
          'cal-cell--outside': !cell.inMonth,
          'cal-cell--today': cell.isToday,
          'cal-cell--selected': selected === cell.ymd,
        }"
        :aria-label="cellLabel(cell)"
        :aria-pressed="selected === cell.ymd"
        @click="selected = selected === cell.ymd ? null : cell.ymd"
      >
        <span class="cal-day">{{ cell.day }}</span>
        <span v-if="cell.items.length" class="cal-marks">
          <span
            v-for="v in cell.items.slice(0, MAX_MARKS)"
            :key="rowKey(v)"
            class="cal-mark"
            :class="`text-${URGENCIA_META[v.urgencia].color}`"
          >
            <q-icon :name="URGENCIA_META[v.urgencia].icon" size="12px" />
            <q-icon :name="TIPO_ICON[v.tipo]" size="12px" class="text-blue-grey-8" />
          </span>
          <span v-if="cell.items.length > MAX_MARKS" class="text-caption text-blue-grey-8">
            +{{ cell.items.length - MAX_MARKS }}
          </span>
        </span>
      </button>
    </div>

    <div class="q-mt-md">
      <div v-if="!selected" class="text-body2 text-blue-grey-6">
        {{ t('vencimientos.calendar.selectDay') }}
      </div>
      <template v-else>
        <div class="text-subtitle2 text-weight-bold q-mb-sm">
          {{ selectedLabel }}
        </div>
        <div v-if="!selectedItems.length" class="text-body2 text-blue-grey-6">
          {{ t('vencimientos.calendar.noTasks') }}
        </div>
        <q-list v-else bordered separator class="rounded-borders bg-white">
          <VencimientoItem
            v-for="v in selectedItems"
            :key="rowKey(v)"
            :v="v"
            :can-edit="canEdit"
            :can-open-detail="canOpenDetail"
            :detail-loading="detailLoadingKey === rowKey(v)"
            @realizar="emit('realizar', $event)"
            @cancelar="emit('cancelar', $event)"
            @detalle="emit('detalle', $event)"
          />
        </q-list>
      </template>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue';
import { useI18n } from 'vue-i18n';
import { toYmd, type Vencimiento } from '@/stores/vencimientos';
import VencimientoItem from './VencimientoItem.vue';
import { rowKey, TIPO_ICON, URGENCIA_META, ymdOf } from './vencimientos-ui';

const props = defineProps<{
  items: Vencimiento[];
  canEdit: boolean;
  canOpenDetail: boolean;
  detailLoadingKey: string | null;
}>();

const emit = defineEmits<{
  realizar: [v: Vencimiento];
  cancelar: [v: Vencimiento];
  detalle: [v: Vencimiento];
}>();

const { t, locale } = useI18n();

const MAX_MARKS = 2;

const today = new Date();
const viewYear = ref(today.getFullYear());
const viewMonth = ref(today.getMonth());
const selected = ref<string | null>(null);

function shiftMonth(delta: number) {
  const d = new Date(viewYear.value, viewMonth.value + delta, 1);
  viewYear.value = d.getFullYear();
  viewMonth.value = d.getMonth();
}

function goToday() {
  const now = new Date();
  viewYear.value = now.getFullYear();
  viewMonth.value = now.getMonth();
  selected.value = toYmd(now);
}

const byDay = computed(() => {
  const map = new Map<string, Vencimiento[]>();
  for (const v of props.items) {
    const key = ymdOf(v.fecha);
    const list = map.get(key);
    if (list) list.push(v);
    else map.set(key, [v]);
  }
  return map;
});

interface Cell {
  ymd: string;
  day: number;
  inMonth: boolean;
  isToday: boolean;
  items: Vencimiento[];
}

// Rejilla fija de 6 semanas que empieza en lunes.
const cells = computed<Cell[]>(() => {
  const first = new Date(viewYear.value, viewMonth.value, 1);
  const offset = (first.getDay() + 6) % 7;
  const todayYmd = toYmd(new Date());
  return Array.from({ length: 42 }, (_, i) => {
    const d = new Date(viewYear.value, viewMonth.value, 1 - offset + i);
    const ymd = toYmd(d);
    return {
      ymd,
      day: d.getDate(),
      inMonth: d.getMonth() === viewMonth.value,
      isToday: ymd === todayYmd,
      items: byDay.value.get(ymd) ?? [],
    };
  });
});

const weekdays = computed(() => {
  const fmt = new Intl.DateTimeFormat(locale.value, { weekday: 'short' });
  // 2024-01-01 fue lunes.
  return Array.from({ length: 7 }, (_, i) => fmt.format(new Date(2024, 0, 1 + i)));
});

const monthLabel = computed(() => {
  const label = new Intl.DateTimeFormat(locale.value, { month: 'long', year: 'numeric' }).format(
    new Date(viewYear.value, viewMonth.value, 1),
  );
  return label.charAt(0).toLocaleUpperCase(locale.value) + label.slice(1);
});

function dateOf(ymd: string): Date {
  const [y, m, d] = ymd.split('-').map(Number);
  return new Date(y ?? 1970, (m ?? 1) - 1, d ?? 1);
}

function cellLabel(cell: Cell): string {
  const date = dateOf(cell.ymd).toLocaleDateString(locale.value, {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });
  return cell.items.length
    ? `${date}, ${t('vencimientos.calendar.dayCount', { n: cell.items.length }, cell.items.length)}`
    : date;
}

const selectedItems = computed(() =>
  selected.value ? (byDay.value.get(selected.value) ?? []) : [],
);
const selectedLabel = computed(() =>
  selected.value
    ? dateOf(selected.value).toLocaleDateString(locale.value, {
        weekday: 'long',
        day: 'numeric',
        month: 'long',
        year: 'numeric',
      })
    : '',
);
</script>

<style scoped>
.cal-grid {
  display: grid;
  grid-template-columns: repeat(7, minmax(0, 1fr));
  gap: 4px;
}
.cal-head {
  margin-bottom: 4px;
}
.cal-cell {
  min-height: 64px;
  padding: 4px;
  border: 1px solid rgb(0 0 0 / 12%);
  border-radius: 6px;
  background: #fff;
  text-align: left;
  cursor: pointer;
  display: flex;
  flex-direction: column;
  gap: 2px;
  font: inherit;
  color: inherit;
}
.cal-cell:focus-visible {
  outline: 2px solid #00796b;
  outline-offset: 1px;
}
.cal-cell--outside {
  background: rgb(0 0 0 / 3%);
  color: #78909c;
}
.cal-cell--today .cal-day {
  align-self: flex-start;
  background: #00796b;
  color: #fff;
  border-radius: 50%;
  min-width: 22px;
  height: 22px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
}
.cal-cell--selected {
  border-color: #00796b;
  box-shadow: 0 0 0 2px #00796b;
}
.cal-day {
  font-size: 12px;
  font-weight: 600;
}
.cal-marks {
  display: flex;
  flex-wrap: wrap;
  gap: 2px;
  align-items: center;
}
.cal-mark {
  display: inline-flex;
  align-items: center;
}
@media (max-width: 599px) {
  .cal-cell {
    min-height: 52px;
    padding: 2px;
  }
}
</style>
