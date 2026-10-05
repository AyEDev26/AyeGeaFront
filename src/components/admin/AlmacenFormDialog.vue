<template>
  <q-dialog v-model="visible" persistent @hide="onHide">
    <GlassCard style="width: 100%; min-width: 320px; max-width: 500px">
      <q-card-section class="row items-center q-pb-none">
        <div class="text-h6 text-teal-10 font-outfit">
          {{ isEditMode ? t('admin.almacenForm.editTitle') : t('admin.almacenForm.createTitle') }}
        </div>
        <q-space />
        <q-btn icon="close" flat round dense v-close-popup />
      </q-card-section>

      <q-card-section>
        <q-form ref="formRef" class="q-gutter-y-md" @submit.prevent="onSubmit">
          <q-input
            v-model="nombre"
            outlined
            dense
            class="elegant-input"
            :label="t('admin.almacenForm.nombreLabel')"
            :rules="nombreRules"
            lazy-rules
          />

          <q-input
            v-model="prefijo"
            outlined
            dense
            class="elegant-input"
            :label="t('admin.almacenForm.prefijoLabel')"
            :rules="prefijoRules"
            lazy-rules
          />

          <q-select
            v-model="delegacion"
            outlined
            dense
            clearable
            use-input
            hide-dropdown-icon
            input-debounce="300"
            class="elegant-input"
            option-value="id"
            :label="t('admin.almacenForm.delegacionLabel')"
            :placeholder="t('admin.almacenForm.searchPlaceholder')"
            :options="delegacionOptions"
            :loading="searchingDelegaciones"
            @filter="onFilterDelegaciones"
            @update:model-value="onDelegacionChange"
          >
            <template #no-option>
              <q-item>
                <q-item-section class="text-grey">
                  {{ t('admin.almacenForm.noResults') }}
                </q-item-section>
              </q-item>
            </template>
          </q-select>

          <q-select
            v-model="ubicacion"
            outlined
            dense
            clearable
            use-input
            hide-dropdown-icon
            input-debounce="300"
            class="elegant-input"
            option-value="id"
            :label="t('admin.almacenForm.ubicacionLabel')"
            :placeholder="t('admin.almacenForm.searchPlaceholder')"
            :disable="!delegacion"
            :hint="delegacion ? undefined : t('admin.almacenForm.selectDelegacionFirst')"
            :options="ubicacionOptions"
            :loading="searchingUbicaciones"
            @filter="onFilterUbicaciones"
          >
            <template #no-option>
              <q-item>
                <q-item-section class="text-grey">
                  {{ t('admin.almacenForm.noResults') }}
                </q-item-section>
              </q-item>
            </template>
          </q-select>

          <q-select
            v-model="responsable"
            outlined
            dense
            clearable
            use-input
            hide-dropdown-icon
            input-debounce="300"
            class="elegant-input"
            option-value="id"
            :label="t('admin.almacenForm.responsableLabel')"
            :placeholder="t('admin.almacenForm.searchPlaceholder')"
            :options="responsableOptions"
            :loading="usersStore.searchingUsers"
            @filter="onFilterResponsables"
          >
            <template #no-option>
              <q-item>
                <q-item-section class="text-grey">
                  {{ t('admin.almacenForm.noResults') }}
                </q-item-section>
              </q-item>
            </template>
          </q-select>
        </q-form>
      </q-card-section>

      <q-card-actions align="right">
        <q-btn flat no-caps color="grey-7" :label="t('common.cancel')" v-close-popup />
        <q-btn
          unelevated
          no-caps
          color="primary"
          class="elegant-btn px-lg"
          :label="t('common.save')"
          :loading="saving"
          @click="onSubmit"
        />
      </q-card-actions>
    </GlassCard>
  </q-dialog>
</template>

<script setup lang="ts">
import { computed, ref, watch } from 'vue';
import { useQuasar, type QForm } from 'quasar';
import { useI18n } from 'vue-i18n';
import { useAlmacenesStore, type Almacen } from '@/stores/almacenes';
import { useDelegacionesStore } from '@/stores/delegaciones';
import { useUbicacionesStore } from '@/stores/ubicaciones';
import { useUsersStore } from '@/stores/users';
import { getApiErrorMessage } from '@/utils/api-error';
import GlassCard from '@/components/common/GlassCard.vue';

// Opción normalizada de los tres selects de relación (option-value="id", label por defecto).
interface RelationOption {
  id: number;
  label: string;
}

const props = defineProps<{
  almacen: Almacen | null;
}>();

const emit = defineEmits<{
  saved: [];
}>();

const visible = defineModel<boolean>({ required: true });

