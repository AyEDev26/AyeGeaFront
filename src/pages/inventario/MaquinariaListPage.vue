<template>
  <InventarioListTable :tipo-id="2" :title="t('inventario.maquinaria.title')" />
</template>

<script setup lang="ts">
import { useI18n } from 'vue-i18n';
import InventarioListTable from '@/components/inventario/InventarioListTable.vue';

const { t } = useI18n();
</script>
