import type { RouteRecordRaw } from 'vue-router';

declare module 'vue-router' {
  interface RouteMeta {
    requiresAuth: boolean;
    requiresPermission?: string;
  }
}

const routes: RouteRecordRaw[] = [
  {
    path: '/login',
    component: () => import('@/pages/auth/LoginPage.vue'),
    meta: { requiresAuth: false },
  },
  {
    path: '/2fa',
    component: () => import('@/pages/auth/TwoFactorPage.vue'),
    meta: { requiresAuth: false },
  },
  {
    path: '/forgot-password',
    component: () => import('@/pages/auth/ForgotPasswordPage.vue'),
    meta: { requiresAuth: false },
  },
  {
    path: '/reset-password',
    component: () => import('@/pages/auth/ResetPasswordPage.vue'),
    meta: { requiresAuth: false },
  },

  {
    path: '/',
    component: () => import('@/layouts/MainLayout.vue'),
    meta: { requiresAuth: true },
    children: [
      { path: '', component: () => import('@/pages/IndexPage.vue'), meta: { requiresAuth: true } },
      {
        path: 'perfil',
        component: () => import('@/pages/ProfilePage.vue'),
        meta: { requiresAuth: true },
      },
      {
        path: 'admin/usuarios',
        component: () => import('@/pages/admin/UsersListPage.vue'),
        meta: { requiresAuth: true, requiresPermission: 'usuarios.ver' },
      },
      {
        path: 'admin/roles',
        component: () => import('@/pages/admin/RolesPermissionsPage.vue'),
        meta: { requiresAuth: true, requiresPermission: 'usuarios.ver' },
      },
      {
        path: 'admin/departamentos',
        component: () => import('@/pages/admin/DepartamentosListPage.vue'),
        meta: { requiresAuth: true, requiresPermission: 'catalogos.ver' },
      },
      {
        path: 'admin/delegaciones',
        component: () => import('@/pages/admin/DelegacionesListPage.vue'),
        meta: { requiresAuth: true, requiresPermission: 'delegaciones.ver' },
      },
      {
        path: 'admin/ubicaciones',
        component: () => import('@/pages/admin/UbicacionesListPage.vue'),
        meta: { requiresAuth: true, requiresPermission: 'catalogos.ver' },
      },
      {
        path: 'admin/almacenes',
        component: () => import('@/pages/admin/AlmacenesListPage.vue'),
        meta: { requiresAuth: true, requiresPermission: 'catalogos.ver' },
      },
      {
        path: 'admin/configuracion',
        component: () => import('@/pages/admin/BusinessConfigPage.vue'),
        meta: { requiresAuth: true, requiresPermission: 'configuracion.ver' },
      },
      {
        path: 'admin/actividad',
        component: () => import('@/pages/admin/ActivityLogPage.vue'),
        meta: { requiresAuth: true, requiresPermission: 'actividad.ver' },
      },
    ],
  },

  // Always leave this as last one,
  // but you can also remove it
  {
    path: '/:catchAll(.*)*',
    component: () => import('@/pages/ErrorNotFound.vue'),
    meta: { requiresAuth: false },
  },
];

export default routes;
