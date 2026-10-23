<template>
  <q-layout view="lHh Lpr lFf">
    <q-header elevated class="app-header">
      <q-toolbar>
        <q-btn
          flat
          dense
          round
          icon="menu"
          :aria-label="t('layout.menuAriaLabel')"
          @click="toggleLeftDrawer"
        />
        <q-toolbar-title class="font-outfit text-weight-bold">AyeGea</q-toolbar-title>
        <q-badge outline color="white" class="q-px-sm">v{{ appVersion }}</q-badge>
      </q-toolbar>
    </q-header>

    <q-drawer
      v-model="leftDrawerOpen"
      show-if-above
      bordered
      class="app-drawer text-white column no-wrap"
    >
      <div
        class="profile-block bg-blue-grey-9 q-pa-md cursor-pointer"
        role="link"
        tabindex="0"
        @click="router.push('/perfil')"
        @keydown.enter="router.push('/perfil')"
      >
        <div class="row items-center no-wrap q-gutter-sm">
          <q-avatar
            size="64px"
            :style="!avatarUrl ? { backgroundColor: avatarColor, color: '#ffffff' } : undefined"
          >
            <img v-if="avatarUrl" :src="avatarUrl" style="object-fit: cover" />
            <template v-else>{{ avatarInitials }}</template>
          </q-avatar>
          <div class="col overflow-hidden">
            <div class="text-subtitle1 text-weight-medium ellipsis">{{ user?.name }}</div>
            <div class="text-body2 text-blue-grey-2 ellipsis">{{ user?.email }}</div>
          </div>
        </div>

        <div v-if="user?.roles.length" class="row q-gutter-xs q-mt-sm">
          <q-chip
            v-for="role in user.roles"
            :key="role"
            square
            dense
            color="indigo-1"
            text-color="indigo-9"
          >
            {{ role }}
          </q-chip>
        </div>
      </div>

      <q-btn-toggle
        :model-value="themeStore.theme"
        spread
        no-caps
        dense
        unelevated
        toggle-color="teal-6"
        color="transparent"
        text-color="blue-grey-2"
        class="theme-switcher q-mx-md q-mt-md"
        :options="[
          { label: t('layout.theme.classic'), value: 'classic' },
          { label: t('layout.theme.claro'), value: 'claro' },
        ]"
        @update:model-value="themeStore.setTheme($event as VisualTheme)"
      />

      <q-list class="q-mt-md">
        <q-item-label header class="drawer-section-header">{{
          t('layout.nav.menuSection')
        }}</q-item-label>
        <q-item clickable to="/" exact class="drawer-item" active-class="drawer-item--active">
          <q-item-section avatar>
            <q-icon name="home" />
          </q-item-section>
          <q-item-section>{{ t('layout.nav.home') }}</q-item-section>
        </q-item>

        <q-item
          clickable
          tag="a"
          href="/manual-usuario.html"
          target="_blank"
          rel="noopener"
          class="drawer-item"
        >
          <q-item-section avatar>
            <q-icon name="menu_book" />
          </q-item-section>
          <q-item-section>{{ t('layout.nav.userManual') }}</q-item-section>
        </q-item>

        <q-item
          v-for="item in inventoryNavItems"
          :key="item.to"
          clickable
          :to="item.to"
          class="drawer-item"
          active-class="drawer-item--active"
        >
          <q-item-section avatar>
            <q-icon :name="item.icon" />
          </q-item-section>
          <q-item-section>{{ t(item.label) }}</q-item-section>
        </q-item>

        <q-item
          v-if="hasAdminHubAccess"
          clickable
          to="/admin/administracion"
          :active="isAdminHubRoute"
          class="drawer-item"
          active-class="drawer-item--active"
        >
          <q-item-section avatar>
            <q-icon name="corporate_fare" />
          </q-item-section>
          <q-item-section>{{ t('layout.nav.administration') }}</q-item-section>
        </q-item>
      </q-list>

      <q-space />

      <q-list>
        <q-item clickable class="text-red-4" @click="onLogout">
          <q-item-section avatar>
            <q-icon name="logout" color="red-4" />
          </q-item-section>
          <q-item-section>{{ t('layout.logout') }}</q-item-section>
        </q-item>
      </q-list>
    </q-drawer>

    <q-page-container>
      <router-view />
    </q-page-container>
  </q-layout>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { useI18n } from 'vue-i18n';
import { useAuthStore } from '@/stores/auth';
import { useThemeStore, type VisualTheme } from '@/stores/theme-store';
import { getAvatarColor, getAvatarInitials } from '@/utils/avatar';
import { version as appVersion } from '../../package.json';

const router = useRouter();
const route = useRoute();
const { t } = useI18n();
const auth = useAuthStore();
const themeStore = useThemeStore();

const leftDrawerOpen = ref(false);

// El informe de organización lee usuarios, delegaciones y catálogos: exige los tres permisos .ver.
const canViewOrganizationReport = computed(
  () =>
    auth.hasPermission('usuarios.ver') &&
    auth.hasPermission('delegaciones.ver') &&
    auth.hasPermission('catalogos.ver'),
);
// Listados de inventario: tres ítems sueltos visibles con elementos_inventario.ver.
const inventoryNavItems = computed(() =>
  auth.hasPermission('elementos_inventario.ver')
    ? [
        { to: '/inventario/vehiculos', icon: 'directions_car', label: 'layout.nav.vehicles' },
        { to: '/inventario/maquinaria', icon: 'construction', label: 'layout.nav.machinery' },
        { to: '/inventario/epis', icon: 'health_and_safety', label: 'layout.nav.epis' },
      ]
    : [],
);
// El ítem "Administración" aparece si hay al menos un permiso de las pantallas que enlaza el hub.
const hasAdminHubAccess = computed(
  () =>
    auth.hasPermission('usuarios.ver') ||
    auth.hasPermission('configuracion.ver') ||
    auth.hasPermission('actividad.ver') ||
    auth.hasPermission('catalogos.ver') ||
    auth.hasPermission('delegaciones.ver') ||
    canViewOrganizationReport.value,
);
const adminHubPaths = [
  '/admin/administracion',
  '/admin/departamentos',
  '/admin/delegaciones',
  '/admin/almacenes',
  '/admin/ubicaciones',
  '/admin/informes/organizacion',
  '/admin/proveedores',
  '/admin/categorias',
  '/admin/periodicidades',
  '/admin/usuarios',
  '/admin/roles',
  '/admin/configuracion',
  '/admin/actividad',
];
// Marca activo el ítem en el hub y en las pantallas que cuelgan de él.
const isAdminHubRoute = computed(() => adminHubPaths.includes(route.path));

const user = computed(() => auth.user);
const avatarUrl = computed(() => {
  const url = user.value?.avatarUrl ?? null;
  console.log('[MainLayout] avatar obtenido, url:', url);
  return url;
});
const avatarInitials = computed(() => getAvatarInitials(user.value?.email ?? ''));
const avatarColor = computed(() => getAvatarColor(user.value?.email ?? ''));

function toggleLeftDrawer() {
  leftDrawerOpen.value = !leftDrawerOpen.value;
}

async function onLogout() {
  await auth.logout();
  await router.push('/login');
}
</script>
