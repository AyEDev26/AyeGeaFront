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
        <q-form ref="formRef" @submit.prevent="onSubmit">
          <q-tabs
            v-model="activeTab"
            dense
            no-caps
            align="left"
            active-color="teal-9"
            indicator-color="teal-9"
            class="text-grey-7"
          >
            <q-tab name="user" :label="t('admin.userForm.tabUserData')" />
            <q-tab name="organization" :label="t('admin.userForm.tabOrganization')" />
          </q-tabs>
          <q-separator />

          <!-- keep-alive: el panel oculto sigue montado para que formRef.validate() lo valide -->
          <q-tab-panels
            v-model="activeTab"
            animated
            keep-alive
            class="bg-transparent user-form-panels"
            :class="{ 'user-form-panels--edit': isEditMode }"
          >
            <q-tab-panel name="user" class="q-pa-none q-pt-md">
              <div class="q-gutter-y-xs">
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
              </div>
            </q-tab-panel>

            <q-tab-panel name="organization" class="q-pa-none q-pt-md">
              <div class="q-gutter-y-md">
                <q-select
                  v-model="delegacion"
                  outlined
                  dense
                  clearable
                  use-input
                  hide-dropdown-icon
                  input-debounce="300"
                  class="elegant-input"
                  option-value="id"
                  :label="t('admin.userForm.delegacionLabel')"
                  :placeholder="t('admin.userForm.searchPlaceholder')"
                  :options="delegacionOptions"
                  :loading="searchingDelegacion"
                  @filter="onFilterDelegacion"
                  @update:model-value="onDelegacionChange"
                >
                  <template #no-option>
                    <q-item>
                      <q-item-section class="text-grey">
                        {{ t('admin.userForm.noResults') }}
                      </q-item-section>
                    </q-item>
                  </template>
                </q-select>

                <q-select
                  v-model="departamento"
                  outlined
                  dense
                  clearable
                  use-input
                  hide-dropdown-icon
                  input-debounce="300"
                  class="elegant-input"
                  option-value="id"
                  :label="t('admin.userForm.departamentoLabel')"
                  :placeholder="t('admin.userForm.searchPlaceholder')"
                  :options="departamentoOptions"
                  :loading="searchingDepartamento"
                  @filter="onFilterDepartamento"
                >
                  <template #no-option>
                    <q-item>
                      <q-item-section class="text-grey">
                        {{ t('admin.userForm.noResults') }}
                      </q-item-section>
                    </q-item>
                  </template>
                </q-select>

                <q-select
                  v-model="almacen"
                  outlined
                  dense
                  clearable
                  use-input
                  hide-dropdown-icon
                  input-debounce="300"
                  class="elegant-input"
                  option-value="id"
                  :label="t('admin.userForm.almacenLabel')"
                  :placeholder="t('admin.userForm.searchPlaceholder')"
                  :disable="!delegacion"
                  :hint="delegacion ? undefined : t('admin.userForm.selectDelegacionFirst')"
                  :options="almacenOptions"
                  :loading="searchingAlmacen"
                  @filter="onFilterAlmacen"
                >
                  <template #no-option>
                    <q-item>
                      <q-item-section class="text-grey">
                        {{ t('admin.userForm.noResults') }}
                      </q-item-section>
                    </q-item>
                  </template>
                </q-select>

                <div class="visibilidad-group">
                  <div class="text-caption text-grey-7 q-mb-xs">
                    {{ t('admin.userForm.visibilidadLabel') }}
                  </div>
                  <q-inner-loading :showing="loadingDelegaciones" />
                  <q-option-group
                    v-model="visibilidadChecked"
                    :options="visibilidadCheckboxOptions"
                    type="checkbox"
                    color="teal-9"
                    dense
                  />
                  <div v-if="!loadingDelegaciones && !delegacionesAcceso.length" class="text-grey">
                    {{ t('admin.userForm.noResults') }}
                  </div>
                  <div v-if="delegacion" class="text-caption text-grey-7 q-mt-xs">
                    {{ t('admin.userForm.visibilidadOwnHint') }}
                  </div>
                </div>
              </div>
            </q-tab-panel>
          </q-tab-panels>
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
import { useUsersStore, type AdminUser, type OrgRef } from '@/stores/users';
import { useDelegacionesStore } from '@/stores/delegaciones';
import { useDepartamentosStore } from '@/stores/departamentos';
import { useAlmacenesStore } from '@/stores/almacenes';
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
const delegacionesStore = useDelegacionesStore();
const departamentosStore = useDepartamentosStore();
const almacenesStore = useAlmacenesStore();

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
const activeTab = ref<'user' | 'organization'>('user');
const name = ref('');
const email = ref('');
const alias = ref('');
const password = ref('');
const passwordConfirmation = ref('');
const selectedRoles = ref<string[]>([]);
const showPassword = ref(false);
const showPasswordConfirmation = ref(false);
const saving = ref(false);

