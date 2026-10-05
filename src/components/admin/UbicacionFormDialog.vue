<template>
  <q-dialog v-model="visible" persistent @hide="onHide">
    <GlassCard style="width: 100%; min-width: 320px; max-width: 500px">
      <q-card-section class="row items-center q-pb-none">
        <div class="text-h6 text-teal-10 font-outfit">
          {{
            isEditMode ? t('admin.ubicacionForm.editTitle') : t('admin.ubicacionForm.createTitle')
          }}
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
            :label="t('admin.ubicacionForm.nombreLabel')"
            :rules="nombreRules"
            lazy-rules
          />

          <q-input
            v-model="direccion"
            outlined
            dense
            class="elegant-input"
            :label="t('admin.ubicacionForm.direccionLabel')"
            :rules="direccionRules"
            lazy-rules
          />

          <q-input
            v-model="prefijo"
            outlined
            dense
            class="elegant-input"
            :label="t('admin.ubicacionForm.prefijoLabel')"
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
            option-label="nombre"
            :label="t('admin.ubicacionForm.delegacionLabel')"
            :placeholder="t('admin.ubicacionForm.searchPlaceholder')"
            :options="delegacionOptions"
            :loading="searchingDelegaciones"
            @filter="onFilterDelegaciones"
          >
            <template #no-option>
              <q-item>
                <q-item-section class="text-grey">
                  {{ t('admin.ubicacionForm.noResults') }}
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
import { useUbicacionesStore, type Ubicacion } from '@/stores/ubicaciones';
import { useDelegacionesStore } from '@/stores/delegaciones';
import { getApiErrorMessage } from '@/utils/api-error';
import GlassCard from '@/components/common/GlassCard.vue';

interface RelationOption {
  id: number;
  nombre: string;
}

const props = defineProps<{
  ubicacion: Ubicacion | null;
}>();

const emit = defineEmits<{
  saved: [];
}>();

const visible = defineModel<boolean>({ required: true });

const $q = useQuasar();
const { t } = useI18n();
const ubicacionesStore = useUbicacionesStore();
const delegacionesStore = useDelegacionesStore();

const isEditMode = computed(() => props.ubicacion !== null);

const formRef = ref<QForm | null>(null);
const nombre = ref('');
const direccion = ref('');
const prefijo = ref('');
const delegacion = ref<RelationOption | null>(null);
const delegacionOptions = ref<RelationOption[]>([]);
const searchingDelegaciones = ref(false);
const saving = ref(false);

const nombreRules = [
  (val: string) => !!val?.trim() || t('admin.ubicacionForm.nombreRequired'),
  (val: string) => val.length <= 150 || t('admin.ubicacionForm.nombreTooLong'),
];
const direccionRules = [
  (val: string) => !val || val.length <= 255 || t('admin.ubicacionForm.direccionTooLong'),
];
const prefijoRules = [
  (val: string) => !val || val.length <= 5 || t('admin.ubicacionForm.prefijoTooLong'),
];

function resetForm() {
  nombre.value = props.ubicacion?.nombre ?? '';
  direccion.value = props.ubicacion?.direccion ?? '';
  prefijo.value = props.ubicacion?.prefijo ?? '';
  // La opción actual sale del objeto relacionado que ya trae el listado: así se muestra
  // el nombre sin una petición extra.
  delegacion.value = props.ubicacion?.delegacion ?? null;
  delegacionOptions.value = [];
  formRef.value?.resetValidation();
}

watch(visible, (isVisible) => {
  if (isVisible) {
    resetForm();
  }
});

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
        delegacionOptions.value = results.map(({ id, nombre: name }) => ({ id, nombre: name }));
      });
    })
    .catch(() => {
      abort();
    })
    .finally(() => {
      searchingDelegaciones.value = false;
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
      direccion: direccion.value.trim() || null,
      prefijo: prefijo.value.trim() || null,
      delegacion_id: delegacion.value?.id ?? null,
    };
    if (isEditMode.value && props.ubicacion) {
      await ubicacionesStore.updateUbicacion(props.ubicacion.id, payload);
      $q.notify({ type: 'positive', color: 'teal-9', message: t('admin.ubicacionForm.updated') });
    } else {
      await ubicacionesStore.createUbicacion(payload);
      $q.notify({ type: 'positive', color: 'teal-9', message: t('admin.ubicacionForm.created') });
    }
    emit('saved');
  } catch (error) {
    $q.notify({
      type: 'negative',
      color: 'red-9',
      message: getApiErrorMessage(error, t('admin.ubicacionForm.saveError')),
    });
  } finally {
    saving.value = false;
  }
}
</script>
