<template>
  <InventarioTabs v-if="elemId !== null" :key="route.path" :tipo-id="1" :id="elemId">
    <template #informacion>
      <InventarioForm embedded :tipo-id="1" />
    </template>
  </InventarioTabs>
  <InventarioForm v-else :key="route.path" :tipo-id="1" />
</template>

<script setup lang="ts">
import { computed } from 'vue';
import { useRoute } from 'vue-router';
import InventarioForm from '@/components/inventario/InventarioForm.vue';
import InventarioTabs from '@/components/inventario/InventarioTabs.vue';

const route = useRoute();

// Con :id (edición) se muestran las carpetas; sin él (alta) solo el formulario.
const elemId = computed(() => {
  const raw = route.params.id;
  const id = Number(Array.isArray(raw) ? raw[0] : raw);
  return Number.isInteger(id) && id > 0 ? id : null;
});
</script>