interface OrgOption {
  id: number;
  label: string;
}

// Estado de un select de organización con búsqueda en servidor: guarda el objeto completo
// ({ id, label }) para poder mostrar la etiqueta actual sin petición extra.
function useOrgSelect(search: (nombre: string) => Promise<OrgRef[]>) {
  const model = ref<OrgOption | null>(null);
  const options = ref<OrgOption[]>([]);
  const searching = ref(false);

  function onFilter(value: string, update: (callback: () => void) => void, abort: () => void) {
    searching.value = true;
    search(value)
      .then((results) => {
        update(() => {
          options.value = results.map((item) => ({ id: item.id, label: item.nombre }));
        });
      })
      .catch((error: unknown) => {
        abort();
        $q.notify({
          type: 'negative',
          color: 'red-9',
          message: getApiErrorMessage(error, t('admin.userForm.saveError')),
        });
      })
      .finally(() => {
        searching.value = false;
      });
  }

  function load(current: OrgRef | null | undefined) {
    model.value = current ? { id: current.id, label: current.nombre } : null;
    options.value = [];
  }

  return { model, options, searching, onFilter, load };
}

const {
  model: delegacion,
  options: delegacionOptions,
  searching: searchingDelegacion,
  onFilter: onFilterDelegacion,
  load: loadDelegacion,
} = useOrgSelect((nombre) => delegacionesStore.searchDelegacionesByNombre(nombre));
const {
  model: departamento,
  options: departamentoOptions,
  searching: searchingDepartamento,
  onFilter: onFilterDepartamento,
  load: loadDepartamento,
} = useOrgSelect((nombre) => departamentosStore.searchDepartamentosByNombre(nombre));
const {
  model: almacen,
  options: almacenOptions,
  searching: searchingAlmacen,
  onFilter: onFilterAlmacen,
  load: loadAlmacen,
} = useOrgSelect((nombre) =>
  delegacion.value
    ? almacenesStore.searchAlmacenesByNombre(nombre, delegacion.value.id)
    : Promise.resolve([]),
);

// Delegaciones adicionales con acceso (ids, sin la propia que el backend añade siempre).
const visibilidad = ref<number[]>([]);
const delegacionesAcceso = ref<OrgOption[]>([]);
const loadingDelegaciones = ref(false);

// La propia se muestra marcada y deshabilitada; solo las demás se guardan en `visibilidad`.
const visibilidadCheckboxOptions = computed(() =>
  delegacionesAcceso.value.map((option) => ({
    label: option.label,
    value: option.id,
    disable: option.id === delegacion.value?.id,
  })),
);
const visibilidadChecked = computed<number[]>({
  get: () => (delegacion.value ? [...visibilidad.value, delegacion.value.id] : visibilidad.value),
  set: (ids) => {
    visibilidad.value = ids.filter((id) => id !== delegacion.value?.id);
  },
});

async function fetchDelegacionesAcceso() {
  loadingDelegaciones.value = true;
  try {
    const all = await delegacionesStore.fetchAllDelegaciones();
    delegacionesAcceso.value = all.map((item) => ({ id: item.id, label: item.nombre }));
  } catch (error) {
    $q.notify({
      type: 'negative',
      color: 'red-9',
      message: getApiErrorMessage(error, t('admin.userForm.saveError')),
    });
  } finally {
    loadingDelegaciones.value = false;
  }
}

