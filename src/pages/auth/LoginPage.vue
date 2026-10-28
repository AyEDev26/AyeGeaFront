<template>
  <q-layout>
    <q-page-container>
      <q-page class="login-page flex flex-center">
        <LanguageSwitcher />

        <div class="login-content">
          <div class="login-card q-pa-sm">
            <div class="login-avatar flex flex-center">
              <q-icon name="person" size="52px" color="white" />
            </div>

            <q-card-section class="login-header text-center q-pb-none">
              <h1 class="login-title font-outfit">AyeGea</h1>
              <div class="login-subtitle font-outfit">{{ t('auth.login.title') }}</div>
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
                  <router-link class="login-link text-caption" to="/forgot-password">
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
          </div>

          <div class="login-powered text-center text-caption q-mt-md">
            {{ t('auth.login.poweredBy') }}
          </div>
          <div class="login-build text-center text-caption q-mt-md">{{ appVersionLabel }}</div>
        </div>
      </q-page>
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
import { appVersionLabel } from '@/utils/build-info';
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
.login-page {
  --login-accent: #44809f;
  --login-card-bg: rgb(255 255 255 / 0.35);
  --login-card-border: rgb(255 255 255 / 0.55);
  --login-text: #ffffff;
  --login-build-text: #ffffff;

  min-height: 100vh;
  padding: 16px;
  background:
    radial-gradient(circle at 8% 6%, #b8a62a 0%, transparent 38%),
    radial-gradient(circle at 6% 62%, #1b6f7a 0%, transparent 45%),
    radial-gradient(circle at 94% 8%, #6a6d80 0%, transparent 42%),
    radial-gradient(circle at 92% 94%, #7a4a69 0%, transparent 45%), #1f3a4a;
}

.login-content {
  width: 100%;
  max-width: 400px;
  position: relative;
  z-index: 10;
}

.login-card {
  position: relative;
  margin-top: 44px;
  width: 100%;
  background: var(--login-card-bg);
  border: 1px solid var(--login-card-border);
  border-radius: 24px;
  box-shadow: 0 12px 40px rgb(0 0 0 / 0.15);
  -webkit-backdrop-filter: blur(16px);
  backdrop-filter: blur(16px);
}

.login-avatar {
  position: absolute;
  top: -44px;
  left: 50%;
  width: 88px;
  height: 88px;
  transform: translateX(-50%);
  border-radius: 50%;
  background: var(--login-accent);
  box-shadow: 0 6px 20px rgb(0 0 0 / 0.2);
}

.login-header {
  padding-top: 56px;
}

.login-title {
  margin: 0;
  font-size: 2rem;
  font-weight: 500;
  line-height: 1.2;
  color: var(--login-text);
}

.login-subtitle {
  margin-top: 4px;
  font-size: 1.1rem;
  font-weight: 300;
  color: var(--login-text);
}

.login-card :deep(.q-field__native),
.login-card :deep(.q-field__input) {
  font-size: 1.15rem;
  font-weight: 700;
}

.login-link {
  color: var(--login-text);
  text-decoration: underline;
}

.login-powered,
.login-build {
  color: var(--login-build-text);
  text-shadow: 0 1px 3px rgb(0 0 0 / 0.45);
}
</style>
