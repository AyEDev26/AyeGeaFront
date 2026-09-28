<template>
  <AdminPageWrapper wide align-top>
    <GlassCard class="q-pa-md animate__fadeIn" style="min-height: 50vh">
      <div class="row items-center justify-between q-mb-md">
        <div class="text-h5 text-weight-bolder text-teal-10 font-outfit">
          {{ t('admin.users.title') }}
        </div>
        <q-btn
          v-if="auth.hasPermission('usuarios.crear')"
          unelevated
          no-caps
          color="primary"
          icon="person_add"
          :label="t('admin.users.newUserButton')"
          class="elegant-btn"
          @click="openCreateDialog"
        />
      </div>

      <div class="row q-col-gutter-sm q-mb-md items-start">
        <div class="col-12 col-md-2">
          <q-input
            v-model="filters.name"
            outlined
            dense
            clearable
            class="elegant-input"
            :label="t('admin.users.filters.nameLabel')"
          />
        </div>
        <div class="col-12 col-md-2">
          <q-input
            v-model="filters.email"
            outlined
            dense
            clearable
            class="elegant-input"
            :label="t('admin.users.filters.emailLabel')"
          />
        </div>
        <div class="col-12 col-md-2">
          <q-input
            v-model="filters.alias"
            outlined
            dense
            clearable
            class="elegant-input"
            :label="t('admin.users.filters.aliasLabel')"
          />
        </div>
        <div class="col-12 col-md-2">
          <q-select
            v-model="isActiveFilter"
            outlined
            dense
            emit-value
            map-options
            class="elegant-input"
            :label="t('admin.users.filters.isActiveLabel')"
            :options="isActiveOptions"
          />
        </div>
        <div class="col-12 col-md-2">
          <q-select
            v-model="roleFilter"
            outlined
            dense
            emit-value
            map-options
            class="elegant-input"
            :label="t('admin.users.filters.roleLabel')"
            :placeholder="t('admin.users.filters.rolePlaceholder')"
            :options="roleOptions"
          />
        </div>
        <div class="col-12 col-md-2 row q-gutter-x-sm items-center justify-end">
          <q-btn
            unelevated
            no-caps
            color="primary"
            icon="filter_alt"
            class="elegant-btn"
            :label="t('admin.users.filters.filterButton')"
            @click="onFilterClick"
          />
          <q-btn
            flat
            no-caps
            color="grey-8"
            :label="t('admin.users.filters.clearButton')"
            @click="onClearClick"
          />
        </div>
      </div>

      <q-table
        v-model:pagination="pagination"
        flat
        bordered
        dense
        class="elegant-table"
        :rows="sortedItems"
        :columns="columns"
        row-key="id"
        :rows-per-page-options="[10, 15, 25, 50]"
        :loading="usersStore.loading"
        @request="onRequest"
      >
        <template #body-cell-avatar="props">
          <q-td :props="props">
            <q-avatar
              size="32px"
              :style="
                !props.row.avatarUrl
                  ? { backgroundColor: getAvatarColor(props.row.email), color: '#ffffff' }
                  : undefined
              "
            >
              <img
                v-if="props.row.avatarUrl"
                :src="props.row.avatarUrl"
                style="object-fit: cover"
              />
              <template v-else>{{ getAvatarInitials(props.row.email) }}</template>
            </q-avatar>
          </q-td>
        </template>

        <template #body-cell-isActive="props">
          <q-td :props="props">
            <q-toggle
              :model-value="props.row.isActive"
              color="primary"
              :disable="!auth.hasPermission('usuarios.editar') || props.row.id === auth.user?.id"
              @update:model-value="(val: boolean) => onToggleActive(props.row, val)"
            />
          </q-td>
        </template>

        <template #body-cell-isLocked="props">
          <q-td :props="props">
            <q-chip v-if="props.row.isLocked" square dense color="negative" text-color="white">
              {{ t('admin.users.statusLocked') }}
            </q-chip>
            <q-chip v-else square dense color="positive" text-color="white">{{
              t('admin.users.statusActive')
            }}</q-chip>
          </q-td>
        </template>

        <template #body-cell-roles="props">
          <q-td :props="props">
            <q-chip
              v-for="role in props.row.roles"
              :key="role"
              square
              dense
              color="indigo-1"
              text-color="indigo-9"
            >
              {{ role }}
            </q-chip>
          </q-td>
        </template>

        <template #body-cell-actions="props">
          <q-td :props="props" class="text-center q-gutter-x-sm">
            <q-btn
              v-if="props.row.isLocked && auth.hasPermission('usuarios.editar')"
              flat
              round
              dense
              size="sm"
              color="warning"
              icon="lock_open"
              @click="onUnlock(props.row)"
            >
              <q-tooltip>{{ t('admin.users.unlockTooltip') }}</q-tooltip>
            </q-btn>
            <q-btn
              v-if="auth.hasPermission('usuarios.editar')"
              flat
              round
              dense
              size="sm"
              color="primary"
              icon="edit"
              @click="openEditDialog(props.row)"
            >
              <q-tooltip>{{ t('admin.users.editTooltip') }}</q-tooltip>
            </q-btn>
            <q-btn
              v-if="auth.hasPermission('usuarios.eliminar')"
              flat
              round
              dense
              size="sm"
              color="negative"
              icon="delete"
              :disable="props.row.id === auth.user?.id"
              @click="onDeleteConfirm(props.row)"
            >
              <q-tooltip>{{ t('admin.users.deleteTooltip') }}</q-tooltip>
            </q-btn>
          </q-td>
        </template>
      </q-table>

      <UserFormDialog v-model="formDialogVisible" :user="editingUser" @saved="onSaved" />
    </GlassCard>
  </AdminPageWrapper>