// user.visibilidad incluye la delegación propia; el formulario solo maneja las adicionales.
function additionalVisibilidad(user: AdminUser): OrgRef[] {
  return user.visibilidad.filter((item) => item.id !== user.delegacionId);
}

function loadVisibilidad(current: OrgRef[]) {
  visibilidad.value = current.map((item) => item.id);
}

// Se vacía desde el evento del select (no con un watch) para no borrar la precarga de edición.
function onDelegacionChange() {
  loadAlmacen(null);
  // La nueva delegación propia pasa a ser la marcada y fija: se retira de las adicionales.
  visibilidad.value = visibilidad.value.filter((id) => id !== delegacion.value?.id);
}

const nameRules = [(val: string) => !!val || t('admin.userForm.nameRequired')];
const emailRules = [
  (val: string) => !!val || t('admin.userForm.emailRequired'),
  (val: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(val) || t('admin.userForm.emailInvalid'),
];
const aliasRules = [(val: string) => !val || val.length <= 20 || t('admin.userForm.aliasTooLong')];
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
  activeTab.value = 'user';
  if (props.user) {
    name.value = props.user.name;
    email.value = props.user.email;
    alias.value = props.user.alias ?? '';
    selectedRoles.value = [...props.user.roles];
    // La opción actual sale de los objetos que ya trae /users: sin peticiones extra.
    loadDelegacion(props.user.delegacion);
    loadDepartamento(props.user.departamento);
    loadAlmacen(props.user.almacen);
    loadVisibilidad(additionalVisibilidad(props.user));
  } else {
    name.value = '';
    email.value = '';
    alias.value = '';
    selectedRoles.value = [];
    loadDelegacion(null);
    loadDepartamento(null);
    loadAlmacen(null);
    loadVisibilidad([]);
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
    if (!delegacionesAcceso.value.length) {
      void fetchDelegacionesAcceso();
    }
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

function changedOrgId<K extends string>(
  key: K,
  current: OrgOption | null,
  original: number | null,
): Partial<Record<K, number | null>> {
  const next = current?.id ?? null;
  return next === original ? {} : ({ [key]: next } as Record<K, number | null>);
}

// Solo en edición y si el conjunto de adicionales cambia (en PUT reemplaza el del backend).
function changedVisibilidad(user: AdminUser): { visibilidad?: number[] } {
  const original = additionalVisibilidad(user)
    .map((item) => item.id)
    .sort((a, b) => a - b);
  const next = [...visibilidad.value].sort((a, b) => a - b);
  const unchanged = original.length === next.length && original.every((id, i) => id === next[i]);
  return unchanged ? {} : { visibilidad: visibilidad.value };
}

async function onSubmit() {
  const isValid = await formRef.value?.validate();
  if (!isValid) {
    // Los selects de "Organización" no tienen reglas: cualquier error está en "Datos de usuario".
    activeTab.value = 'user';
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
        // En edición solo se envía lo que cambia; vaciar un select envía null (desasignar).
        ...changedOrgId('delegacion_id', delegacion.value, props.user.delegacionId),
        ...changedOrgId('departamento_id', departamento.value, props.user.departamentoId),
        ...changedOrgId('almacen_id', almacen.value, props.user.almacenId),
        ...changedVisibilidad(props.user),
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
        // En alta un select vacío no se envía.
        ...(delegacion.value ? { delegacion_id: delegacion.value.id } : {}),
        ...(departamento.value ? { departamento_id: departamento.value.id } : {}),
        ...(almacen.value ? { almacen_id: almacen.value.id } : {}),
        ...(visibilidad.value.length ? { visibilidad: visibilidad.value } : {}),
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

<style scoped>
/* Alto fijo: el diálogo no cambia de tamaño al alternar entre pestañas. */
.user-form-panels {
  height: 460px;
  overflow-y: auto;
}
.visibilidad-group {
  position: relative;
  max-height: 180px;
  overflow-y: auto;
}
.user-form-panels--edit {
  height: 550px;
}
</style>
