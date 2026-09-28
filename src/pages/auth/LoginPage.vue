<template>
  <q-layout>
    <q-page-container>
      <AdminPageWrapper>
        <LanguageSwitcher />

        <GlassCard class="animate__fadeIn q-pa-sm login-card">
          <q-card-section class="text-center q-pb-none">
            <q-icon name="factory" size="48px" color="teal-9" class="animate__pulse" />
            <div class="text-h5 text-weight-bolder text-teal-10 font-outfit q-mt-sm">AyeCore</div>
            <div class="text-subtitle2 text-grey-7">{{ t('auth.login.subtitle') }}</div>
          </q-card-section>

          <q-card-section>
            <q-form class="q-gutter-y-md" @submit.prevent="onSubmit">
              <q-input
                v-model="email"
                outlined
                dense
                class="elegant-input"
                type="email"
                :label="t('auth.login.emailLabel')"
                autocomplete="username"
                :rules="emailRules"
                lazy-rules
              />

              <q-input
                v-model="password"
                outlined
                dense
                class="elegant-input"
                :type="showPassword ? 'text' : 'password'"
                :label="t('auth.login.passwordLabel')"
                autocomplete="current-password"
                :rules="passwordRules"
                lazy-rules
              >
                <template #append>
                  <q-icon
                    :name="showPassword ? 'visibility_off' : 'visibility'"
                    class="cursor-pointer"
                    @click="showPassword = !showPassword"
                  />
                </template>
              </q-input>

              <div class="text-right">
                <router-link class="text-caption text-teal-8" to="/forgot-password">
                  {{ t('auth.login.forgotPasswordLink') }}
                </router-link>
              </div>

              <q-btn
                type="submit"
                unelevated
                color="primary"
                class="elegant-btn full-width"
                no-caps
                :label="t('auth.login.submitButton')"
                :loading="loading"
              />
            </q-form>
          </q-card-section>
        </GlassCard>
      </AdminPageWrapper>
    </q-page-container>
  </q-layout>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { useQuasar } from 'quasar';
import { useI18n } from 'vue-i18n';
import { useAuthStore } from '@/stores/auth';
import { getApiErrorMessage } from '@/utils/api-error';
import AdminPageWrapper from '@/components/common/AdminPageWrapper.vue';
import GlassCard from '@/components/common/GlassCard.vue';
import LanguageSwitcher from '@/components/common/LanguageSwitcher.vue';

const route = useRoute();
const router = useRouter();
const $q = useQuasar();
const { t } = useI18n();
const auth = useAuthStore();

const email = ref('');
const password = ref('');
const showPassword = ref(false);
const loading = ref(false);

const emailRules = [
  (val: string) => !!val || t('auth.login.emailRequired'),
  (val: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(val) || t('auth.login.emailInvalid'),
];
const passwordRules = [(val: string) => !!val || t('auth.login.passwordRequired')];

async function onSubmit() {
  loading.value = true;
  try {
    await auth.login(email.value, password.value);

    if (auth.isTwoFactorPending) {
      await router.push('/2fa');
      return;
    }

    const redirect = typeof route.query.redirect === 'string' ? route.query.redirect : '/';
    await router.push(redirect);
  } catch (error) {
    $q.notify({
      type: 'negative',
      color: 'red-9',
      position: 'center',
      message: getApiErrorMessage(error, t('auth.login.loginError')),
    });
  } finally {
    loading.value = false;
  }
}
</script>

<style scoped>
.login-card {
  width: 100%;
  margin: 0 auto;
}

@media (min-width: 768px) {
  .login-card {
    width: min(60vw, 400px);
  }
}
</style>
