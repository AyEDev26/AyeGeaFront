import { defineStore } from 'pinia';
import { ref } from 'vue';
import { api } from '@/boot/axios';
import type { PaginationMeta } from '@/stores/users';

export interface ActivityLogEntry {
  id: number;
  logName: string | null;
  event: string | null;
  description: string;
  subjectType: string | null;
  subjectId: number | null;
  causerId: number | null;
  causer: { id: number; name: string; email: string } | null;
  properties: Record<string, unknown> | null;
  createdAt: string; // ISO date-time, tal como lo devuelve el backend
}

export interface ActivityLogFilters {
  logName?: string;
  event?: string;
  description?: string;
  causerId?: number;
  createdFrom?: string; // 'YYYY-MM-DD'
  createdTo?: string; // 'YYYY-MM-DD'
}

// Forma cruda del ActivityLogResource del backend (ver GET /api/documentation).
interface ActivityLogResource {
  id: number;
  log_name: string | null;
  event: string | null;
  description: string;
  subject_type: string | null;
  subject_id: number | null;
  causer_id: number | null;
  causer: { id: number; name: string; email: string } | null;
  properties: Record<string, unknown> | null;
  created_at: string;
}

interface RawPaginationMeta {
  current_page: number;
  last_page: number;
  per_page: number;
  total: number;
}

function mapActivityLogEntry(resource: ActivityLogResource): ActivityLogEntry {
  return {
    id: resource.id,
    logName: resource.log_name,
    event: resource.event,
    description: resource.description,
    subjectType: resource.subject_type,
    subjectId: resource.subject_id,
    causerId: resource.causer_id,
    causer: resource.causer,
    properties: resource.properties,
    createdAt: resource.created_at,
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

export const useActivityLogStore = defineStore('activityLog', () => {
  const items = ref<ActivityLogEntry[]>([]);
  const meta = ref<PaginationMeta>({
    currentPage: 1,
    lastPage: 1,
    perPage: 15,
    total: 0,
  });
  const loading = ref(false);

  async function fetchLogs(page = 1, perPage = 15, filters: ActivityLogFilters = {}) {
    loading.value = true;
    try {
      const response = await api.get<{
        data: { items: ActivityLogResource[]; meta: RawPaginationMeta };
      }>('/activity-log', {
        params: {
          page,
          per_page: perPage,
          log_name: filters.logName || undefined,
          event: filters.event || undefined,
          description: filters.description || undefined,
          causer_id: filters.causerId || undefined,
          created_from: filters.createdFrom || undefined,
          created_to: filters.createdTo || undefined,
        },
      });
      items.value = response.data.data.items.map(mapActivityLogEntry);
      meta.value = mapMeta(response.data.data.meta);
    } finally {
      loading.value = false;
    }
  }

  return {
    items,
    meta,
    loading,
    fetchLogs,
  };
});
