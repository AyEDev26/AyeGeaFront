<template>
  <q-layout>
    <q-page-container>
      <AdminPageWrapper>
        <LanguageSwitcher />
        <GlassCard class="animate__fadeIn q-pa-sm" style="width: 100%; max-width: 400px">
          <q-card-section class="text-center q-pb-none">
            <q-icon name="mark_email_read" size="48px" color="teal-9" class="animate__pulse" />
            <div class="text-h5 text-weight-bolder text-teal-10 font-outfit q-mt-sm">
              {{ t('auth.twoFactor.title') }}
            </div>
            <div class="text-subtitle2 text-grey-7">
              {{ t('auth.twoFactor.subtitleFor', { email: auth.twoFactorPendingEmail }) }}
            </div>
          </q-card-section>

          <q-card-section>
            <q-form class="q-gutter-y-md" @submit.prevent="onVerify">
              <q-input
                v-model="code"
                outlined
                dense
                class="elegant-input"
                :label="t('auth.twoFactor.codeLabel')"
                autocomplete="one-time-code"
                :rules="codeRules"
                lazy-rules
              />

              <q-btn
                type="submit"
                unelevated
                color="primary"
                class="elegant-btn full-width"
                no-caps
                :label="t('auth.twoFactor.submitButton')"
                :loading="verifying"
              />

              <q-btn
                flat
                color="teal-8"
                class="full-width"
                no-caps
                :label="resendLabel"
                :disable="cooldown > 0 || resending"
                :loading="resending"
                @click="onResend"
              />
            </q-form>
          </q-card-section>
        </GlassCard>
      </AdminPageWrapper>
    </q-page-container>
  </q-layout>
</template>

<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref } from 'vue';
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

const code = ref('');
const verifying = ref(false);
const resending = ref(false);
const cooldown = ref(0);
let cooldownTimer: number | undefined;

const codeRules = [(val: string) => !!val || t('auth.twoFactor.codeRequired')];

const resendLabel = computed(() =>
  cooldown.value > 0
    ? t('auth.twoFactor.resendButtonCooldown', { seconds: cooldown.value })
    : t('auth.twoFactor.resendButton'),
);

onMounted(() => {
  if (!auth.isTwoFactorPending) {
    void router.replace('/login');
  }
});

onBeforeUnmount(() => {
  if (cooldownTimer !== undefined) {
    clearInterval(cooldownTimer);
  }
});

function startCooldown() {
  cooldown.value = 30;
  cooldownTimer = window.setInterval(() => {
    cooldown.value -= 1;
    if (cooldown.value <= 0) {
      cooldown.value = 0;
      if (cooldownTimer !== undefined) {
        clearInterval(cooldownTimer);
      }
    }
  }, 1000);
}

async function onVerify() {
  verifying.value = true;
  try {
    await auth.verifyTwoFactor(code.value);
    const redirect = typeof route.query.redirect === 'string' ? route.query.redirect : '/';
    await router.push(redirect);
  } catch (error) {
    $q.notify({
      type: 'negative',
      color: 'red-9',
      position: 'center',
      message: getApiErrorMessage(error, t('auth.twoFactor.verifyError')),
    });
  } finally {
    verifying.value = false;
  }
}

async function onResend() {
  resending.value = true;
  try {
    await auth.resendTwoFactor();
    startCooldown();
    $q.notify({
      type: 'info',
      color: 'teal-8',
      message: t('auth.twoFactor.resendSuccess'),
    });
  } catch (error) {
    $q.notify({
      type: 'negative',
      color: 'red-9',
      message: getApiErrorMessage(error, t('auth.twoFactor.resendError')),
    });
  } finally {
    resending.value = false;
  }
}
</script>
