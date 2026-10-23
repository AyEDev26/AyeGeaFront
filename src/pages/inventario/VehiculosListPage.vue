<template>
  <InventarioListTable :tipo-id="1" :title="t('inventario.vehiculos.title')" />
</template>

<script setup lang="ts">
import { useI18n } from 'vue-i18n';
import InventarioListTable from '@/components/inventario/InventarioListTable.vue';

const { t } = useI18n();
</script>
