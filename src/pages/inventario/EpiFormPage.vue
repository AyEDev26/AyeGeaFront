<template>
  <InventarioForm :key="route.fullPath" :tipo-id="3" />
</template>

<script setup lang="ts">
import { useRoute } from 'vue-router';
import InventarioForm from '@/components/inventario/InventarioForm.vue';

const route = useRoute();
</script>