</template>

<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue';
import { useQuasar, type QTableColumn } from 'quasar';
import { useI18n } from 'vue-i18n';
import { useUsersStore, type AdminUser, type UsersFilters } from '@/stores/users';
import { useRolesStore } from '@/stores/roles';
import { useAuthStore } from '@/stores/auth';
import { getApiErrorMessage } from '@/utils/api-error';
import { getAvatarColor, getAvatarInitials } from '@/utils/avatar';
import UserFormDialog from '@/components/admin/UserFormDialog.vue';
import AdminPageWrapper from '@/components/common/AdminPageWrapper.vue';
import GlassCard from '@/components/common/GlassCard.vue';

const $q = useQuasar();
const { t } = useI18n();
const usersStore = useUsersStore();
const rolesStore = useRolesStore();
const auth = useAuthStore();

const columns = computed<QTableColumn<AdminUser>[]>(() => [
  { name: 'avatar', label: t('admin.users.columns.avatar'), field: 'avatarUrl', align: 'center' },
  {
    name: 'name',
    label: t('admin.users.columns.name'),
    field: 'name',
    align: 'left',
    sortable: true,
  },
  {
    name: 'email',
    label: t('admin.users.columns.email'),
    field: 'email',
    align: 'left',
    sortable: true,
  },
  {
    name: 'alias',
    label: t('admin.users.columns.alias'),
    field: 'alias',
    align: 'left',
    sortable: true,
  },
  {
    name: 'isActive',
    label: t('admin.users.columns.isActive'),
    field: 'isActive',
    align: 'center',
    sortable: true,
  },
  {
    name: 'isLocked',
    label: t('admin.users.columns.isLocked'),
    field: 'isLocked',
    align: 'center',
  },
  { name: 'roles', label: t('admin.users.columns.roles'), field: 'roles', align: 'left' },
  { name: 'actions', label: t('admin.users.columns.actions'), field: 'id', align: 'center' },
]);

const isActiveOptions = computed(() => [
  { label: t('admin.users.filters.isActiveAll'), value: null },
  { label: t('admin.users.filters.isActiveOnly'), value: true },
  { label: t('admin.users.filters.isInactiveOnly'), value: false },
]);

const roleOptions = computed(() => [
  { label: t('admin.users.filters.roleAll'), value: null },
  ...rolesStore.roles.map((role) => ({ label: role.name, value: role.name })),
]);

const pagination = ref<{
  page: number;
  rowsPerPage: number;
  rowsNumber: number;
  sortBy?: string | null;
  descending?: boolean;
}>({
  page: 1,
  rowsPerPage: 15,
  rowsNumber: 0,
});

const filters = ref({
  name: '',
  email: '',
  alias: '',
});
const isActiveFilter = ref<boolean | null>(null);
const roleFilter = ref<string | null>(null);

// Última combinación de filtros aplicada (vía "Filtrar" o "Limpiar"). Se reutiliza en
// onRequest para que cambiar de página conserve los filtros activos, sin depender de
// lo que haya escrito el usuario en los inputs sin haber pulsado "Filtrar" todavía.
const appliedFilters = ref<UsersFilters>({});

// El backend no soporta ordenación en servidor: sortBy/descending solo reordenan
// las filas ya cargadas de la página actual (ver SPEC 14).
type SortableValue = string | boolean | null;

function compareSortValues(a: SortableValue, b: SortableValue): number {
  if (a === b) {
    return 0;
  }
  if (a === null) {
    return -1;
  }
  if (b === null) {
    return 1;
  }
  if (typeof a === 'boolean' && typeof b === 'boolean') {
    return a === b ? 0 : a ? 1 : -1;
  }
  return String(a).localeCompare(String(b));
}

const sortedItems = computed(() => {
  const { sortBy, descending } = pagination.value;
  if (!sortBy) {
    return usersStore.items;
  }
  const key = sortBy as keyof AdminUser;
  const items = [...usersStore.items];
  items.sort((a, b) => {
    const result = compareSortValues(a[key] as SortableValue, b[key] as SortableValue);
    return descending ? -result : result;
  });
  return items;
});

