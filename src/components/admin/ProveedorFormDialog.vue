<template>
  <q-dialog v-model="visible" persistent @hide="onHide">
    <GlassCard style="width: 100%; min-width: 320px; max-width: 500px">
      <q-card-section class="row items-center q-pb-none">
        <div class="text-h6 text-teal-10 font-outfit">
          {{
            isEditMode ? t('admin.proveedorForm.editTitle') : t('admin.proveedorForm.createTitle')
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
            :label="t('admin.proveedorForm.nombreLabel')"
            :rules="nombreRules"
            lazy-rules
          />
          <q-input
            v-model="direccion"
            outlined
            dense
            class="elegant-input"
            :label="t('admin.proveedorForm.direccionLabel')"
            :rules="direccionRules"
            lazy-rules
          />
          <q-input
            v-model="telefono"
            outlined
            dense
            class="elegant-input"
            :label="t('admin.proveedorForm.telefonoLabel')"
            :rules="telefonoRules"
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
import { useProveedoresStore, type Proveedor, type ProveedorPayload } from '@/stores/proveedores';
import { getApiErrorMessage } from '@/utils/api-error';
import GlassCard from '@/components/common/GlassCard.vue';

const props = defineProps<{
  proveedor: Proveedor | null;
}>();

const emit = defineEmits<{
  saved: [];
}>();

const visible = defineModel<boolean>({ required: true });

const $q = useQuasar();
const { t } = useI18n();
const proveedoresStore = useProveedoresStore();

const isEditMode = computed(() => props.proveedor !== null);

const formRef = ref<QForm | null>(null);
const nombre = ref('');
const direccion = ref('');
const telefono = ref('');
const saving = ref(false);

const nombreRules = [
  (val: string) => !!val?.trim() || t('admin.proveedorForm.nombreRequired'),
  (val: string) => val.length <= 100 || t('admin.proveedorForm.nombreTooLong'),
];
const direccionRules = [
  (val: string | null) => (val ?? '').length <= 255 || t('admin.proveedorForm.direccionTooLong'),
];
const telefonoRules = [
  (val: string | null) => (val ?? '').length <= 100 || t('admin.proveedorForm.telefonoTooLong'),
];

function resetForm() {
  nombre.value = props.proveedor?.nombre ?? '';
  direccion.value = props.proveedor?.direccion ?? '';
  telefono.value = props.proveedor?.telefono ?? '';
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

// Los strings vacíos nunca se envían: en edición los opcionales vaciados van como null;
// en alta se omiten.
function buildPayload(): ProveedorPayload {
  const payload: ProveedorPayload = { nombre: nombre.value.trim() };
  const direccionValue = (direccion.value ?? '').trim();
  const telefonoValue = (telefono.value ?? '').trim();
  if (isEditMode.value) {
    payload.direccion = direccionValue || null;
    payload.telefono = telefonoValue || null;
  } else {
    if (direccionValue) payload.direccion = direccionValue;
    if (telefonoValue) payload.telefono = telefonoValue;
  }
  return payload;
}

async function onSubmit() {
  const isValid = await formRef.value?.validate();
  if (!isValid) {
    return;
  }

  saving.value = true;
  try {
    const payload = buildPayload();
    if (isEditMode.value && props.proveedor) {
      await proveedoresStore.updateProveedor(props.proveedor.id, payload);
      $q.notify({
        type: 'positive',
        color: 'teal-9',
        message: t('admin.proveedorForm.updated'),
      });
    } else {
      await proveedoresStore.createProveedor(payload);
      $q.notify({
        type: 'positive',
        color: 'teal-9',
        message: t('admin.proveedorForm.created'),
      });
    }
    emit('saved');
  } catch (error) {
    $q.notify({
      type: 'negative',
      color: 'red-9',
      message: getApiErrorMessage(error, t('admin.proveedorForm.saveError')),
    });
  } finally {
    saving.value = false;
  }
}
</script>
