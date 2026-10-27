import { computed, onScopeDispose, ref, watch } from 'vue';

/**
 * Retrasa el estado de carga de una tabla para evitar que el texto
 * "Cargando..." parpadee cuando la respuesta llega rápido.
 * Devuelve atributos para usar con `v-bind` sobre `q-table`.
 */
export function useDelayedLoading(source: () => boolean, delay = 400) {
  const visible = ref(false);
  let timer: ReturnType<typeof setTimeout> | undefined;

  function clear() {
    if (timer !== undefined) {
      clearTimeout(timer);
      timer = undefined;
    }
  }

  watch(
    source,
    (isLoading) => {
      clear();
      if (isLoading) {
        timer = setTimeout(() => {
          visible.value = true;
        }, delay);
      } else {
        visible.value = false;
      }
    },
    { immediate: true },
  );

  onScopeDispose(clear);

  // Mientras se espera el retraso no se muestra tampoco el "sin datos".
  return computed(() => ({
    loading: visible.value,
    ...(source() && !visible.value ? { 'hide-no-data': true } : {}),
  }));
}
