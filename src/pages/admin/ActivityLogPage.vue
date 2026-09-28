<template>
  <AdminPageWrapper wide align-top>
    <GlassCard class="q-pa-md animate__fadeIn" style="min-height: 50vh">
      <div class="row items-center justify-between q-mb-md">
        <div class="text-h5 text-weight-bolder text-teal-10 font-outfit">
          {{ t('admin.activityLog.title') }}
        </div>
      </div>

      <div class="row q-col-gutter-sm q-mb-md items-start">
        <div class="col-6 col-md">
          <q-input
            v-model="filters.createdFrom"
            outlined
            dense
            clearable
            type="date"
            class="elegant-input"
            :label="t('admin.activityLog.filters.createdFromLabel')"
          />
        </div>
        <div class="col-6 col-md">
          <q-input
            v-model="filters.createdTo"
            outlined
            dense
            clearable
            type="date"
            class="elegant-input"
            :label="t('admin.activityLog.filters.createdToLabel')"
          />
        </div>
        <div class="col-12 col-md">
          <q-input
            v-model="filters.description"
            outlined
            dense
            clearable
            class="elegant-input"
            :label="t('admin.activityLog.filters.descriptionLabel')"
          />
        </div>
        <div class="col-12 col-md">
          <q-select
            v-model="selectedCauser"
            outlined
            dense
            clearable
            use-input
            hide-selected
            fill-input
            input-debounce="0"
            class="elegant-input"
            :label="t('admin.activityLog.filters.causerLabel')"
            :placeholder="t('admin.activityLog.filters.causerPlaceholder')"
            :options="causerOptions"
            :loading="usersStore.searchingUsers"
            option-label="name"
            option-value="id"
            @filter="onCauserFilter"
            @update:model-value="onCauserSelected"
          >
            <template #no-option>
              <q-item>
                <q-item-section class="text-grey-7">
                  {{ t('admin.activityLog.filters.causerNoResults') }}
                </q-item-section>
              </q-item>
            </template>
          </q-select>
        </div>
        <div class="col-12 col-md">
          <q-input
            v-model="filters.logName"
            outlined
            dense
            clearable
            class="elegant-input"
            :label="t('admin.activityLog.filters.logNameLabel')"
            :hint="t('admin.activityLog.filters.logNameHint')"
          />
        </div>
        <div class="col-12 col-md">
          <q-input
            v-model="filters.event"
            outlined
            dense
            clearable
            class="elegant-input"
            :label="t('admin.activityLog.filters.eventLabel')"
            :hint="t('admin.activityLog.filters.eventHint')"
          />
        </div>
        <div class="col-12 col-md-auto row q-gutter-x-sm items-center justify-end">
          <q-btn
            unelevated
            no-caps
            color="primary"
            icon="filter_alt"
            class="elegant-btn"
            :label="t('admin.activityLog.filters.filterButton')"
            @click="onFilterClick"
          />
          <q-btn
            flat
            no-caps
            color="grey-8"
            :label="t('admin.activityLog.filters.clearButton')"
            @click="onClearClick"
          />
        </div>
      </div>

      <q-table
        v-model:pagination="pagination"
        flat
        bordered
        dense
        class="elegant-table cursor-pointer"
        :rows="activityLogStore.items"
        :columns="columns"
        row-key="id"
        :rows-per-page-options="[10, 15, 25, 50]"
        :loading="activityLogStore.loading"
        @request="onRequest"
        @row-click="onRowClick"
      >
        <template #body-cell-createdAt="props">
          <q-td :props="props">
            {{ formatDate(props.row.createdAt) }}
          </q-td>
        </template>

        <template #body-cell-causer="props">
          <q-td :props="props">
            {{ props.row.causer ? props.row.causer.name : t('admin.activityLog.causerSystem') }}
          </q-td>
        </template>

        <template #body-cell-logName="props">
          <q-td :props="props">
            <q-chip square dense color="indigo-1" text-color="indigo-9">
              {{ props.row.logName || '—' }}
            </q-chip>
          </q-td>
        </template>

        <template #body-cell-event="props">
          <q-td :props="props">
            <q-chip square dense color="indigo-1" text-color="indigo-9">
              {{ props.row.event || '—' }}
            </q-chip>
          </q-td>
        </template>
      </q-table>
    </GlassCard>

    <q-dialog v-model="detailDialog">
      <GlassCard v-if="selectedEntry" style="width: 100%; min-width: 320px; max-width: 640px">
        <q-card-section class="row items-center q-pb-none">
          <div class="text-h6 text-teal-10 font-outfit">
            {{ t('admin.activityLog.detail.title') }}
          </div>
          <q-space />
          <q-btn icon="close" flat round dense v-close-popup />
        </q-card-section>

        <q-card-section class="q-gutter-y-sm">
          <div>
            <div class="text-caption text-grey-7">
              {{ t('admin.activityLog.columns.createdAt') }}
            </div>
            <div>{{ formatDate(selectedEntry.createdAt) }}</div>
          </div>

          <div>
            <div class="text-caption text-grey-7">
              {{ t('admin.activityLog.columns.description') }}
            </div>
            <div>{{ selectedEntry.description }}</div>
          </div>

          <div>
            <div class="text-caption text-grey-7">{{ t('admin.activityLog.columns.causer') }}</div>
            <div>
              {{
                selectedEntry.causer
                  ? `${selectedEntry.causer.name} (${selectedEntry.causer.email})`
                  : t('admin.activityLog.causerSystem')
              }}
            </div>
          </div>

          <div>
            <div class="text-caption text-grey-7">
              {{ t('admin.activityLog.columns.logName') }}
            </div>
            <q-chip square dense color="indigo-1" text-color="indigo-9">
              {{ selectedEntry.logName || '—' }}
            </q-chip>
          </div>

          <div>
            <div class="text-caption text-grey-7">
              {{ t('admin.activityLog.columns.event') }}
            </div>
            <q-chip square dense color="indigo-1" text-color="indigo-9">
              {{ selectedEntry.event || '—' }}
            </q-chip>
          </div>

          <div>
            <div class="text-caption text-grey-7">
              {{ t('admin.activityLog.detail.subjectLabel') }}
            </div>
            <div>
              {{
                selectedEntry.subjectType
                  ? `${selectedEntry.subjectType} #${selectedEntry.subjectId}`
                  : t('admin.activityLog.detail.subjectNone')
              }}
            </div>
          </div>

          <div>
            <div class="text-caption text-grey-7">
              {{ t('admin.activityLog.detail.propertiesLabel') }}
            </div>
            <pre
              v-if="selectedEntry.properties && Object.keys(selectedEntry.properties).length"
              class="activity-properties"
              >{{ JSON.stringify(selectedEntry.properties, null, 2) }}</pre>
            <div v-else>{{ t('admin.activityLog.detail.propertiesEmpty') }}</div>
          </div>
        </q-card-section>
      </GlassCard>
    </q-dialog>
  </AdminPageWrapper>
