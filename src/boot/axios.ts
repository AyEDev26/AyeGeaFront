import { defineBoot } from '#q-app';
import axios, { type AxiosInstance, type AxiosError, type InternalAxiosRequestConfig } from 'axios';
import { useAuthStore } from '@/stores/auth';
import { useLocaleStore } from '@/stores/locale';
import { toApiLocale } from '@/boot/i18n';

declare module 'vue' {
  interface ComponentCustomProperties {
    $axios: AxiosInstance;
    $api: AxiosInstance;
  }
}

// Ruta relativa: en dev la resuelve el proxy de quasar.config.ts (devServer.proxy),
// en producción la resuelve nginx (ver deploy/nginx.conf.example). Nunca una URL
// absoluta del backend, así no hace falta variable de entorno ni CORS.
const api: AxiosInstance = axios.create({ baseURL: '/api/v1' });

interface RetryableRequestConfig extends InternalAxiosRequestConfig {
  _retry?: boolean;
}

// Endpoints públicos de auth (y /refresh, /logout): un 401 aquí es una respuesta de negocio
// normal (credenciales inválidas, token de reset caducado, refresh/logout ya sin sesión), no
// una señal de "token de acceso expirado". Excluirlos evita reintentos de refresh en cadena
// (p. ej. logout() tras un refresh fallido volvería a disparar el interceptor si no se excluye).
const SKIP_REFRESH_URLS = [
  '/login',
  '/login/verify-2fa',
  '/login/resend-2fa',
  '/forgot-password',
  '/reset-password',
  '/refresh',
  '/logout',
];

api.interceptors.request.use((config: InternalAxiosRequestConfig) => {
  const auth = useAuthStore();
  if (auth.accessToken) {
    config.headers.Authorization = `Bearer ${auth.accessToken}`;
  }
  const localeStore = useLocaleStore();
  config.headers['X-Locale'] = toApiLocale(localeStore.current);
  return config;
});

api.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => {
    const originalRequest = error.config as RetryableRequestConfig | undefined;

    if (
      error.response?.status !== 401 ||
      !originalRequest ||
      originalRequest._retry ||
      SKIP_REFRESH_URLS.includes(originalRequest.url ?? '')
    ) {
      return Promise.reject(error);
    }

    originalRequest._retry = true;
    const auth = useAuthStore();

    try {
      await auth.refreshToken();
    } catch (refreshError) {
      await auth.logout();
      const rejection =
        refreshError instanceof Error ? refreshError : new Error(String(refreshError));
      return Promise.reject(rejection);
    }

    return api(originalRequest);
  },
);

export default defineBoot(({ app }) => {
  app.config.globalProperties.$axios = axios;
  app.config.globalProperties.$api = api;
});

export { api };
