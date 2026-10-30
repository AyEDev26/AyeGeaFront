import type { RouteRecordRaw } from 'vue-router';

export interface BreadcrumbItem {
  label: string; // clave i18n
  to?: string; // ruta destino; sin `to` el nivel es solo texto
}

declare module 'vue-router' {
  interface RouteMeta {
    requiresAuth: boolean;
    requiresPermission?: string;
    breadcrumb?: BreadcrumbItem[]; // cadena tras «Inicio»; el último elemento es la pantalla actual
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
        meta: { requiresAuth: true, breadcrumb: [{ label: 'layout.breadcrumb.profile' }] },
      },
      {
        path: 'inventario/vehiculos',
        component: () => import('@/pages/inventario/VehiculosListPage.vue'),
        meta: {
          requiresAuth: true,
          requiresPermission: 'elementos_inventario.ver',
          breadcrumb: [{ label: 'layout.breadcrumb.inventory' }, { label: 'layout.nav.vehicles' }],
        },
      },
      {
        path: 'inventario/maquinaria',
        component: () => import('@/pages/inventario/MaquinariaListPage.vue'),
        meta: {
          requiresAuth: true,
          requiresPermission: 'elementos_inventario.ver',
          breadcrumb: [{ label: 'layout.breadcrumb.inventory' }, { label: 'layout.nav.machinery' }],
        },
      },
      {
        path: 'inventario/epis',
        component: () => import('@/pages/inventario/EpisListPage.vue'),
        meta: {
          requiresAuth: true,
          requiresPermission: 'elementos_inventario.ver',
          breadcrumb: [{ label: 'layout.breadcrumb.inventory' }, { label: 'layout.nav.epis' }],
        },
      },
      {
        path: 'inventario/vehiculos/nuevo',
        component: () => import('@/pages/inventario/VehiculoFormPage.vue'),
        meta: {
          requiresAuth: true,
          requiresPermission: 'elementos_inventario.crear',
          breadcrumb: [
            { label: 'layout.breadcrumb.inventory' },
            { label: 'layout.nav.vehicles', to: '/inventario/vehiculos' },
            { label: 'layout.breadcrumb.new' },
          ],
        },
      },
      {
        path: 'inventario/vehiculos/:id/editar',
        component: () => import('@/pages/inventario/VehiculoFormPage.vue'),
        meta: {
          requiresAuth: true,
          requiresPermission: 'elementos_inventario.editar',
          breadcrumb: [
            { label: 'layout.breadcrumb.inventory' },
            { label: 'layout.nav.vehicles', to: '/inventario/vehiculos' },
            { label: 'layout.breadcrumb.edit' },
          ],
        },
      },
      {
        path: 'inventario/maquinaria/nuevo',
        component: () => import('@/pages/inventario/MaquinariaFormPage.vue'),
        meta: {
          requiresAuth: true,
          requiresPermission: 'elementos_inventario.crear',
          breadcrumb: [
            { label: 'layout.breadcrumb.inventory' },
            { label: 'layout.nav.machinery', to: '/inventario/maquinaria' },
            { label: 'layout.breadcrumb.new' },
          ],
        },
      },
      {
        path: 'inventario/maquinaria/:id/editar',
        component: () => import('@/pages/inventario/MaquinariaFormPage.vue'),
        meta: {
          requiresAuth: true,
          requiresPermission: 'elementos_inventario.editar',
          breadcrumb: [
            { label: 'layout.breadcrumb.inventory' },
            { label: 'layout.nav.machinery', to: '/inventario/maquinaria' },
            { label: 'layout.breadcrumb.edit' },
          ],
        },
      },
      {
        path: 'inventario/epis/nuevo',
        component: () => import('@/pages/inventario/EpiFormPage.vue'),
        meta: {
          requiresAuth: true,
          requiresPermission: 'elementos_inventario.crear',
          breadcrumb: [
            { label: 'layout.breadcrumb.inventory' },
            { label: 'layout.nav.epis', to: '/inventario/epis' },
            { label: 'layout.breadcrumb.new' },
          ],
        },
      },
      {
        path: 'inventario/epis/:id/editar',
        component: () => import('@/pages/inventario/EpiFormPage.vue'),
        meta: {
          requiresAuth: true,
          requiresPermission: 'elementos_inventario.editar',
          breadcrumb: [
            { label: 'layout.breadcrumb.inventory' },
            { label: 'layout.nav.epis', to: '/inventario/epis' },
            { label: 'layout.breadcrumb.edit' },
          ],
        },
      },
      {
        path: 'documentos',
        component: () => import('@/pages/DocumentosListPage.vue'),
        meta: {
          requiresAuth: true,
          requiresPermission: 'documentos.ver',
          breadcrumb: [{ label: 'layout.nav.documentos' }],
        },
      },
      {
        // Sin requiresPermission: el guard solo admite un permiso y el hub se abre con cualquiera
        // de varios; la propia página oculta las tarjetas sin permiso.
        path: 'admin/administracion',
        component: () => import('@/pages/admin/AdminHubPage.vue'),
        meta: { requiresAuth: true, breadcrumb: [{ label: 'layout.nav.administration' }] },
      },
      { path: 'admin/organizacion', redirect: '/admin/administracion' },
      {
        path: 'admin/usuarios',
        component: () => import('@/pages/admin/UsersListPage.vue'),
        meta: {
          requiresAuth: true,
          requiresPermission: 'usuarios.ver',
          breadcrumb: [
            { label: 'layout.nav.administration', to: '/admin/administracion' },
            { label: 'admin.adminHub.cards.usuarios.title' },
          ],
        },
      },
      {
        path: 'admin/roles',
        component: () => import('@/pages/admin/RolesPermissionsPage.vue'),
        meta: {
          requiresAuth: true,
          requiresPermission: 'usuarios.ver',
          breadcrumb: [
            { label: 'layout.nav.administration', to: '/admin/administracion' },
            { label: 'admin.adminHub.cards.roles.title' },
          ],
        },
      },
      {
        path: 'admin/departamentos',
        component: () => import('@/pages/admin/DepartamentosListPage.vue'),
        meta: {
          requiresAuth: true,
          requiresPermission: 'catalogos.ver',
          breadcrumb: [
            { label: 'layout.nav.administration', to: '/admin/administracion' },
            { label: 'admin.adminHub.cards.departamentos.title' },
          ],
        },
      },
      {
        path: 'admin/proveedores',
        component: () => import('@/pages/admin/ProveedoresListPage.vue'),
        meta: {
          requiresAuth: true,
          requiresPermission: 'catalogos.ver',
          breadcrumb: [
            { label: 'layout.nav.administration', to: '/admin/administracion' },
            { label: 'admin.adminHub.cards.proveedores.title' },
          ],
        },
      },
      {
        path: 'admin/categorias',
        component: () => import('@/pages/admin/CategoriasListPage.vue'),
        meta: {
          requiresAuth: true,
          requiresPermission: 'catalogos.ver',
          breadcrumb: [
            { label: 'layout.nav.administration', to: '/admin/administracion' },
            { label: 'admin.adminHub.cards.categorias.title' },
          ],
        },
      },
      {
        path: 'admin/categorias/nuevo',
        component: () => import('@/pages/admin/CategoriaFormPage.vue'),
        meta: {
          requiresAuth: true,
          requiresPermission: 'catalogos.crear',
          breadcrumb: [
            { label: 'layout.nav.administration', to: '/admin/administracion' },
            { label: 'admin.adminHub.cards.categorias.title', to: '/admin/categorias' },
            { label: 'layout.breadcrumb.new' },
          ],
        },
      },
      {
        path: 'admin/categorias/:id',
        component: () => import('@/pages/admin/CategoriaFormPage.vue'),
        meta: {
          requiresAuth: true,
          requiresPermission: 'catalogos.ver',
          breadcrumb: [
            { label: 'layout.nav.administration', to: '/admin/administracion' },
            { label: 'admin.adminHub.cards.categorias.title', to: '/admin/categorias' },
            { label: 'layout.breadcrumb.edit' },
          ],
        },
      },
      {
        path: 'admin/periodicidades',
        component: () => import('@/pages/admin/PeriodicidadesListPage.vue'),
        meta: {
          requiresAuth: true,
          requiresPermission: 'catalogos.ver',
          breadcrumb: [
            { label: 'layout.nav.administration', to: '/admin/administracion' },
            { label: 'admin.adminHub.cards.periodicidades.title' },
          ],
        },
      },
      {
        path: 'admin/tipos-documento',
        component: () => import('@/pages/admin/TiposDocumentoListPage.vue'),
        meta: {
          requiresAuth: true,
          requiresPermission: 'catalogos.ver',
          breadcrumb: [
            { label: 'layout.nav.administration', to: '/admin/administracion' },
            { label: 'admin.adminHub.cards.tiposDocumento.title' },
          ],
        },
      },
      {
        path: 'admin/delegaciones',
        component: () => import('@/pages/admin/DelegacionesListPage.vue'),
        meta: {
          requiresAuth: true,
          requiresPermission: 'delegaciones.ver',
          breadcrumb: [
            { label: 'layout.nav.administration', to: '/admin/administracion' },
            { label: 'admin.adminHub.cards.delegaciones.title' },
          ],
        },
      },
      {
        path: 'admin/ubicaciones',
        component: () => import('@/pages/admin/UbicacionesListPage.vue'),
        meta: {
          requiresAuth: true,
          requiresPermission: 'catalogos.ver',
          breadcrumb: [
            { label: 'layout.nav.administration', to: '/admin/administracion' },
            { label: 'admin.adminHub.cards.ubicaciones.title' },
          ],
        },
      },
      {
        path: 'admin/almacenes',
        component: () => import('@/pages/admin/AlmacenesListPage.vue'),
        meta: {
          requiresAuth: true,
          requiresPermission: 'catalogos.ver',
          breadcrumb: [
            { label: 'layout.nav.administration', to: '/admin/administracion' },
            { label: 'admin.adminHub.cards.almacenes.title' },
          ],
        },
      },
      {
        path: 'admin/informes/organizacion',
        component: () => import('@/pages/admin/OrganizationReportPage.vue'),
        meta: {
          requiresAuth: true,
          requiresPermission: 'usuarios.ver',
          breadcrumb: [
            { label: 'layout.nav.administration', to: '/admin/administracion' },
            { label: 'admin.adminHub.cards.informe.title' },
          ],
        },
      },
      {
        path: 'admin/configuracion',
        component: () => import('@/pages/admin/BusinessConfigPage.vue'),
        meta: {
          requiresAuth: true,
          requiresPermission: 'configuracion.ver',
          breadcrumb: [
            { label: 'layout.nav.administration', to: '/admin/administracion' },
            { label: 'admin.adminHub.cards.configuracion.title' },
          ],
        },
      },
      {
        path: 'admin/actividad',
        component: () => import('@/pages/admin/ActivityLogPage.vue'),
        meta: {
          requiresAuth: true,
          requiresPermission: 'actividad.ver',
          breadcrumb: [
            { label: 'layout.nav.administration', to: '/admin/administracion' },
            { label: 'admin.adminHub.cards.actividad.title' },
          ],
        },
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