</template>

<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue';
import { useQuasar, type QTableColumn } from 'quasar';
import { useI18n } from 'vue-i18n';
import { AxiosError } from 'axios';
import {
  useActivityLogStore,
  type ActivityLogEntry,
  type ActivityLogFilters,
} from '@/stores/activityLog';
import { useUsersStore, type AdminUser } from '@/stores/users';
import { useLocaleStore } from '@/stores/locale';
import { getApiErrorMessage } from '@/utils/api-error';
import AdminPageWrapper from '@/components/common/AdminPageWrapper.vue';
import GlassCard from '@/components/common/GlassCard.vue';

const $q = useQuasar();
const { t } = useI18n();
const activityLogStore = useActivityLogStore();
const usersStore = useUsersStore();
const localeStore = useLocaleStore();

const columns = computed<QTableColumn<ActivityLogEntry>[]>(() => [
  {
    name: 'createdAt',
    label: t('admin.activityLog.columns.createdAt'),
    field: 'createdAt',
    align: 'left',
  },
  {
    name: 'description',
    label: t('admin.activityLog.columns.description'),
    field: 'description',
    align: 'left',
  },
  {
    name: 'causer',
    label: t('admin.activityLog.columns.causer'),
    field: (row) => row.causer?.name ?? null,
    align: 'left',
  },
  {
    name: 'logName',
    label: t('admin.activityLog.columns.logName'),
    field: 'logName',
    align: 'left',
  },
  {
    name: 'event',
    label: t('admin.activityLog.columns.event'),
    field: 'event',
    align: 'left',
  },
]);

