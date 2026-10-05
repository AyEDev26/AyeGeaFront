<template>
  <q-dialog v-model="visible" persistent @hide="onHide">
    <GlassCard style="width: 100%; min-width: 320px; max-width: 500px">
      <q-card-section class="row items-center q-pb-none">
        <div class="text-h6 text-teal-10 font-outfit">
          {{
            isEditMode
              ? t('admin.departamentoForm.editTitle')
              : t('admin.departamentoForm.createTitle')
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
            :label="t('admin.departamentoForm.nombreLabel')"
            :rules="nombreRules"
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
import { useDepartamentosStore, type Departamento } from '@/stores/departamentos';
import { getApiErrorMessage } from '@/utils/api-error';
import GlassCard from '@/components/common/GlassCard.vue';

const props = defineProps<{
  departamento: Departamento | null;
}>();

const emit = defineEmits<{
  saved: [];
}>();

const visible = defineModel<boolean>({ required: true });

const $q = useQuasar();
const { t } = useI18n();
const departamentosStore = useDepartamentosStore();

const isEditMode = computed(() => props.departamento !== null);

const formRef = ref<QForm | null>(null);
const nombre = ref('');
const saving = ref(false);

const nombreRules = [
  (val: string) => !!val?.trim() || t('admin.departamentoForm.nombreRequired'),
  (val: string) => val.length <= 25 || t('admin.departamentoForm.nombreTooLong'),
];

function resetForm() {
  nombre.value = props.departamento?.nombre ?? '';
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
    const payload = { nombre: nombre.value.trim() };
    if (isEditMode.value && props.departamento) {
      await departamentosStore.updateDepartamento(props.departamento.id, payload);
      $q.notify({
        type: 'positive',
        color: 'teal-9',
        message: t('admin.departamentoForm.updated'),
      });
    } else {
      await departamentosStore.createDepartamento(payload);
      $q.notify({
        type: 'positive',
        color: 'teal-9',
        message: t('admin.departamentoForm.created'),
      });
    }
    emit('saved');
  } catch (error) {
    $q.notify({
      type: 'negative',
      color: 'red-9',
      message: getApiErrorMessage(error, t('admin.departamentoForm.saveError')),
    });
  } finally {
    saving.value = false;
  }
}
</script>
