<template>
  <AdminPageWrapper>
    <GlassCard
      class="q-pa-md animate__fadeIn"
      style="width: 100%; max-width: 500px; margin: 0 auto"
    >
      <div class="text-h5 text-weight-bolder text-teal-10 font-outfit q-mb-md">
        {{ t('profile.title') }}
      </div>

      <template v-if="auth.user">
        <div class="text-subtitle1 text-weight-medium text-blue-grey-8 font-outfit q-mb-md">
          {{ auth.user.email }}
        </div>

        <AvatarUploader
          :avatar-url="auth.user.avatarUrl"
          :email="auth.user.email"
          :upload-fn="auth.uploadOwnAvatar"
          class="q-mb-xl"
        />

        <q-form ref="formRef" class="q-gutter-y-md" @submit.prevent="onSubmit">
          <q-input
            v-model="name"
            outlined
            dense
            class="elegant-input"
            :label="t('profile.nameLabel')"
            :rules="nameRules"
            lazy-rules
          />

          <q-input
            v-model="alias"
            outlined
            dense
            class="elegant-input"
            :label="t('profile.aliasLabel')"
            maxlength="20"
            :rules="aliasRules"
            lazy-rules
          />

          <q-input
            v-model="password"
            outlined
            dense
            class="elegant-input"
            :type="showPassword ? 'text' : 'password'"
            :label="t('profile.passwordLabel')"
            autocomplete="new-password"
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
            :label="t('profile.confirmPasswordLabel')"
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

          <div>
            <div class="text-caption text-grey-7">{{ t('profile.rolesLabel') }}</div>
            <div class="q-gutter-xs q-mt-xs">
              <q-chip
                v-for="role in auth.user.roles"
                :key="role"
                square
                dense
                color="teal-1"
                text-color="teal-10"
              >
                {{ role }}
              </q-chip>
            </div>
          </div>

          <div>
            <div class="text-caption text-grey-7">{{ t('profile.lastLoginLabel') }}</div>
            <div class="text-body2 text-grey-9">{{ formattedLastLogin }}</div>
          </div>

          <div class="row justify-end q-gutter-sm">
            <q-btn
              flat
              no-caps
              color="grey-7"
              class="px-lg"
              :label="t('common.cancel')"
              :disable="saving"
              @click="onCancel"
            />
            <q-btn
              unelevated
              no-caps
              color="primary"
              class="elegant-btn px-lg"
              :label="t('common.save')"
              :loading="saving"
              @click="onSubmit"
            />
          </div>
        </q-form>
      </template>
    </GlassCard>
  </AdminPageWrapper>
</template>

<script setup lang="ts">
import { computed, onMounted, ref } from 'vue';
import { useQuasar, type QForm } from 'quasar';
import { useI18n } from 'vue-i18n';
import { useRouter } from 'vue-router';
import { useAuthStore } from '@/stores/auth';
import { useLocaleStore } from '@/stores/locale';
import { getApiErrorMessage } from '@/utils/api-error';
import AdminPageWrapper from '@/components/common/AdminPageWrapper.vue';
import GlassCard from '@/components/common/GlassCard.vue';
import AvatarUploader from '@/components/common/AvatarUploader.vue';

const $q = useQuasar();
const { t } = useI18n();
const router = useRouter();
const auth = useAuthStore();
const localeStore = useLocaleStore();

const formRef = ref<QForm | null>(null);
const name = ref('');
const alias = ref('');
const password = ref('');
const passwordConfirmation = ref('');
const showPassword = ref(false);
const showPasswordConfirmation = ref(false);
const saving = ref(false);

const nameRules = [(val: string) => !!val || t('profile.nameRequired')];
const aliasRules = [(val: string) => !val || val.length <= 20 || t('profile.aliasTooLong')];
const confirmationRules = [
  (val: string) => !password.value || !!val || t('profile.confirmationRequired'),
  (val: string) => val === password.value || t('profile.passwordMismatch'),
];

const formattedLastLogin = computed(() => {
  const value = auth.user?.lastLoginAt;
  if (!value) {
    return t('profile.lastLoginNever');
  }
  return new Intl.DateTimeFormat(localeStore.current, {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(new Date(value));
});

function resetForm() {
  if (auth.user) {
    name.value = auth.user.name;
    alias.value = auth.user.alias ?? '';
  }
  password.value = '';
  passwordConfirmation.value = '';
  showPassword.value = false;
  showPasswordConfirmation.value = false;
  formRef.value?.resetValidation();
}

onMounted(resetForm);

function onCancel() {
  resetForm();
  if (window.history.state?.back) {
    router.back();
  } else {
    void router.push('/');
  }
}

async function onSubmit() {
  const isValid = await formRef.value?.validate();
  if (!isValid || !auth.user) {
    return;
  }

  const payload: Parameters<typeof auth.updateProfile>[0] = {};
  if (name.value !== auth.user.name) {
    payload.name = name.value;
  }
  if (alias.value.trim()) {
    payload.alias = alias.value.trim();
  }
  if (password.value) {
    payload.password = password.value;
    payload.password_confirmation = passwordConfirmation.value;
  }

  saving.value = true;
  try {
    await auth.updateProfile(payload);
    $q.notify({ type: 'positive', color: 'teal-9', message: t('profile.updateSuccess') });
    resetForm();
  } catch (error) {
    $q.notify({
      type: 'negative',
      color: 'red-9',
      message: getApiErrorMessage(error, t('profile.updateError')),
    });
  } finally {
    saving.value = false;
  }
}
</script>