const pagination = ref({
  page: 1,
  rowsPerPage: 15,
  rowsNumber: 0,
});

const filters = ref({
  logName: '',
  event: '',
  description: '',
  createdFrom: '',
  createdTo: '',
});

// Última combinación de filtros aplicada (vía "Filtrar" o "Limpiar"). Se reutiliza en
// onRequest para que cambiar de página conserve los filtros activos, sin depender de
// lo que haya escrito el usuario en los inputs sin haber pulsado "Filtrar" todavía.
const appliedFilters = ref<ActivityLogFilters>({});

const selectedCauser = ref<AdminUser | null>(null);
const causerOptions = ref<AdminUser[]>([]);
let causerSearchTimeout: ReturnType<typeof setTimeout> | undefined;

const detailDialog = ref(false);
const selectedEntry = ref<ActivityLogEntry | null>(null);

function onRowClick(_evt: Event, row: ActivityLogEntry) {
  selectedEntry.value = row;
  detailDialog.value = true;
}

function buildFilters(): ActivityLogFilters {
  const result: ActivityLogFilters = {};
  if (filters.value.logName) {
    result.logName = filters.value.logName;
  }
  if (filters.value.event) {
    result.event = filters.value.event;
  }
  if (filters.value.description) {
    result.description = filters.value.description;
  }
  if (filters.value.createdFrom) {
    result.createdFrom = filters.value.createdFrom;
  }
  if (filters.value.createdTo) {
    result.createdTo = filters.value.createdTo;
  }
  if (selectedCauser.value) {
    result.causerId = selectedCauser.value.id;
  }
  return result;
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat(localeStore.current, {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(new Date(value));
}

function notifyFetchError(error: unknown) {
  const fallback =
    error instanceof AxiosError && error.response?.status === 422
      ? t('admin.activityLog.dateRangeError')
      : t('admin.activityLog.fetchError');
  $q.notify({ type: 'negative', color: 'red-9', message: getApiErrorMessage(error, fallback) });
}

watch(
  () => activityLogStore.meta,
  (meta) => {
    pagination.value = {
      page: meta.currentPage,
      rowsPerPage: meta.perPage,
      rowsNumber: meta.total,
    };
  },
  { deep: true },
);

async function onRequest(requestProps: { pagination: { page: number; rowsPerPage: number } }) {
  try {
    await activityLogStore.fetchLogs(
      requestProps.pagination.page,
      requestProps.pagination.rowsPerPage,
      appliedFilters.value,
    );
  } catch (error) {
    notifyFetchError(error);
  }
}

async function onFilterClick() {
  appliedFilters.value = buildFilters();
  try {
    await activityLogStore.fetchLogs(1, pagination.value.rowsPerPage, appliedFilters.value);
  } catch (error) {
    notifyFetchError(error);
  }
}

async function onClearClick() {
  filters.value = { logName: '', event: '', description: '', createdFrom: '', createdTo: '' };
  selectedCauser.value = null;
  appliedFilters.value = {};
  try {
    await activityLogStore.fetchLogs(1, pagination.value.rowsPerPage, appliedFilters.value);
  } catch (error) {
    notifyFetchError(error);
  }
}

function onCauserFilter(val: string, update: (callback: () => void) => void) {
  if (causerSearchTimeout) {
    clearTimeout(causerSearchTimeout);
  }
  causerSearchTimeout = setTimeout(() => {
    void (async () => {
      if (!val) {
        update(() => {
          causerOptions.value = [];
        });
        return;
      }
      try {
        const results = await usersStore.searchUsersByName(val);
        update(() => {
          causerOptions.value = results;
        });
      } catch (error) {
        notifyFetchError(error);
        update(() => {
          causerOptions.value = [];
        });
      }
    })();
  }, 300);
}

async function onCauserSelected() {
  await onFilterClick();
}

onMounted(() => {
  void onRequest({
    pagination: { page: pagination.value.page, rowsPerPage: pagination.value.rowsPerPage },
  });
});
</script>

<style scoped>
.activity-properties {
  margin: 0;
  padding: 8px;
  max-height: 240px;
  overflow: auto;
  font-size: 0.8rem;
  background: rgba(0, 0, 0, 0.04);
  border-radius: 4px;
  white-space: pre-wrap;
  word-break: break-word;
}
</style>
