<template>
  <q-layout>
    <q-page-container>
      <AdminPageWrapper>
        <LanguageSwitcher />
        <GlassCard class="animate__fadeIn q-pa-sm" style="width: 100%; max-width: 400px">
          <q-card-section class="text-center q-pb-none">
            <q-icon name="lock_reset" size="48px" color="teal-9" class="animate__pulse" />
            <div class="text-h5 text-weight-bolder text-teal-10 font-outfit q-mt-sm">
              {{ t('auth.forgotPassword.title') }}
            </div>
            <div class="text-subtitle2 text-grey-7">
              {{ t('auth.forgotPassword.subtitle') }}
            </div>
          </q-card-section>

          <q-card-section>
            <q-form class="q-gutter-y-md" @submit.prevent="onSubmit">
              <q-input
                v-model="email"
                outlined
                dense
                class="elegant-input"
                type="email"
                :label="t('auth.forgotPassword.emailLabel')"
                autocomplete="username"
                :rules="emailRules"
                lazy-rules
              />

              <q-btn
                type="submit"
                unelevated
                color="primary"
                class="elegant-btn full-width"
                no-caps
                :label="t('auth.forgotPassword.submitButton')"
                :loading="loading"
              />

              <div class="text-center">
                <router-link class="text-caption text-teal-8" to="/login">
                  {{ t('auth.forgotPassword.backToLoginLink') }}
                </router-link>
              </div>
            </q-form>
          </q-card-section>
        </GlassCard>
      </AdminPageWrapper>
    </q-page-container>
  </q-layout>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import { useQuasar } from 'quasar';
import { useI18n } from 'vue-i18n';
import { api } from '@/boot/axios';
import { getApiErrorMessage } from '@/utils/api-error';
import AdminPageWrapper from '@/components/common/AdminPageWrapper.vue';
import GlassCard from '@/components/common/GlassCard.vue';
import LanguageSwitcher from '@/components/common/LanguageSwitcher.vue';

const $q = useQuasar();
const { t } = useI18n();

const email = ref('');
const loading = ref(false);

const emailRules = [
  (val: string) => !!val || t('auth.forgotPassword.emailRequired'),
  (val: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(val) || t('auth.forgotPassword.emailInvalid'),
];

async function onSubmit() {
  loading.value = true;
  try {
    const response = await api.post<{ message: string }>('/forgot-password', {
      email: email.value,
    });
    $q.notify({
      type: 'positive',
      color: 'teal-9',
      message: response.data.message,
    });
  } catch (error) {
    $q.notify({
      type: 'negative',
      color: 'red-9',
      message: getApiErrorMessage(error, t('auth.forgotPassword.requestError')),
    });
  } finally {
    loading.value = false;
  }
}
</script>
