<template>
  <AdminPageWrapper align-top>
    <GlassCard class="q-pa-md animate__fadeIn">
      <div class="text-h5 text-weight-bolder text-teal-10 font-outfit q-mb-md">
        {{ t('admin.roles.title') }}
      </div>

      <q-select
        v-model="selectedRoleId"
        outlined
        dense
        emit-value
        map-options
        class="elegant-input role-select"
        :label="t('admin.roles.roleSelectLabel')"
        :options="roleOptions"
        :loading="rolesStore.loading"
      />

      <q-separator color="teal-4" class="q-my-md" />

      <template v-if="selectedRole">
        <q-tabs
          v-model="activeTab"
          dense
          align="left"
          color="teal"
          active-color="teal-9"
          indicator-color="teal-9"
          class="q-mt-md"
        >
          <q-tab v-for="group in permissionGroups" :key="group.key" :name="group.key" :label="group.label" />
        </q-tabs>

        <q-tab-panels v-model="activeTab">
          <q-tab-panel v-for="group in permissionGroups" :key="group.key" :name="group.key">
            <q-item tag="label" v-ripple class="select-all-item rounded-borders">
              <q-item-section avatar>
                <q-checkbox
                  :model-value="groupCheckboxValue(group)"
                  :indeterminate-value="null"
                  color="primary"
                  :disable="!auth.hasPermission('usuarios.editar') || saving"
                  @update:model-value="(val: boolean | null) => onToggleGroup(group, Boolean(val))"
                />
              </q-item-section>
              <q-item-section class="text-teal-9 text-weight-bold">{{
                t('admin.roles.selectAllLabel')
              }}</q-item-section>
            </q-item>

            <q-list separator class="permission-group-items">
              <q-item
                v-for="permission in group.permissions"
                :key="permission.id"
                tag="label"
                v-ripple
              >
                <q-item-section avatar>
                  <q-checkbox
                    :model-value="isChecked(permission.name)"
                    color="primary"
                    :disable="!auth.hasPermission('usuarios.editar') || saving"
                    @update:model-value="(val: boolean) => onToggle(permission.name, val)"
                  />
                </q-item-section>
                <q-item-section>{{ permission.name }}</q-item-section>
              </q-item>
            </q-list>
          </q-tab-panel>
        </q-tab-panels>
      </template>

      <div v-else class="text-grey-7 q-mt-md">
        {{ t('admin.roles.emptySelectionMessage') }}
      </div>

      <div v-if="selectedRole" class="row justify-end q-gutter-sm q-mt-md">
        <q-btn
          flat
          no-caps
          color="grey-8"
          class="px-lg"
          :label="t('admin.roles.exitButton')"
          :disable="saving"
          @click="onExit"
        />
        <q-btn
          v-if="auth.hasPermission('usuarios.editar')"
          unelevated
          no-caps
          color="primary"
          class="elegant-btn px-lg"
          :label="t('admin.roles.saveButton')"
          :loading="saving"
          :disable="!isDirty"
          @click="onSaveConfirm"
        />
      </div>
    </GlassCard>
  </AdminPageWrapper>
</template>

<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue';
import { useQuasar } from 'quasar';
import { useI18n } from 'vue-i18n';
import { useRouter } from 'vue-router';
import { useRolesStore, type PermissionItem } from '@/stores/roles';
import { useAuthStore } from '@/stores/auth';
import { getApiErrorMessage } from '@/utils/api-error';
import AdminPageWrapper from '@/components/common/AdminPageWrapper.vue';
import GlassCard from '@/components/common/GlassCard.vue';

const $q = useQuasar();
const { t } = useI18n();
const router = useRouter();
const rolesStore = useRolesStore();
const auth = useAuthStore();

const selectedRoleId = ref<number | null>(null);
const activeTab = ref<string | null>(null);
const originalPermissions = ref<string[]>([]);
const localPermissions = ref<string[]>([]);
const saving = ref(false);

const roleOptions = computed(() =>
  rolesStore.roles.map((role) => ({ label: role.name, value: role.id })),
);
const selectedRole = computed(
  () => rolesStore.roles.find((role) => role.id === selectedRoleId.value) ?? null,
);

const UNCATEGORIZED_KEY = '__uncategorized__';

