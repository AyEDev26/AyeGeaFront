<template>
  <q-page
    class="app-gradient-bg admin-page-wrapper row"
    :class="alignTop ? 'items-start justify-center q-pt-xl' : 'flex-center'"
  >
    <div class="shape shape-1"></div>
    <div class="shape shape-2"></div>
    <div class="shape shape-3"></div>

    <div
      class="admin-page-content"
      :class="wide ? 'col-12 col-md-11' : 'col-12 col-md-10 col-lg-8'"
    >
      <slot />
    </div>
  </q-page>
</template>

<script setup lang="ts">
withDefaults(
  defineProps<{
    wide?: boolean;
    alignTop?: boolean;
  }>(),
  {
    wide: false,
    alignTop: false,
  },
);
</script>

<style scoped>
.admin-page-wrapper {
  min-height: 100vh;
}

.admin-page-content {
  position: relative;
  z-index: 10;
}
</style>
