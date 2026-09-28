<template>
  <div class="row items-center no-wrap q-gutter-md">
    <q-avatar
      size="64px"
      :style="!avatarUrl ? { backgroundColor: avatarColor, color: '#ffffff' } : undefined"
    >
      <img v-if="avatarUrl" :src="avatarUrl" style="object-fit: cover" />
      <template v-else>{{ avatarInitials }}</template>
    </q-avatar>
    <q-file
      v-if="!disabled"
      v-model="avatarFile"
      outlined
      dense
      class="col elegant-input"
      :label="t('common.avatarUploader.avatarLabel')"
      accept="image/jpeg,image/png,image/webp"
      :loading="uploading"
      :disable="uploading"
    >
      <template #prepend>
        <q-icon name="photo_camera" />
      </template>
    </q-file>
  </div>
</template>

<script setup lang="ts">
import { computed, ref, watch } from 'vue';
import { useQuasar } from 'quasar';
import { useI18n } from 'vue-i18n';
import { getApiErrorMessage } from '@/utils/api-error';
import { getAvatarColor, getAvatarInitials } from '@/utils/avatar';

const props = defineProps<{
  avatarUrl: string | null;
  email: string;
  disabled?: boolean;
  uploadFn: (file: File) => Promise<void>;
}>();

const emit = defineEmits<{
  uploaded: [];
}>();

const $q = useQuasar();
const { t } = useI18n();

const avatarInitials = computed(() => getAvatarInitials(props.email));
const avatarColor = computed(() => getAvatarColor(props.email));

const avatarFile = ref<File | null>(null);
const uploading = ref(false);

const ALLOWED_AVATAR_TYPES = ['image/jpeg', 'image/png', 'image/webp'];
const MAX_AVATAR_SIZE = 2 * 1024 * 1024;

async function handleAvatarFileChange(file: File | null) {
  if (!file) {
    return;
  }

  if (!ALLOWED_AVATAR_TYPES.includes(file.type)) {
    $q.notify({
      type: 'negative',
      color: 'red-9',
      message: t('common.avatarUploader.avatarInvalidType'),
    });
    avatarFile.value = null;
    return;
  }

  if (file.size > MAX_AVATAR_SIZE) {
    $q.notify({
      type: 'negative',
      color: 'red-9',
      message: t('common.avatarUploader.avatarTooLarge'),
    });
    avatarFile.value = null;
    return;
  }

  uploading.value = true;
  try {
    await props.uploadFn(file);
    $q.notify({
      type: 'positive',
      color: 'teal-9',
      message: t('common.avatarUploader.avatarUpdated'),
    });
    emit('uploaded');
  } catch (error) {
    $q.notify({
      type: 'negative',
      color: 'red-9',
      message: getApiErrorMessage(error, t('common.avatarUploader.avatarUploadError')),
    });
  } finally {
    uploading.value = false;
    avatarFile.value = null;
  }
}

watch(avatarFile, (file) => {
  void handleAvatarFileChange(file);
});
</script>
