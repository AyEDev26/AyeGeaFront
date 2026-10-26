<template>
  <q-dialog v-model="visible" persistent @hide="onHide">
    <GlassCard style="width: 100%; min-width: 320px; max-width: 500px">
      <q-card-section class="row items-center q-pb-none">
        <div class="text-h6 text-teal-10 font-outfit">
          {{
            isEditMode
              ? t('admin.tipoDocumentoForm.editTitle')
              : t('admin.tipoDocumentoForm.createTitle')
          }}
        </div>
        <q-space />
        <q-btn icon="close" flat round dense v-close-popup />
      </q-card-section>

      <q-card-section>
        <q-form ref="formRef" class="q-gutter-y-md" @submit.prevent="onSubmit">
          <q-input
            v-model="descripcion"
            outlined
            dense
            class="elegant-input"
            :label="t('admin.tipoDocumentoForm.descripcionLabel')"
            :rules="descripcionRules"
            lazy-rules
          />
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
import {
  useTiposDocumentoStore,
  type TipoDocumento,
  type TipoDocumentoPayload,
} from '@/stores/tiposDocumento';
import { getApiErrorMessage } from '@/utils/api-error';
import GlassCard from '@/components/common/GlassCard.vue';

const props = defineProps<{
  tipoDocumento: TipoDocumento | null;
}>();

const emit = defineEmits<{
  saved: [];
}>();

const visible = defineModel<boolean>({ required: true });

const $q = useQuasar();
const { t } = useI18n();
const tiposDocumentoStore = useTiposDocumentoStore();

const isEditMode = computed(() => props.tipoDocumento !== null);

const formRef = ref<QForm | null>(null);
const descripcion = ref('');
const saving = ref(false);

const descripcionRules = [
  (val: string) => !!val?.trim() || t('admin.tipoDocumentoForm.descripcionRequired'),
  (val: string) => val.trim().length <= 100 || t('admin.tipoDocumentoForm.descripcionTooLong'),
];

function resetForm() {
  descripcion.value = props.tipoDocumento?.descripcion ?? '';
  formRef.value?.resetValidation();
}

watch(visible, (isVisible) => {
  if (isVisible) {
    resetForm();
  }
});

function onHide() {
  saving.value = false;
}

function buildPayload(): TipoDocumentoPayload {
  return {
    descripcion: descripcion.value.trim(),
  };
}

async function onSubmit() {
  const isValid = await formRef.value?.validate();
  if (!isValid) {
    return;
  }

  saving.value = true;
  try {
    const payload = buildPayload();
    if (isEditMode.value && props.tipoDocumento) {
      await tiposDocumentoStore.updateTipoDocumento(props.tipoDocumento.id, payload);
      $q.notify({
        type: 'positive',
        color: 'teal-9',
        message: t('admin.tipoDocumentoForm.updated'),
      });
    } else {
      await tiposDocumentoStore.createTipoDocumento(payload);
      $q.notify({
        type: 'positive',
        color: 'teal-9',
        message: t('admin.tipoDocumentoForm.created'),
      });
    }
    emit('saved');
  } catch (error) {
    $q.notify({
      type: 'negative',
      color: 'red-9',
      message: getApiErrorMessage(error, t('admin.tipoDocumentoForm.saveError')),
    });
  } finally {
    saving.value = false;
  }
}
</script>
