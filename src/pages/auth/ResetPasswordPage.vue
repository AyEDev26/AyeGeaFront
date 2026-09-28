<template>
  <q-layout>
    <q-page-container>
      <AdminPageWrapper>
        <LanguageSwitcher />
        <GlassCard class="animate__fadeIn q-pa-sm" style="width: 100%; max-width: 400px">
          <q-card-section class="text-center q-pb-none">
            <q-icon name="password" size="48px" color="teal-9" class="animate__pulse" />
            <div class="text-h5 text-weight-bolder text-teal-10 font-outfit q-mt-sm">
              {{ t('auth.resetPassword.title') }}
            </div>
            <div v-if="email" class="text-subtitle2 text-grey-7">
              {{ t('auth.resetPassword.subtitleFor', { email }) }}
            </div>
          </q-card-section>

          <q-card-section>
            <q-form class="q-gutter-y-md" @submit.prevent="onSubmit">
              <q-input
                v-model="password"
                outlined
                dense
                class="elegant-input"
                :type="showPassword ? 'text' : 'password'"
                :label="t('auth.resetPassword.newPasswordLabel')"
                autocomplete="new-password"
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

              <q-input
                v-model="passwordConfirmation"
                outlined
                dense
                class="elegant-input"
                :type="showPasswordConfirmation ? 'text' : 'password'"
                :label="t('auth.resetPassword.confirmPasswordLabel')"
                autocomplete="new-password"
                :rules="confirmationRules"
                lazy-rules
              >
                <template #append>
                  <q-icon
                    :name="showPasswordConfirmation ? 'visibility_off' : 'visibility'"
                    class="cursor-pointer"
                    @click="showPasswordConfirmation = !showPasswordConfirmation"
                  />
                </template>
              </q-input>

              <q-btn
                type="submit"
                unelevated
                color="primary"
                class="elegant-btn full-width"
                no-caps
                :label="t('auth.resetPassword.submitButton')"
                :loading="loading"
              />

              <div class="text-center">
                <router-link class="text-caption text-teal-8" to="/login">
                  {{ t('auth.resetPassword.backToLoginLink') }}
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
import { computed, ref } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { useQuasar } from 'quasar';
import { useI18n } from 'vue-i18n';
import { api } from '@/boot/axios';
import { getApiErrorMessage } from '@/utils/api-error';
import AdminPageWrapper from '@/components/common/AdminPageWrapper.vue';
import GlassCard from '@/components/common/GlassCard.vue';
import LanguageSwitcher from '@/components/common/LanguageSwitcher.vue';

const route = useRoute();
const router = useRouter();
const $q = useQuasar();
const { t } = useI18n();

const token = computed(() => (typeof route.query.token === 'string' ? route.query.token : ''));
const email = computed(() => (typeof route.query.email === 'string' ? route.query.email : ''));

const password = ref('');
const passwordConfirmation = ref('');
const showPassword = ref(false);
const showPasswordConfirmation = ref(false);
const loading = ref(false);

const passwordRules = [(val: string) => !!val || t('auth.resetPassword.passwordRequired')];
const confirmationRules = [
  (val: string) => !!val || t('auth.resetPassword.confirmationRequired'),
  (val: string) => val === password.value || t('auth.resetPassword.passwordMismatch'),
];

async function onSubmit() {
  loading.value = true;
  try {
    const response = await api.post<{ message: string }>('/reset-password', {
      token: token.value,
      email: email.value,
      password: password.value,
      password_confirmation: passwordConfirmation.value,
    });
    $q.notify({
      type: 'positive',
      color: 'teal-9',
      message: response.data.message,
    });
    await router.push('/login');
  } catch (error) {
    $q.notify({
      type: 'negative',
      color: 'red-9',
      position: 'center',
      message: getApiErrorMessage(error, t('auth.resetPassword.linkInvalidError')),
    });
  } finally {
    loading.value = false;
  }
}
</script>
