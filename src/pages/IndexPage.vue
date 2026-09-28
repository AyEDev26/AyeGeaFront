<template>
  <AdminPageWrapper align-top>
    <GlassCard class="overflow-hidden animate__fadeIn">
      <q-img :src="heroImageUrl" ratio="2.5">
        <template #error>
          <div class="absolute-full flex flex-center bg-grey-3">
            <q-icon name="image" size="48px" color="grey-6" />
          </div>
        </template>
      </q-img>
      <div class="q-pa-lg text-center">
        <div class="text-h4 font-outfit text-teal-10">{{ t('home.hero.title') }}</div>
        <div class="text-body1 q-mt-sm">{{ t('home.hero.subtitle') }}</div>
      </div>
    </GlassCard>

    <q-separator class="q-my-lg" />

    <div class="text-h6 font-outfit text-teal-10 q-mb-md">{{ t('home.sectionTitle') }}</div>

    <div class="row q-col-gutter-md">
      <div v-for="feature in features" :key="feature.key" class="col-12 col-sm-6 col-md-4">
        <GlassCard class="feature-card overflow-hidden">
          <q-img :src="featureImageUrl(feature.key)" ratio="1.5">
            <template #error>
              <div class="absolute-full flex flex-center bg-grey-3">
                <q-icon name="image" size="48px" color="grey-6" />
              </div>
            </template>
          </q-img>
          <div class="q-pa-md">
            <q-icon :name="feature.icon" size="28px" color="teal-7" class="q-mb-sm" />
            <div class="text-subtitle1 font-outfit text-teal-10">
              {{ t(`home.features.${feature.key}.title`) }}
            </div>
            <div class="text-body2 q-mt-xs">
              {{ t(`home.features.${feature.key}.description`) }}
            </div>
          </div>
        </GlassCard>
      </div>
    </div>
  </AdminPageWrapper>
</template>

<script setup lang="ts">
import { useI18n } from 'vue-i18n';
import AdminPageWrapper from '@/components/common/AdminPageWrapper.vue';
import GlassCard from '@/components/common/GlassCard.vue';
import heroImage from '@/assets/images/home/hero-gestion-activos.jpg';
import usersImage from '@/assets/images/home/feature-users.jpg';
import reportsImage from '@/assets/images/home/feature-reports.jpg';
import notificationsImage from '@/assets/images/home/feature-notifications.jpg';
import automationImage from '@/assets/images/home/feature-automation.jpg';
import integrationsImage from '@/assets/images/home/feature-integrations.jpg';
import securityImage from '@/assets/images/home/feature-security.jpg';

interface HomeFeatureCard {
  key: string;
  icon: string;
}

const { t } = useI18n();

const features: HomeFeatureCard[] = [
  { key: 'users', icon: 'people' },
  { key: 'reports', icon: 'insights' },
  { key: 'notifications', icon: 'notifications' },
  { key: 'automation', icon: 'bolt' },
  { key: 'integrations', icon: 'extension' },
  { key: 'security', icon: 'shield' },
];

const heroImageUrl = heroImage;

const featureImages: Record<string, string> = {
  users: usersImage,
  reports: reportsImage,
  notifications: notificationsImage,
  automation: automationImage,
  integrations: integrationsImage,
  security: securityImage,
};

function featureImageUrl(key: string): string {
  return featureImages[key] ?? '';
}
</script>

<style scoped>
.feature-card {
  transition:
    transform 0.3s ease,
    box-shadow 0.3s ease;
}

.feature-card:hover {
  transform: translateY(-4px);
  box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.2);
}
</style>
