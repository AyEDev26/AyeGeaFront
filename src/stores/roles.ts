import { defineStore } from 'pinia';
import { ref } from 'vue';
import { api } from '@/boot/axios';

export interface Role {
  id: number;
  name: string;
  permissions: string[];
}

export interface PermissionItem {
  id: number;
  name: string; // ej: "usuarios.ver"
  group: string | null; // ej: "usuarios", "negocio"; null/"" si el backend no asigna grupo
}

export const useRolesStore = defineStore('roles', () => {
  const roles = ref<Role[]>([]);
  const permissions = ref<PermissionItem[]>([]);
  const loading = ref(false);

  async function fetchRoles() {
    loading.value = true;
    try {
      const response = await api.get<{ data: Role[] }>('/roles');
      roles.value = response.data.data;
    } finally {
      loading.value = false;
    }
  }

  async function fetchPermissions() {
    loading.value = true;
    try {
      const response = await api.get<{ data: PermissionItem[] }>('/permissions');
      permissions.value = response.data.data;
    } finally {
      loading.value = false;
    }
  }

  function replaceRole(updatedRole: Role) {
    const index = roles.value.findIndex((role) => role.id === updatedRole.id);
    if (index !== -1) {
      roles.value[index] = updatedRole;
    }
  }

  async function assignPermissions(roleId: number, permissionNames: string[]) {
    const response = await api.post<{ data: Role }>(`/roles/${roleId}/permissions`, {
      permissions: permissionNames,
    });
    replaceRole(response.data.data);
  }

  async function removePermissions(roleId: number, permissionNames: string[]) {
    const response = await api.delete<{ data: Role }>(`/roles/${roleId}/permissions`, {
      data: { permissions: permissionNames },
    });
    replaceRole(response.data.data);
  }

  return {
    roles,
    permissions,
    loading,
    fetchRoles,
    fetchPermissions,
    assignPermissions,
    removePermissions,
  };
});
