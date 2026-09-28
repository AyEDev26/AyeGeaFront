import { defineStore } from 'pinia';
import { computed, ref } from 'vue';
import { api } from '@/boot/axios';

export interface AuthUser {
  id: number;
  name: string;
  email: string;
  alias: string | null;
  isActive: boolean;
  isLocked: boolean;
  avatarUrl: string | null;
  lastLoginAt: string | null;
  roles: string[];
  permissions: string[];
}

// Forma cruda del UserResource del backend (ver GET /api/documentation, schema UserResource).
interface UserResource {
  id: number;
  name: string;
  email: string;
  alias: string | null;
  is_active: boolean;
  is_locked: boolean;
  avatarUrl: string | null;
  last_login_at: string | null;
  roles: string[];
  permissions: string[];
}

interface LoginResponseData {
  access_token?: string;
  token_type?: string;
  expires_in?: number;
  user?: UserResource;
  two_factor_required?: boolean;
}

interface LoginSuccessData {
  access_token: string;
  token_type: string;
  expires_in: number;
  user: UserResource;
}

interface StoredSession {
  user: AuthUser | null;
  accessToken: string | null;
  tokenType: string | null;
  expiresAt: number | null;
}

// Deliberadamente sin roles/is_active: un usuario nunca puede auto-otorgárselos vía /perfil.
export interface UpdateProfilePayload {
  name?: string;
  email?: string;
  alias?: string;
  password?: string;
  password_confirmation?: string;
}

const STORAGE_KEY = 'auth:v1';

function mapUser(resource: UserResource): AuthUser {
  const user = {
    id: resource.id,
    name: resource.name,
    email: resource.email,
    alias: resource.alias,
    isActive: resource.is_active,
    isLocked: resource.is_locked,
    avatarUrl: resource.avatarUrl,
    lastLoginAt: resource.last_login_at,
    roles: resource.roles,
    permissions: resource.permissions,
  };
  console.log('[auth] usuario obtenido:', user);
  return user;
}

function readStoredSession(): StoredSession | null {
  const raw = localStorage.getItem(STORAGE_KEY);
  if (!raw) {
    return null;
  }
  try {
    return JSON.parse(raw) as StoredSession;
  } catch {
    return null;
  }
}

export const useAuthStore = defineStore('auth', () => {
  const user = ref<AuthUser | null>(null);
  const accessToken = ref<string | null>(null);
  const tokenType = ref<string | null>(null);
  const expiresAt = ref<number | null>(null);
  const twoFactorPendingEmail = ref<string | null>(null);

  const isAuthenticated = computed(() => !!accessToken.value);
  const isTwoFactorPending = computed(() => !!twoFactorPendingEmail.value);

  function hasPermission(permission: string): boolean {
    return (user.value?.permissions ?? []).includes(permission);
  }

  function persist() {
    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({
        user: user.value,
        accessToken: accessToken.value,
        tokenType: tokenType.value,
        expiresAt: expiresAt.value,
      }),
    );
  }

  function setSession(data: LoginSuccessData) {
    user.value = mapUser(data.user);
    accessToken.value = data.access_token;
    tokenType.value = data.token_type;
    expiresAt.value = Date.now() + data.expires_in * 1000;
    twoFactorPendingEmail.value = null;
    persist();
  }

  function clearSession() {
    user.value = null;
    accessToken.value = null;
    tokenType.value = null;
    expiresAt.value = null;
    twoFactorPendingEmail.value = null;
    localStorage.removeItem(STORAGE_KEY);
  }

  async function login(email: string, password: string) {
    const response = await api.post<{ data: LoginResponseData }>('/login', {
      email,
      password,
    });
    const data = response.data.data;
    if (data.two_factor_required) {
      twoFactorPendingEmail.value = email;
      return;
    }
    setSession(data as LoginSuccessData);
  }

  async function verifyTwoFactor(code: string) {
    const email = twoFactorPendingEmail.value;
    if (!email) {
      throw new Error('No hay una verificación 2FA pendiente.');
    }
    const response = await api.post<{ data: LoginResponseData }>('/login/verify-2fa', {
      email,
      code,
    });
    setSession(response.data.data as LoginSuccessData);
  }

  async function resendTwoFactor() {
    const email = twoFactorPendingEmail.value;
    if (!email) {
      throw new Error('No hay una verificación 2FA pendiente.');
    }
    await api.post('/login/resend-2fa', { email });
  }

  async function logout() {
    try {
      await api.post('/logout');
    } catch {
      // Se limpia la sesión localmente aunque la llamada al backend falle.
    }
    clearSession();
  }

  async function refreshToken() {
    const response = await api.post<{ data: LoginResponseData }>('/refresh');
    setSession(response.data.data as LoginSuccessData);
  }

  async function fetchMe() {
    if (!accessToken.value) {
      const stored = readStoredSession();
      if (!stored?.accessToken) {
        return;
      }
      user.value = stored.user;
      accessToken.value = stored.accessToken;
      tokenType.value = stored.tokenType;
      expiresAt.value = stored.expiresAt;
    }
    try {
      const response = await api.get<{ data: UserResource }>('/me');
      user.value = mapUser(response.data.data);
    } catch (error) {
      clearSession();
      throw error;
    }
  }

  async function updateProfile(payload: UpdateProfilePayload) {
    if (!user.value) {
      return;
    }
    await api.put(`/users/${user.value.id}`, payload);
    await fetchMe();
  }

  async function uploadOwnAvatar(file: File) {
    if (!user.value) {
      return;
    }
    const formData = new FormData();
    formData.append('avatar', file);
    await api.post(`/users/${user.value.id}/avatar`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    await fetchMe();
  }

  return {
    user,
    accessToken,
    tokenType,
    expiresAt,
    twoFactorPendingEmail,
    isAuthenticated,
    isTwoFactorPending,
    hasPermission,
    login,
    verifyTwoFactor,
    resendTwoFactor,
    logout,
    refreshToken,
    fetchMe,
    updateProfile,
    uploadOwnAvatar,
  };
});
