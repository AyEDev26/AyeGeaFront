<template>
  <q-dialog v-model="visible" persistent @hide="onHide">
    <GlassCard style="width: 100%; min-width: 320px; max-width: 500px">
      <q-card-section class="row items-center q-pb-none">
        <div class="text-h6 text-teal-10 font-outfit">{{ t('inventario.duplicar.title') }}</div>
        <q-space />
        <q-btn icon="close" flat round dense :disable="saving" @click="visible = false" />
      </q-card-section>

      <q-card-section>
        <p class="text-body2 q-mb-md">{{ t('inventario.duplicar.description') }}</p>
        <q-form ref="formRef" @submit.prevent="onSubmit">
          <q-input
            v-model="referencia"
            outlined
            dense
            autofocus
            class="elegant-input"
            :label="t('inventario.duplicar.referencia')"
            :rules="referenciaRules"
            lazy-rules
            :error="!!serverError"
            :error-message="serverError"
            :disable="saving"
            @update:model-value="serverError = ''"
          />
        </q-form>
      </q-card-section>

      <q-card-actions align="right">
        <q-btn
          flat
          no-caps
          color="grey-7"
          :label="t('inventario.duplicar.cancel')"
          :disable="saving"
          @click="visible = false"
        />
        <q-btn
          unelevated
          no-caps
          color="primary"
          class="elegant-btn px-lg"
          :label="t('inventario.duplicar.confirm')"
          :loading="saving"
          @click="onSubmit"
        />
      </q-card-actions>
    </GlassCard>
  </q-dialog>
</template>

<script setup lang="ts">
import { ref, watch } from 'vue';
import { useRouter } from 'vue-router';
import { useQuasar, type QForm } from 'quasar';
import { useI18n } from 'vue-i18n';
import { AxiosError } from 'axios';
import { useElemsInventarioStore, type TipoElemInventarioId } from '@/stores/elemsInventario';
import { buildDuplicateForm } from '@/utils/inventario-duplicate';
import { getApiErrorMessage } from '@/utils/api-error';
import GlassCard from '@/components/common/GlassCard.vue';

const props = defineProps<{
  tipoId: TipoElemInventarioId;
  elemId: number;
}>();

const emit = defineEmits<{
  duplicated: [newId: number];
}>();

const visible = defineModel<boolean>({ required: true });

const $q = useQuasar();
const router = useRouter();
const { t } = useI18n();
const elemsStore = useElemsInventarioStore();

const TIPO_KEYS = { 1: 'vehiculos', 2: 'maquinaria', 3: 'epis' } as const;
const MAX_REFERENCIA = 20;

const formRef = ref<QForm | null>(null);
const referencia = ref('');
const serverError = ref('');
const saving = ref(false);

const referenciaRules = [
  (val: string) => !!val?.trim() || t('inventario.duplicar.referenciaRequired'),
  (val: string) =>
    (val ?? '').trim().length <= MAX_REFERENCIA ||
    t('inventario.form.validation.maxLength', { max: MAX_REFERENCIA }),
];

watch(visible, (isVisible) => {
  if (isVisible) {
    referencia.value = '';
    serverError.value = '';
    formRef.value?.resetValidation();
  }
});

function onHide() {
  saving.value = false;
}

// Devuelve el mensaje del 422 asociado a la referencia, si lo hay.
function referenciaServerError(error: unknown): string | null {
  if (!(error instanceof AxiosError) || error.response?.status !== 422) return null;
  const errors = (error.response.data as { errors?: Record<string, string[]> } | undefined)?.errors;
  return errors?.referencia?.[0] ?? null;
}

async function onSubmit() {
  if (saving.value) return;
  const isValid = await formRef.value?.validate();
  if (!isValid) return;

  serverError.value = '';
  saving.value = true;
  try {
    const detail = await elemsStore.fetchElem(props.elemId);
    const form = buildDuplicateForm(detail.form, referencia.value, props.tipoId);
    const newId = await elemsStore.createElem(props.tipoId, form);
    $q.notify({ type: 'positive', color: 'teal-9', message: t('inventario.duplicar.success') });
    emit('duplicated', newId);
    visible.value = false;
    void router.push(`/inventario/${TIPO_KEYS[props.tipoId]}/${newId}/editar`);
  } catch (error) {
    const referenciaError = referenciaServerError(error);
    if (referenciaError) {
      serverError.value = referenciaError;
    } else {
      $q.notify({
        type: 'negative',
        color: 'red-9',
        message: getApiErrorMessage(error, t('inventario.duplicar.error')),
      });
    }
  } finally {
    saving.value = false;
  }
}
</script>
