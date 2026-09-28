import { defineStore } from 'pinia';
import { ref } from 'vue';
import { api } from '@/boot/axios';

export interface BusinessConfigItem {
  key: string;
  value: number | string | boolean | null | unknown[] | Record<string, unknown>;
  description: string;
  editable: boolean;
}

export interface BusinessCategory {
  key: string;
  label: string;
  description: string;
  items: BusinessConfigItem[];
}

// Forma cruda de GET /config/business:
// data.categories.{claveCategoria} = { label, description, items: { [claveRegla]: { value, description, editable } } }
type RawBusinessConfig = {
  categories: Record<
    string,
    {
      label: string;
      description: string;
      items: Record<
        string,
        { value: BusinessConfigItem['value']; description: string; editable: boolean }
      >;
    }
  >;
};

function mapCategories(raw: RawBusinessConfig['categories']): BusinessCategory[] {
  return Object.entries(raw).map(([key, category]) => ({
    key,
    label: category.label,
    description: category.description,
    items: Object.entries(category.items).map(([itemKey, item]) => ({
      key: itemKey,
      value: item.value,
      description: item.description,
      editable: item.editable,
    })),
  }));
}

export const useConfigStore = defineStore('config', () => {
  const categories = ref<BusinessCategory[]>([]);
  const loading = ref(false);
  const saving = ref(false);

  async function fetchBusinessConfig() {
    loading.value = true;
    try {
      const response = await api.get<{ data: RawBusinessConfig }>('/config/business');
      categories.value = mapCategories(response.data.data.categories);
    } finally {
      loading.value = false;
    }
  }

  async function updateBusinessConfig(changes: Record<string, number | string | boolean>) {
    saving.value = true;
    try {
      await api.patch('/config/business', changes);
      await fetchBusinessConfig();
    } finally {
      saving.value = false;
    }
  }

  return {
    categories,
    loading,
    saving,
    fetchBusinessConfig,
    updateBusinessConfig,
  };
});