interface PermissionGroup {
  key: string;
  label: string;
  permissions: PermissionItem[];
}

const permissionGroups = computed<PermissionGroup[]>(() => {
  const groups = new Map<string, PermissionItem[]>();
  for (const permission of rolesStore.permissions) {
    const key =
      permission.group && permission.group.trim() !== '' ? permission.group : UNCATEGORIZED_KEY;
    const bucket = groups.get(key);
    if (bucket) {
      bucket.push(permission);
    } else {
      groups.set(key, [permission]);
    }
  }

  const named: PermissionGroup[] = [];
  let uncategorized: PermissionGroup | null = null;
  for (const [key, permissions] of groups) {
    if (key === UNCATEGORIZED_KEY) {
      uncategorized = { key, label: t('admin.roles.uncategorizedGroup'), permissions };
    } else {
      named.push({ key, label: key, permissions });
    }
  }
  named.sort((a, b) => a.label.localeCompare(b.label));

  return uncategorized ? [...named, uncategorized] : named;
});

const isDirty = computed(() => {
  if (localPermissions.value.length !== originalPermissions.value.length) {
    return true;
  }
  return localPermissions.value.some((name) => !originalPermissions.value.includes(name));
});

function notifyError(error: unknown, fallback: string) {
  $q.notify({ type: 'negative', color: 'red-9', message: getApiErrorMessage(error, fallback) });
}

onMounted(async () => {
  try {
    await Promise.all([rolesStore.fetchRoles(), rolesStore.fetchPermissions()]);
  } catch (error) {
    notifyError(error, t('admin.roles.fetchError'));
  }
});

watch(selectedRole, (role) => {
  originalPermissions.value = role ? [...role.permissions] : [];
  localPermissions.value = role ? [...role.permissions] : [];
  activeTab.value = permissionGroups.value[0]?.key ?? null;
});

function isChecked(name: string): boolean {
  return localPermissions.value.includes(name);
}

function onToggle(name: string, checked: boolean) {
  if (checked) {
    localPermissions.value = [...localPermissions.value, name];
  } else {
    localPermissions.value = localPermissions.value.filter((p) => p !== name);
  }
}

function groupCheckboxValue(group: PermissionGroup): boolean | null {
  const checkedCount = group.permissions.filter((p) => isChecked(p.name)).length;
  if (checkedCount === 0) {
    return false;
  }
  if (checkedCount === group.permissions.length) {
    return true;
  }
  return null;
}

function onToggleGroup(group: PermissionGroup, checked: boolean) {
  const names = group.permissions.map((p) => p.name);
  if (checked) {
    const toAdd = names.filter((name) => !localPermissions.value.includes(name));
    localPermissions.value = [...localPermissions.value, ...toAdd];
  } else {
    localPermissions.value = localPermissions.value.filter((name) => !names.includes(name));
  }
}

function onSaveConfirm() {
  $q.dialog({
    title: t('admin.roles.saveDialogTitle'),
    message: t('admin.roles.saveDialogMessage'),
    cancel: true,
    persistent: true,
  }).onOk(() => {
    void onSave();
  });
}

async function onSave() {
  if (selectedRoleId.value === null) {
    return;
  }
  const roleId = selectedRoleId.value;
  const added = localPermissions.value.filter((name) => !originalPermissions.value.includes(name));
  const removed = originalPermissions.value.filter(
    (name) => !localPermissions.value.includes(name),
  );

  saving.value = true;
  try {
    if (added.length > 0) {
      await rolesStore.assignPermissions(roleId, added);
    }
    if (removed.length > 0) {
      await rolesStore.removePermissions(roleId, removed);
    }
    originalPermissions.value = [...localPermissions.value];
    $q.notify({ type: 'positive', color: 'teal-9', message: t('admin.roles.saveSuccess') });
  } catch (error) {
    notifyError(error, t('admin.roles.saveError'));
  } finally {
    saving.value = false;
  }
}

function onExit() {
  localPermissions.value = [...originalPermissions.value];
  if (window.history.state?.back) {
    router.back();
  } else {
    void router.push('/');
  }
}
</script>

<style scoped>
.role-select {
  max-width: 400px;
}

.select-all-item {
  background-color: #e0f2f1;
  margin-bottom: 8px;
}

.permission-group-items {
  padding-left: 24px;
}
</style>
