<template>
  <GlassCard class="q-pa-md">
    <div class="text-h6 font-outfit text-teal-10 q-mb-md row items-center no-wrap">
      <q-icon name="search" size="28px" color="teal-7" class="q-mr-sm" />
      {{ t('home.search.title') }}
    </div>

    <div class="row q-col-gutter-md items-start">
      <div class="col-12 col-sm">
        <q-input
          v-model="referencia"
          outlined
          dense
          class="elegant-input home-search-input"
          :label="t('home.search.fieldLabel')"
          :placeholder="t('home.search.placeholder')"
          :error="errorMessage !== ''"
          :error-message="errorMessage"
          :disable="loading"
          @update:model-value="errorMessage = ''"
          @keyup.enter="onSearch"
        />
      </div>
      <div class="col-12 col-sm-auto">
        <q-btn
          no-caps
          color="teal-7"
          icon="search"
          class="elegant-btn full-width"
          :label="t('home.search.button')"
          :loading="loading"
          :disable="!canSearch"
          @click="onSearch"
        />
      </div>
    </div>
  </GlassCard>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue';
import { useI18n } from 'vue-i18n';
import { useRouter } from 'vue-router';
import GlassCard from '@/components/common/GlassCard.vue';
import { useAuthStore } from '@/stores/auth';
import { useElemsInventarioStore } from '@/stores/elemsInventario';
import { getApiErrorMessage } from '@/utils/api-error';

const TIPO_PATHS = { 1: 'vehiculos', 2: 'maquinaria', 3: 'epis' } as const;

const { t } = useI18n();
const router = useRouter();
const auth = useAuthStore();
const elemsStore = useElemsInventarioStore();

const referencia = ref('');
const loading = ref(false);
const errorMessage = ref('');

const canSearch = computed(() => referencia.value.trim() !== '' && !loading.value);

async function onSearch() {
  if (!canSearch.value) return;
  const searched = referencia.value.trim();
  loading.value = true;
  errorMessage.value = '';
  try {
    const match = await elemsStore.findElemByReferencia(searched);
    if (!match) {
      errorMessage.value = t('home.search.notFound', { referencia: searched });
      return;
    }
    if (!auth.hasPermission('elementos_inventario.editar')) {
      errorMessage.value = t('home.search.noPermission');
      return;
    }
    referencia.value = '';
    await router.push(`/inventario/${TIPO_PATHS[match.tipoId]}/${match.id}/editar`);
  } catch (error) {
    errorMessage.value = getApiErrorMessage(error, t('home.search.error'));
  } finally {
    loading.value = false;
  }
}
</script>

<style scoped>
.home-search-input :deep(.q-field__messages) {
  color: #b71c1c; /* red-9 */
}
</style>