const $q = useQuasar();
const { t } = useI18n();
const almacenesStore = useAlmacenesStore();
const delegacionesStore = useDelegacionesStore();
const ubicacionesStore = useUbicacionesStore();
const usersStore = useUsersStore();

const isEditMode = computed(() => props.almacen !== null);

const formRef = ref<QForm | null>(null);
const nombre = ref('');
const prefijo = ref('');
const delegacion = ref<RelationOption | null>(null);
const ubicacion = ref<RelationOption | null>(null);
const responsable = ref<RelationOption | null>(null);
const delegacionOptions = ref<RelationOption[]>([]);
const ubicacionOptions = ref<RelationOption[]>([]);
const responsableOptions = ref<RelationOption[]>([]);
const searchingDelegaciones = ref(false);
const searchingUbicaciones = ref(false);
const saving = ref(false);

const nombreRules = [
  (val: string) => !!val?.trim() || t('admin.almacenForm.nombreRequired'),
  (val: string) => val.length <= 50 || t('admin.almacenForm.nombreTooLong'),
];
const prefijoRules = [
  (val: string) => !val || val.length <= 45 || t('admin.almacenForm.prefijoTooLong'),
];

function resetForm() {
  nombre.value = props.almacen?.nombre ?? '';
  prefijo.value = props.almacen?.prefijo ?? '';
  // Las opciones actuales salen de los objetos relacionados que ya trae el listado: así
  // se muestran los nombres sin peticiones extra.
  const { delegacion: d, ubicacion: u, responsable: r } = props.almacen ?? {};
  delegacion.value = d ? { id: d.id, label: d.nombre } : null;
  ubicacion.value = u ? { id: u.id, label: u.nombre } : null;
  responsable.value = r ? { id: r.id, label: r.name } : null;
  delegacionOptions.value = [];
  ubicacionOptions.value = [];
  responsableOptions.value = [];
  formRef.value?.resetValidation();
}

watch(visible, (isVisible) => {
  if (isVisible) {
    resetForm();
  }
});

// Se vacía desde el evento del select (no con un watch) para no borrar la precarga de edición.
function onDelegacionChange() {
  ubicacion.value = null;
  ubicacionOptions.value = [];
}

function onFilterDelegaciones(
  value: string,
  update: (callback: () => void) => void,
  abort: () => void,
) {
  searchingDelegaciones.value = true;
  delegacionesStore
    .searchDelegacionesByNombre(value)
    .then((results) => {
      update(() => {
        delegacionOptions.value = results.map((item) => ({ id: item.id, label: item.nombre }));
      });
    })
    .catch(() => {
      abort();
    })
    .finally(() => {
      searchingDelegaciones.value = false;
    });
}

function onFilterUbicaciones(
  value: string,
  update: (callback: () => void) => void,
  abort: () => void,
) {
  if (!delegacion.value) {
    abort();
    return;
  }
  searchingUbicaciones.value = true;
  ubicacionesStore
    .searchUbicacionesByNombre(value, delegacion.value.id)
    .then((results) => {
      update(() => {
        ubicacionOptions.value = results.map((item) => ({ id: item.id, label: item.nombre }));
      });
    })
    .catch(() => {
      abort();
    })
    .finally(() => {
      searchingUbicaciones.value = false;
    });
}

function onFilterResponsables(
  value: string,
  update: (callback: () => void) => void,
  abort: () => void,
) {
  usersStore
    .searchUsersByName(value)
    .then((results) => {
      update(() => {
        responsableOptions.value = results.map((item) => ({ id: item.id, label: item.name }));
      });
    })
    .catch(() => {
      abort();
    });
}

function onHide() {
  saving.value = false;
}

async function onSubmit() {
  const isValid = await formRef.value?.validate();
  if (!isValid) {
    return;
  }

  saving.value = true;
  try {
    // Los opcionales vaciados se envían como null para poder borrar el valor existente.
    const payload = {
      nombre: nombre.value.trim(),
      prefijo: prefijo.value.trim() || null,
      delegacion_id: delegacion.value?.id ?? null,
      ubicacion_id: ubicacion.value?.id ?? null,
      responsable_id: responsable.value?.id ?? null,
    };
    if (isEditMode.value && props.almacen) {
      await almacenesStore.updateAlmacen(props.almacen.id, payload);
      $q.notify({ type: 'positive', color: 'teal-9', message: t('admin.almacenForm.updated') });
    } else {
      await almacenesStore.createAlmacen(payload);
      $q.notify({ type: 'positive', color: 'teal-9', message: t('admin.almacenForm.created') });
    }
    emit('saved');
  } catch (error) {
    $q.notify({
      type: 'negative',
      color: 'red-9',
      message: getApiErrorMessage(error, t('admin.almacenForm.saveError')),
    });
  } finally {
    saving.value = false;
  }
}
</script>
