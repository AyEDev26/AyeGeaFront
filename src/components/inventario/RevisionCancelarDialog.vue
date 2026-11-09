<template>
  <q-dialog v-model="visible" persistent @hide="onHide">
    <GlassCard style="width: 100%; min-width: 320px; max-width: 480px">
      <q-card-section class="row items-center q-pb-none">
        <div class="text-h6 text-teal-10 font-outfit">{{ t('revisionCancelar.title') }}</div>
        <q-space />
        <q-btn icon="close" flat round dense v-close-popup />
      </q-card-section>

      <q-card-section>
        <q-form ref="formRef" class="q-gutter-y-md" @submit.prevent="onSubmit">
          <div v-if="revision?.nombre" class="text-body2 text-grey-8">{{ revision.nombre }}</div>

          <q-input
            v-model="motivo"
            outlined
            dense
            autogrow
            type="textarea"
            class="elegant-input"
            :label="t('revisionCancelar.motivoLabel')"
            :rules="motivoRules"
            lazy-rules
          />
        </q-form>
      </q-card-section>

      <q-card-actions align="right">
        <q-btn
          flat
          no-caps
          color="grey-7"
          :label="t('revisionCancelar.closeButton')"
          v-close-popup
        />
        <q-btn
          unelevated
          no-caps
          color="negative"
          class="elegant-btn px-lg"
          :label="t('revisionCancelar.confirmButton')"
          :loading="saving"
          @click="onSubmit"
        />
      </q-card-actions>
    </GlassCard>
  </q-dialog>
</template>

<script setup lang="ts">
import { ref, watch } from 'vue';
import { AxiosError } from 'axios';
import { useQuasar, type QForm } from 'quasar';
import { useI18n } from 'vue-i18n';
import { useRevisionesStore, type Revision } from '@/stores/revisiones';
import { getApiErrorMessage } from '@/utils/api-error';
import GlassCard from '@/components/common/GlassCard.vue';

const props = defineProps<{
  revision: Revision | null;
}>();

// `saved` también se emite ante un 409 (la revisión ya no está Pendiente) para recargar la tabla.
const emit = defineEmits<{
  saved: [];
}>();

const visible = defineModel<boolean>({ required: true });

const $q = useQuasar();
const { t } = useI18n();
const revisionesStore = useRevisionesStore();

const formRef = ref<QForm | null>(null);
const motivo = ref('');
const saving = ref(false);

const motivoRules = [
  (val: string) => !!val?.trim() || t('revisionCancelar.motivoRequired'),
  (val: string) => (val ?? '').trim().length <= 255 || t('revisionCancelar.motivoTooLong'),
];

watch(visible, (isVisible) => {
  if (isVisible) {
    motivo.value = '';
    formRef.value?.resetValidation();
  }
});

function onHide() {
  saving.value = false;
}

async function onSubmit() {
  if (!props.revision) return;
  const isValid = await formRef.value?.validate();
  if (!isValid) return;

  saving.value = true;
  try {
    await revisionesStore.cancelarRevision(props.revision.id, motivo.value);
    $q.notify({ type: 'positive', color: 'teal-9', message: t('revisionCancelar.success') });
    visible.value = false;
    emit('saved');
  } catch (error) {
    $q.notify({
      type: 'negative',
      color: 'red-9',
      message: getApiErrorMessage(error, t('revisionCancelar.error')),
    });
    if (error instanceof AxiosError && error.response?.status === 409) {
      visible.value = false;
      emit('saved');
    }
  } finally {
    saving.value = false;
  }
}
</script>
