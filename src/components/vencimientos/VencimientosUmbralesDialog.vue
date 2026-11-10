<template>
  <q-dialog v-model="visible" persistent>
    <GlassCard style="width: 100%; min-width: 320px; max-width: 560px">
      <q-card-section class="row items-center q-pb-none">
        <div class="text-h6 text-teal-10 font-outfit">{{ t('vencimientos.umbrales.title') }}</div>
        <q-space />
        <q-btn
          icon="close"
          flat
          round
          dense
          v-close-popup
          :aria-label="t('vencimientos.umbrales.close')"
        />
      </q-card-section>

      <q-card-section class="q-pb-none text-body2 text-blue-grey-8">
        {{ t('vencimientos.umbrales.help', { max: VENCIMIENTOS_HORIZONTE_DIAS }) }}
      </q-card-section>

      <q-card-section>
        <q-form ref="formRef" class="q-gutter-y-md" @submit.prevent="onSubmit">
          <div v-for="tipo in VENCIMIENTO_TIPOS" :key="tipo">
            <div class="text-subtitle2 text-weight-bold q-mb-xs">
              {{ t(`vencimientos.tipo.${tipo}`) }}
            </div>
            <div class="row q-col-gutter-sm">
              <div class="col-12 col-sm-6">
                <q-input
                  v-model.number="form[tipo].inminenteDias"
                  outlined
                  dense
                  type="number"
                  min="0"
                  step="1"
                  class="elegant-input"
                  :label="t('vencimientos.umbrales.inminente')"
                  :rules="inminenteRules(tipo)"
                  lazy-rules
                />
              </div>
              <div class="col-12 col-sm-6">
                <q-input
                  v-model.number="form[tipo].proximaDias"
                  outlined
                  dense
                  type="number"
                  min="0"
                  :max="VENCIMIENTOS_HORIZONTE_DIAS"
                  step="1"
                  class="elegant-input"
                  :label="t('vencimientos.umbrales.proxima')"
                  :rules="proximaRules(tipo)"
                  lazy-rules
                />
              </div>
            </div>
          </div>
        </q-form>
      </q-card-section>

      <q-card-actions align="between">
        <q-btn
          flat
          no-caps
          color="grey-8"
          icon="restart_alt"
          :label="t('vencimientos.umbrales.reset')"
          @click="onReset"
        />
        <div>
          <q-btn
            flat
            no-caps
            color="grey-7"
            :label="t('vencimientos.umbrales.close')"
            v-close-popup
          />
          <q-btn
            unelevated
            no-caps
            color="primary"
            class="elegant-btn px-lg"
            :label="t('vencimientos.umbrales.save')"
            @click="onSubmit"
          />
        </div>
      </q-card-actions>
    </GlassCard>
  </q-dialog>
</template>

<script setup lang="ts">
import { reactive, ref, watch } from 'vue';
import { useQuasar, type QForm } from 'quasar';
import { useI18n } from 'vue-i18n';
import GlassCard from '@/components/common/GlassCard.vue';
import {
  defaultUmbrales,
  useVencimientosStore,
  VENCIMIENTO_TIPOS,
  VENCIMIENTOS_HORIZONTE_DIAS,
  type Umbrales,
  type VencimientoTipo,
} from '@/stores/vencimientos';

const visible = defineModel<boolean>({ required: true });

const $q = useQuasar();
const { t } = useI18n();
const store = useVencimientosStore();

const formRef = ref<QForm | null>(null);
// Los inputs numéricos pueden dejar '' si se vacían: se valida como entero antes de guardar.
const form = reactive<Umbrales>(cloneUmbrales(store.umbrales));

function cloneUmbrales(u: Umbrales): Umbrales {
  return {
    revision: { ...u.revision },
    mantenimiento: { ...u.mantenimiento },
    itv: { ...u.itv },
  };
}

watch(visible, (isVisible) => {
  if (isVisible) {
    Object.assign(form, cloneUmbrales(store.umbrales));
    formRef.value?.resetValidation();
  }
});

function isInt(v: unknown): v is number {
  return typeof v === 'number' && Number.isInteger(v);
}

function inminenteRules(tipo: VencimientoTipo) {
  return [
    (v: unknown) => isInt(v) || t('vencimientos.umbrales.errors.integer'),
    (v: number) => v >= 0 || t('vencimientos.umbrales.errors.negative'),
    (v: number) =>
      !isInt(form[tipo].proximaDias) ||
      v <= form[tipo].proximaDias ||
      t('vencimientos.umbrales.errors.proximaLessThanInminente'),
  ];
}

function proximaRules(tipo: VencimientoTipo) {
  return [
    (v: unknown) => isInt(v) || t('vencimientos.umbrales.errors.integer'),
    (v: number) =>
      v <= VENCIMIENTOS_HORIZONTE_DIAS ||
      t('vencimientos.umbrales.errors.proximaTooBig', { max: VENCIMIENTOS_HORIZONTE_DIAS }),
    (v: number) =>
      !isInt(form[tipo].inminenteDias) ||
      v >= form[tipo].inminenteDias ||
      t('vencimientos.umbrales.errors.proximaLessThanInminente'),
  ];
}

function onReset() {
  Object.assign(form, defaultUmbrales());
  formRef.value?.resetValidation();
}

async function onSubmit() {
  const isValid = await formRef.value?.validate();
  if (!isValid) return;
  store.setUmbrales(cloneUmbrales(form));
  $q.notify({ type: 'positive', color: 'teal-9', message: t('vencimientos.umbrales.saved') });
  visible.value = false;
}
</script>
