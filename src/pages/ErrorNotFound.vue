<template>
  <q-layout>
    <q-page-container>
      <AdminPageWrapper>
        <GlassCard class="q-pa-xl text-center animate__fadeIn">
          <div class="text-teal-10 font-outfit" style="font-size: 20vh; font-weight: 700">404</div>

          <div class="text-h4 text-grey-8 q-mb-lg">{{ t('errors.notFound.message') }}</div>

          <q-btn
            unelevated
            color="primary"
            class="elegant-btn"
            no-caps
            to="/"
            :label="t('errors.notFound.goHomeButton')"
          />
        </GlassCard>
      </AdminPageWrapper>
    </q-page-container>
  </q-layout>
</template>

<script setup lang="ts">
import { useI18n } from 'vue-i18n';
import AdminPageWrapper from '@/components/common/AdminPageWrapper.vue';
import GlassCard from '@/components/common/GlassCard.vue';

const { t } = useI18n();
</script>
