<template>
  <div>
    <q-markup-table
      flat
      bordered
      dense
      class="elegant-table"
      :aria-label="t('inventario.carpetas.comingSoon')"
    >
      <thead>
        <tr>
          <th v-for="column in columns" :key="column" class="text-left">
            {{ t(column) }}
          </th>
        </tr>
      </thead>
      <tbody>
        <tr v-for="row in rows" :key="row">
          <td v-for="column in columns" :key="column">
            <q-skeleton animation="none" type="text" width="80%" />
          </td>
        </tr>
      </tbody>
    </q-markup-table>

    <div class="column items-center q-mt-md text-center">
      <q-chip dense square color="teal-1" text-color="teal-10" icon="schedule">
        {{ t('inventario.carpetas.comingSoon') }}
      </q-chip>
      <div class="text-caption text-grey-7">
        {{ t('inventario.carpetas.comingSoonHint') }}
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { useI18n } from 'vue-i18n';

withDefaults(
  defineProps<{
    /** Claves i18n de las cabeceras provisionales. */
    columns: string[];
    /** Número de filas de skeleton. */
    rows?: number;
  }>(),
  { rows: 5 },
);

const { t } = useI18n();
</script>