// Distingue la carga inicial (debe llamar siempre al backend) de un disparo de
// @request causado solo por un cambio de orden de columna, comparando page/rowsPerPage
// contra usersStore.meta actual.
const hasLoadedOnce = ref(false);

const formDialogVisible = ref(false);
const editingUser = ref<AdminUser | null>(null);

function notifyError(error: unknown, fallback: string) {
  $q.notify({ type: 'negative', color: 'red-9', message: getApiErrorMessage(error, fallback) });
}

// Sincroniza la paginación local ante cualquier refresco de la lista, venga de un
// @request de la tabla o de una mutación (crear/editar/eliminar/desbloquear) que
// refresca el store internamente sin pasar por onRequest.
watch(
  () => usersStore.meta,
  (meta) => {
    pagination.value = {
      ...pagination.value,
      page: meta.currentPage,
      rowsPerPage: meta.perPage,
      rowsNumber: meta.total,
    };
  },
  { deep: true },
);

// Mantiene editingUser apuntando al objeto vigente del store (p.ej. tras subir un
// avatar, que refresca items internamente vía fetchUsers()) mientras el diálogo
// de edición sigue abierto.
watch(
  () => usersStore.items,
  (items) => {
    if (!editingUser.value) {
      return;
    }
    const fresh = items.find((item) => item.id === editingUser.value?.id);
    if (fresh) {
      editingUser.value = fresh;
    }
  },
);

function buildFilters(): UsersFilters {
  const result: UsersFilters = {};
  if (filters.value.name) {
    result.name = filters.value.name;
  }
  if (filters.value.email) {
    result.email = filters.value.email;
  }
  if (filters.value.alias) {
    result.alias = filters.value.alias;
  }
  if (isActiveFilter.value !== null) {
    result.isActive = isActiveFilter.value;
  }
  if (roleFilter.value) {
    result.role = roleFilter.value;
  }
  return result;
}

async function onRequest(requestProps: {
  pagination: { page: number; rowsPerPage: number; sortBy?: string | null; descending?: boolean };
}) {
  const { page, rowsPerPage } = requestProps.pagination;
  const isSortOnlyChange =
    hasLoadedOnce.value &&
    page === usersStore.meta.currentPage &&
    rowsPerPage === usersStore.meta.perPage;

  pagination.value = { ...pagination.value, ...requestProps.pagination };

  if (isSortOnlyChange) {
    return;
  }

  try {
    await usersStore.fetchUsers(page, rowsPerPage, appliedFilters.value);
    hasLoadedOnce.value = true;
  } catch (error) {
    notifyError(error, t('admin.users.fetchError'));
  }
}

async function onFilterClick() {
  appliedFilters.value = buildFilters();
  try {
    await usersStore.fetchUsers(1, pagination.value.rowsPerPage, appliedFilters.value);
  } catch (error) {
    notifyError(error, t('admin.users.fetchError'));
  }
}

async function onClearClick() {
  filters.value = { name: '', email: '', alias: '' };
  isActiveFilter.value = null;
  roleFilter.value = null;
  appliedFilters.value = {};
  try {
    await usersStore.fetchUsers(1, pagination.value.rowsPerPage, appliedFilters.value);
  } catch (error) {
    notifyError(error, t('admin.users.fetchError'));
  }
}

onMounted(() => {
  void rolesStore.fetchRoles();
  void onRequest({
    pagination: { page: pagination.value.page, rowsPerPage: pagination.value.rowsPerPage },
  });
});

async function onToggleActive(row: AdminUser, value: boolean) {
  try {
    await usersStore.updateUser(row.id, { is_active: value });
  } catch (error) {
    notifyError(error, t('admin.users.toggleActiveError'));
  }
}

async function onUnlock(row: AdminUser) {
  try {
    await usersStore.unlockUser(row.id);
    $q.notify({ type: 'positive', color: 'teal-9', message: t('admin.users.unlockSuccess') });
  } catch (error) {
    notifyError(error, t('admin.users.unlockError'));
  }
}

function onDeleteConfirm(row: AdminUser) {
  $q.dialog({
    title: t('admin.users.deleteDialogTitle'),
    message: t('admin.users.deleteDialogMessage', { name: row.name }),
    cancel: true,
    persistent: true,
  }).onOk(() => {
    void onDelete(row);
  });
}

async function onDelete(row: AdminUser) {
  try {
    await usersStore.deleteUser(row.id);
    $q.notify({ type: 'positive', color: 'teal-9', message: t('admin.users.deleteSuccess') });
  } catch (error) {
    notifyError(error, t('admin.users.deleteError'));
  }
}

function openCreateDialog() {
  editingUser.value = null;
  formDialogVisible.value = true;
}

function openEditDialog(row: AdminUser) {
  editingUser.value = row;
  formDialogVisible.value = true;
}

function onSaved() {
  formDialogVisible.value = false;
}
</script>
