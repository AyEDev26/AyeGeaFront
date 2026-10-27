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
        path: 'inventario/vehiculos',
        component: () => import('@/pages/inventario/VehiculosListPage.vue'),
        meta: { requiresAuth: true, requiresPermission: 'elementos_inventario.ver' },
      },
      {
        path: 'inventario/maquinaria',
        component: () => import('@/pages/inventario/MaquinariaListPage.vue'),
        meta: { requiresAuth: true, requiresPermission: 'elementos_inventario.ver' },
      },
      {
        path: 'inventario/epis',
        component: () => import('@/pages/inventario/EpisListPage.vue'),
        meta: { requiresAuth: true, requiresPermission: 'elementos_inventario.ver' },
      },
      {
        path: 'inventario/vehiculos/nuevo',
        component: () => import('@/pages/inventario/VehiculoFormPage.vue'),
        meta: { requiresAuth: true, requiresPermission: 'elementos_inventario.crear' },
      },
      {
        path: 'inventario/vehiculos/:id/editar',
        component: () => import('@/pages/inventario/VehiculoFormPage.vue'),
        meta: { requiresAuth: true, requiresPermission: 'elementos_inventario.editar' },
      },
      {
        path: 'inventario/maquinaria/nuevo',
        component: () => import('@/pages/inventario/MaquinariaFormPage.vue'),
        meta: { requiresAuth: true, requiresPermission: 'elementos_inventario.crear' },
      },
      {
        path: 'inventario/maquinaria/:id/editar',
        component: () => import('@/pages/inventario/MaquinariaFormPage.vue'),
        meta: { requiresAuth: true, requiresPermission: 'elementos_inventario.editar' },
      },
      {
        path: 'inventario/epis/nuevo',
        component: () => import('@/pages/inventario/EpiFormPage.vue'),
        meta: { requiresAuth: true, requiresPermission: 'elementos_inventario.crear' },
      },
      {
        path: 'inventario/epis/:id/editar',
        component: () => import('@/pages/inventario/EpiFormPage.vue'),
        meta: { requiresAuth: true, requiresPermission: 'elementos_inventario.editar' },
      },
      {
        path: 'documentos',
        component: () => import('@/pages/DocumentosListPage.vue'),
        meta: { requiresAuth: true, requiresPermission: 'documentos.ver' },
      },
      {
        // Sin requiresPermission: el guard solo admite un permiso y el hub se abre con cualquiera
        // de varios; la propia página oculta las tarjetas sin permiso.
        path: 'admin/administracion',
        component: () => import('@/pages/admin/AdminHubPage.vue'),
        meta: { requiresAuth: true },
      },
      { path: 'admin/organizacion', redirect: '/admin/administracion' },
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
        path: 'admin/proveedores',
        component: () => import('@/pages/admin/ProveedoresListPage.vue'),
        meta: { requiresAuth: true, requiresPermission: 'catalogos.ver' },
      },
      {
        path: 'admin/categorias',
        component: () => import('@/pages/admin/CategoriasListPage.vue'),
        meta: { requiresAuth: true, requiresPermission: 'catalogos.ver' },
      },
      {
        path: 'admin/periodicidades',
        component: () => import('@/pages/admin/PeriodicidadesListPage.vue'),
        meta: { requiresAuth: true, requiresPermission: 'catalogos.ver' },
      },
      {
        path: 'admin/tipos-documento',
        component: () => import('@/pages/admin/TiposDocumentoListPage.vue'),
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
        path: 'admin/informes/organizacion',
        component: () => import('@/pages/admin/OrganizationReportPage.vue'),
        meta: { requiresAuth: true, requiresPermission: 'usuarios.ver' },
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
