import { defineStore } from 'pinia';
import { ref } from 'vue';
import { api } from '@/boot/axios';

export interface AdminUser {
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

export interface UsersFilters {
  name?: string;
  email?: string;
  alias?: string;
  isActive?: boolean;
  role?: string; // se manda como query param "roles" (nombre exacto de un rol)
}

export interface PaginationMeta {
  currentPage: number;
  lastPage: number;
  perPage: number;
  total: number;
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

interface RawPaginationMeta {
  current_page: number;
  last_page: number;
  per_page: number;
  total: number;
}

function mapUser(resource: UserResource): AdminUser {
  return {
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
}

function mapMeta(meta: RawPaginationMeta): PaginationMeta {
  return {
    currentPage: meta.current_page,
    lastPage: meta.last_page,
    perPage: meta.per_page,
    total: meta.total,
  };
}

export interface CreateUserPayload {
  name: string;
  email: string;
  alias?: string;
  password: string;
  password_confirmation?: string;
  roles: string[];
}

export interface UpdateUserPayload {
  name?: string;
  email?: string;
  alias?: string;
  password?: string;
  password_confirmation?: string;
  is_active?: boolean;
  roles?: string[];
}

export const useUsersStore = defineStore('users', () => {
  const items = ref<AdminUser[]>([]);
  const meta = ref<PaginationMeta>({
    currentPage: 1,
    lastPage: 1,
    perPage: 15,
    total: 0,
  });
  const loading = ref(false);
  const searchingUsers = ref(false);
  const filters = ref<UsersFilters>({});

  function buildFilterParams(value: UsersFilters) {
    const params: Record<string, string | boolean> = {};
    if (value.name) params.name = value.name;
    if (value.email) params.email = value.email;
    if (value.alias) params.alias = value.alias;
    if (value.isActive !== undefined) params.is_active = value.isActive;
    if (value.role) params.roles = value.role;
    return params;
  }

  async function fetchUsers(page = 1, perPage = 15, newFilters: UsersFilters = {}) {
    loading.value = true;
    filters.value = newFilters;
    try {
      const response = await api.get<{
        data: { items: UserResource[]; meta: RawPaginationMeta };
      }>('/users', {
        params: { page, per_page: perPage, ...buildFilterParams(newFilters) },
      });
      items.value = response.data.data.items.map(mapUser);
      meta.value = mapMeta(response.data.data.meta);
    } finally {
      loading.value = false;
    }
  }

  async function createUser(payload: CreateUserPayload) {
    await api.post('/users', payload);
    await fetchUsers(meta.value.currentPage, meta.value.perPage, filters.value);
  }

  async function updateUser(id: number, payload: UpdateUserPayload) {
    await api.put(`/users/${id}`, payload);
    await fetchUsers(meta.value.currentPage, meta.value.perPage, filters.value);
  }

  async function deleteUser(id: number) {
    await api.delete(`/users/${id}`);
    await fetchUsers(meta.value.currentPage, meta.value.perPage, filters.value);
  }

  async function unlockUser(id: number) {
    await api.post(`/users/${id}/unlock`);
    await fetchUsers(meta.value.currentPage, meta.value.perPage, filters.value);
  }

  async function uploadAvatar(userId: number, file: File) {
    const formData = new FormData();
    formData.append('avatar', file);
    await api.post(`/users/${userId}/avatar`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    await fetchUsers(meta.value.currentPage, meta.value.perPage, filters.value);
  }

  async function searchUsersByName(name: string): Promise<AdminUser[]> {
    searchingUsers.value = true;
    try {
      const response = await api.get<{
        data: { items: UserResource[]; meta: RawPaginationMeta };
      }>('/users', {
        params: { name, per_page: 10 },
      });
      return response.data.data.items.map(mapUser);
    } finally {
      searchingUsers.value = false;
    }
  }

  return {
    items,
    meta,
    filters,
    loading,
    searchingUsers,
    fetchUsers,
    createUser,
    updateUser,
    deleteUser,
    unlockUser,
    uploadAvatar,
    searchUsersByName,
  };
});
