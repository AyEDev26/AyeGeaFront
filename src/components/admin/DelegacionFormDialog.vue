<template>
  <q-dialog v-model="visible" persistent @hide="onHide">
    <GlassCard style="width: 100%; min-width: 320px; max-width: 500px">
      <q-card-section class="row items-center q-pb-none">
        <div class="text-h6 text-teal-10 font-outfit">
          {{
            isEditMode ? t('admin.delegacionForm.editTitle') : t('admin.delegacionForm.createTitle')
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
            :label="t('admin.delegacionForm.nombreLabel')"
            :rules="nombreRules"
            lazy-rules
          />

          <q-input
            v-model="prefijo"
            outlined
            dense
            class="elegant-input"
            :label="t('admin.delegacionForm.prefijoLabel')"
            :rules="prefijoRules"
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
import { useDelegacionesStore, type Delegacion } from '@/stores/delegaciones';
import { getApiErrorMessage } from '@/utils/api-error';
import GlassCard from '@/components/common/GlassCard.vue';

const props = defineProps<{
  delegacion: Delegacion | null;
}>();

const emit = defineEmits<{
  saved: [];
}>();

const visible = defineModel<boolean>({ required: true });

const $q = useQuasar();
const { t } = useI18n();
const delegacionesStore = useDelegacionesStore();

const isEditMode = computed(() => props.delegacion !== null);

const formRef = ref<QForm | null>(null);
const nombre = ref('');
const prefijo = ref('');
const saving = ref(false);

const nombreRules = [
  (val: string) => !!val?.trim() || t('admin.delegacionForm.nombreRequired'),
  (val: string) => val.length <= 100 || t('admin.delegacionForm.nombreTooLong'),
];
const prefijoRules = [
  (val: string) => !val || val.length <= 45 || t('admin.delegacionForm.prefijoTooLong'),
];

function resetForm() {
  nombre.value = props.delegacion?.nombre ?? '';
  prefijo.value = props.delegacion?.prefijo ?? '';
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

async function onSubmit() {
  const isValid = await formRef.value?.validate();
  if (!isValid) {
    return;
  }

  saving.value = true;
  try {
    // Un prefijo vaciado se envía como null para poder borrar el valor existente.
    const payload = { nombre: nombre.value.trim(), prefijo: prefijo.value.trim() || null };
    if (isEditMode.value && props.delegacion) {
      await delegacionesStore.updateDelegacion(props.delegacion.id, payload);
      $q.notify({ type: 'positive', color: 'teal-9', message: t('admin.delegacionForm.updated') });
    } else {
      await delegacionesStore.createDelegacion(payload);
      $q.notify({ type: 'positive', color: 'teal-9', message: t('admin.delegacionForm.created') });
    }
    emit('saved');
  } catch (error) {
    $q.notify({
      type: 'negative',
      color: 'red-9',
      message: getApiErrorMessage(error, t('admin.delegacionForm.saveError')),
    });
  } finally {
    saving.value = false;
  }
}
</script>
