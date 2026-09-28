<template>
  <q-dialog v-model="visible" persistent @hide="onHide">
    <GlassCard style="width: 100%; min-width: 320px; max-width: 500px">
      <q-card-section class="row items-center q-pb-none">
        <div class="text-h6 text-teal-10 font-outfit">
          {{ isEditMode ? t('admin.userForm.editTitle') : t('admin.userForm.createTitle') }}
        </div>
        <q-space />
        <q-btn icon="close" flat round dense v-close-popup />
      </q-card-section>

      <q-card-section>
        <q-form ref="formRef" class="q-gutter-y-md" @submit.prevent="onSubmit">
          <AvatarUploader
            v-if="isEditMode && props.user"
            :avatar-url="avatarUrl"
            :email="props.user.email"
            :disabled="!auth.hasPermission('usuarios.editar')"
            :upload-fn="uploadAvatarFn"
          />

          <q-input
            v-model="name"
            outlined
            dense
            class="elegant-input"
            :label="t('admin.userForm.nameLabel')"
            :rules="nameRules"
            lazy-rules
          />

          <q-input
            v-model="email"
            outlined
            dense
            class="elegant-input"
            type="email"
            :label="t('admin.userForm.emailLabel')"
            autocomplete="off"
            :rules="emailRules"
            lazy-rules
          />

          <q-input
            v-model="alias"
            outlined
            dense
            class="elegant-input"
            :label="t('admin.userForm.aliasLabel')"
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
            :label="
              isEditMode
                ? t('admin.userForm.passwordLabelEdit')
                : t('admin.userForm.passwordLabelCreate')
            "
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
            :label="t('admin.userForm.confirmPasswordLabel')"
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

          <q-field
            borderless
            dense
            class="elegant-input roles-field"
            :label="t('admin.userForm.rolesLabel')"
            stack-label
            :model-value="selectedRoles"
            :rules="rolesRules"
            lazy-rules
          >
            <template #control>
              <q-option-group
                v-model="selectedRoles"
                :options="roleOptions"
                type="checkbox"
                color="primary"
                inline
              />
            </template>
          </q-field>
        </q-form>
      </q-card-section>

      <q-card-actions align="right">
        <q-btn flat no-caps color="grey-7" :label="t('common.cancel')" v-close-popup />
        <q-btn
          unelevated
          no-caps
          color="primary"
          class="elegant-btn px-lg"
          :label="t('common.save')"
          :loading="saving"
          @click="onSubmit"
        />
      </q-card-actions>
    </GlassCard>
  </q-dialog>
</template>

<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue';
import { useQuasar, type QForm } from 'quasar';
import { useI18n } from 'vue-i18n';
import { useUsersStore, type AdminUser } from '@/stores/users';
import { useRolesStore } from '@/stores/roles';
import { useAuthStore } from '@/stores/auth';
import { getApiErrorMessage } from '@/utils/api-error';
import GlassCard from '@/components/common/GlassCard.vue';
import AvatarUploader from '@/components/common/AvatarUploader.vue';

const props = defineProps<{
  user: AdminUser | null;
}>();

const emit = defineEmits<{
  saved: [];
}>();

const visible = defineModel<boolean>({ required: true });

const $q = useQuasar();
const { t } = useI18n();
const usersStore = useUsersStore();
const rolesStore = useRolesStore();
const auth = useAuthStore();

const isEditMode = computed(() => props.user !== null);
const roleOptions = computed(() =>
  rolesStore.roles.map((role) => ({ label: role.name, value: role.name })),
);
const avatarUrl = computed(() => {
  const url = props.user?.avatarUrl ?? null;
  console.log('[UserFormDialog] avatar obtenido, url:', url);
  return url;
});

const formRef = ref<QForm | null>(null);
const name = ref('');
const email = ref('');
const alias = ref('');
const password = ref('');
const passwordConfirmation = ref('');
const selectedRoles = ref<string[]>([]);
const showPassword = ref(false);
const showPasswordConfirmation = ref(false);
const saving = ref(false);

const nameRules = [(val: string) => !!val || t('admin.userForm.nameRequired')];
const emailRules = [
  (val: string) => !!val || t('admin.userForm.emailRequired'),
  (val: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(val) || t('admin.userForm.emailInvalid'),
];
const aliasRules = [
  (val: string) => !val || val.length <= 20 || t('admin.userForm.aliasTooLong'),
];
const passwordRules = [
  (val: string) => (!isEditMode.value ? !!val || t('admin.userForm.passwordRequired') : true),
];
const confirmationRules = [
  (val: string) => !password.value || !!val || t('admin.userForm.confirmationRequired'),
  (val: string) => val === password.value || t('admin.userForm.passwordMismatch'),
];
const rolesRules = [
  (val: string[]) => (val && val.length > 0) || t('admin.userForm.rolesRequired'),
];

function resetForm() {
  if (props.user) {
    name.value = props.user.name;
    email.value = props.user.email;
    alias.value = props.user.alias ?? '';
    selectedRoles.value = [...props.user.roles];
  } else {
    name.value = '';
    email.value = '';
    alias.value = '';
    selectedRoles.value = [];
  }
  password.value = '';
  passwordConfirmation.value = '';
  showPassword.value = false;
  showPasswordConfirmation.value = false;
  formRef.value?.resetValidation();
}

watch(visible, (isVisible) => {
  if (isVisible) {
    resetForm();
  }
});

onMounted(() => {
  void rolesStore.fetchRoles();
});

async function uploadAvatarFn(file: File) {
  if (!props.user) {
    return;
  }
  await usersStore.uploadAvatar(props.user.id, file);
  if (props.user.id === auth.user?.id) {
    await auth.fetchMe();
  }
}

function onHide() {
  saving.value = false;
}

async function onSubmit() {
  const isValid = await formRef.value?.validate();
  if (!isValid) {
    return;
  }

  saving.value = true;
  try {
    if (isEditMode.value && props.user) {
      await usersStore.updateUser(props.user.id, {
        name: name.value,
        email: email.value,
        roles: selectedRoles.value,
        ...(alias.value.trim() ? { alias: alias.value.trim() } : {}),
        ...(password.value
          ? { password: password.value, password_confirmation: passwordConfirmation.value }
          : {}),
      });
      $q.notify({ type: 'positive', color: 'teal-9', message: t('admin.userForm.userUpdated') });
    } else {
      await usersStore.createUser({
        name: name.value,
        email: email.value,
        password: password.value,
        password_confirmation: passwordConfirmation.value,
        roles: selectedRoles.value,
        ...(alias.value.trim() ? { alias: alias.value.trim() } : {}),
      });
      $q.notify({ type: 'positive', color: 'teal-9', message: t('admin.userForm.userCreated') });
    }
    emit('saved');
  } catch (error) {
    $q.notify({
      type: 'negative',
      color: 'red-9',
      message: getApiErrorMessage(error, t('admin.userForm.saveError')),
    });
  } finally {
    saving.value = false;
  }
}
</script>
