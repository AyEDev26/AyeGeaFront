import { defineRouter } from '#q-app';
import {
  createMemoryHistory,
  createRouter,
  createWebHashHistory,
  createWebHistory,
} from 'vue-router';
import { Notify } from 'quasar';

import routes from './routes';
import { useAuthStore } from '@/stores/auth';

/*
 * If not building with SSR mode, you can
 * directly export the Router instantiation;
 *
 * The function below can be async too; either use
 * async/await or return a Promise which resolves
 * with the Router instance.
 */

export default defineRouter(({ store }) => {
  const createHistory = import.meta.env.QUASAR_SERVER
    ? createMemoryHistory
    : import.meta.env.QUASAR_VUE_ROUTER_MODE === 'history'
      ? createWebHistory
      : createWebHashHistory;

  const Router = createRouter({
    scrollBehavior: () => ({ left: 0, top: 0 }),
    routes,

    // Leave this as is and make changes in quasar.conf.js instead!
    // quasar.conf.js -> build -> vueRouterMode
    // quasar.conf.js -> build -> publicPath
    history: createHistory(import.meta.env.QUASAR_VUE_ROUTER_BASE),
  });

  Router.beforeEach(async (to) => {
    const auth = useAuthStore(store);

    if (to.meta.requiresAuth && !auth.isAuthenticated) {
      try {
        await auth.fetchMe();
      } catch {
        // fetchMe() ya limpió la sesión al fallar; seguimos con isAuthenticated en false.
      }

      if (!auth.isAuthenticated) {
        return { path: '/login', query: { redirect: to.fullPath } };
      }
    }

    if (to.meta.requiresPermission && !auth.hasPermission(to.meta.requiresPermission)) {
      Notify.create({ type: 'negative', message: 'No tienes permiso para acceder a esta sección' });
      return { path: '/' };
    }

    return true;
  });

  return Router;
});
