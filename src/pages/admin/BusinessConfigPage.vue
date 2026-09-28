<template>
  <AdminPageWrapper>
    <GlassCard class="q-pa-md animate__fadeIn">
      <div class="text-h5 text-weight-bolder text-teal-10 font-outfit q-mb-md">
        {{ t('admin.businessConfig.title') }}
      </div>

      <div v-if="configStore.loading" class="flex flex-center q-pa-xl">
        <q-spinner color="teal" size="3em" />
      </div>

      <div v-else-if="configStore.categories.length === 0" class="text-grey-7 q-pa-md">
        {{ t('admin.businessConfig.emptyRules') }}
      </div>

      <template v-else>
        <q-input
          v-model="searchQuery"
          outlined
          dense
          clearable
          class="elegant-input q-mb-md"
          :placeholder="t('admin.businessConfig.searchPlaceholder')"
        >
          <template #prepend>
            <q-icon name="search" />
          </template>
        </q-input>

        <div v-if="!hasAnySearchMatch" class="text-grey-7 q-pa-md">
          {{ t('admin.businessConfig.searchEmpty') }}
        </div>

        <template v-else>
          <q-tabs
            v-model="activeTab"
            class="text-teal-9"
            active-color="teal-9"
            indicator-color="teal-9"
            align="left"
            dense
          >
            <q-tab
              v-for="category in configStore.categories"
              :key="category.key"
              :name="category.key"
              :label="category.label"
            >
              <q-badge
                v-if="dirtyKeysForCategory(category).length > 0"
                color="orange-8"
                floating
                rounded
              />
            </q-tab>
          </q-tabs>

          <q-separator />

          <div class="row justify-end q-gutter-sm q-my-sm config-actions">
            <template
              v-if="canEdit && activeCategory && dirtyKeysForCategory(activeCategory).length > 0"
            >
              <q-btn
                flat
                color="grey-8"
                :label="t('admin.businessConfig.discardButton')"
                :disable="configStore.saving"
                @click="onDiscardCategory(activeCategory)"
              />
              <q-btn
                unelevated
                color="teal"
                :label="t('admin.businessConfig.saveButton')"
                :loading="configStore.saving"
                @click="onSaveCategory(activeCategory)"
              />
            </template>
          </div>

          <q-tab-panels v-model="activeTab" animated class="config-tab-panels">
            <q-tab-panel
              v-for="category in configStore.categories"
              :key="category.key"
              :name="category.key"
            >
              <div class="text-body2 text-grey-7 q-mb-md">{{ category.description }}</div>

              <q-list v-if="visibleItems(category).length > 0" separator>
                <q-item v-for="item in visibleItems(category)" :key="item.key" class="q-py-md">
                  <q-item-section>
                    <template v-if="typeof item.value === 'number'">
                      <q-input
                        v-model.number="draft[item.key] as number"
                        type="number"
                        outlined
                        dense
                        class="elegant-input"
                        :label="item.key"
                        :hint="item.description"
                        :disable="!isItemEditable(item)"
                      >
                        <template v-if="!isItemEditable(item)" #append>
                          <q-icon name="lock" color="grey-6" size="xs">
                            <q-tooltip>{{ readOnlyReason(item) }}</q-tooltip>
                          </q-icon>
                        </template>
                      </q-input>
                    </template>

                    <template v-else-if="typeof item.value === 'boolean'">
                      <div class="row items-center q-gutter-xs">
                        <div class="text-weight-medium">{{ item.key }}</div>
                        <q-icon v-if="!isItemEditable(item)" name="lock" color="grey-6" size="xs">
                          <q-tooltip>{{ readOnlyReason(item) }}</q-tooltip>
                        </q-icon>
                      </div>
                      <q-toggle
                        v-model="draft[item.key] as boolean"
                        color="teal"
                        :disable="!isItemEditable(item)"
                      />
                      <div class="text-caption text-grey-7">{{ item.description }}</div>
                    </template>

                    <template v-else-if="typeof item.value === 'string'">
                      <q-input
                        v-model="draft[item.key] as string"
                        outlined
                        dense
                        class="elegant-input"
                        :label="item.key"
                        :hint="item.description"
                        :disable="!isItemEditable(item)"
                      >
                        <template v-if="!isItemEditable(item)" #append>
                          <q-icon name="lock" color="grey-6" size="xs">
                            <q-tooltip>{{ readOnlyReason(item) }}</q-tooltip>
                          </q-icon>
                        </template>
                      </q-input>
                    </template>

                    <template v-else>
                      <div class="text-weight-medium">{{ item.key }}</div>
                      <div class="text-body2 text-grey-8">{{ JSON.stringify(item.value) }}</div>
                      <div class="text-caption text-grey-7">{{ item.description }}</div>
                    </template>
                  </q-item-section>
                </q-item>
              </q-list>
              <div v-else class="text-grey-7 q-pa-md">
                {{ t('admin.businessConfig.searchEmpty') }}
              </div>
            </q-tab-panel>
          </q-tab-panels>
        </template>
      </template>
    </GlassCard>
  </AdminPageWrapper>
</template>

<style scoped>
.config-actions {
  min-height: 36px;
}

.config-tab-panels {
  height: 520px;
  overflow-y: auto;
}
</style>

<script setup lang="ts">
import { computed, onMounted, reactive, ref, watch } from 'vue';
import { useQuasar } from 'quasar';
import { useI18n } from 'vue-i18n';
import { useConfigStore, type BusinessCategory, type BusinessConfigItem } from '@/stores/config';
import { useAuthStore } from '@/stores/auth';
import { getApiErrorMessage } from '@/utils/api-error';
import AdminPageWrapper from '@/components/common/AdminPageWrapper.vue';
import GlassCard from '@/components/common/GlassCard.vue';

const $q = useQuasar();
const { t } = useI18n();
const configStore = useConfigStore();
const auth = useAuthStore();

const canEdit = computed(() => auth.hasPermission('configuracion.editar'));

function isItemEditable(item: BusinessConfigItem): boolean {
  return canEdit.value && item.editable;
}

function readOnlyReason(item: BusinessConfigItem): string {
  if (!canEdit.value) {
    return t('admin.businessConfig.readOnlyNoPermission');
  }
  if (!item.editable) {
    return t('admin.businessConfig.readOnlyNotEditable');
  }
  return '';
}

const activeTab = ref<string>('');

const activeCategory = computed(() =>
  configStore.categories.find((category) => category.key === activeTab.value),
);

const allItems = computed(() => configStore.categories.flatMap((category) => category.items));

const draft = reactive<Record<string, number | string | boolean>>({});

function resetDraft() {
  for (const key of Object.keys(draft)) {
    delete draft[key];
  }
  for (const item of allItems.value) {
    if (
      typeof item.value === 'number' ||
      typeof item.value === 'string' ||
      typeof item.value === 'boolean'
    ) {
      draft[item.key] = item.value;
    }
  }
}

function resetCategoryDraft(category: BusinessCategory) {
  for (const item of category.items) {
    if (
      typeof item.value === 'number' ||
      typeof item.value === 'string' ||
      typeof item.value === 'boolean'
    ) {
      draft[item.key] = item.value;
    }
  }
}

const dirtyKeys = computed(() =>
  Object.keys(draft).filter((key) => {
    const item = allItems.value.find((i) => i.key === key);
    return item !== undefined && draft[key] !== item.value;
  }),
);

function dirtyKeysForCategory(category: BusinessCategory): string[] {
  const itemKeys = new Set(category.items.map((item) => item.key));
  return dirtyKeys.value.filter((key) => itemKeys.has(key));
}

const searchQuery = ref('');

function matchesSearch(item: BusinessConfigItem): boolean {
  const query = (searchQuery.value ?? '').trim().toLowerCase();
  if (!query) {
    return true;
  }
  return item.key.toLowerCase().includes(query) || item.description.toLowerCase().includes(query);
}

function visibleItems(category: BusinessCategory): BusinessConfigItem[] {
  return category.items.filter(matchesSearch);
}

const hasAnySearchMatch = computed(() =>
  configStore.categories.some((category) => category.items.some(matchesSearch)),
);

watch(searchQuery, () => {
  const activeCategory = configStore.categories.find(
    (category) => category.key === activeTab.value,
  );
  const activeHasMatch = activeCategory ? activeCategory.items.some(matchesSearch) : false;
  if (activeHasMatch) {
    return;
  }
  const firstMatch = configStore.categories.find((category) => category.items.some(matchesSearch));
  if (firstMatch) {
    activeTab.value = firstMatch.key;
  }
});

function notifyError(error: unknown, fallback: string) {
  $q.notify({ type: 'negative', color: 'red-9', message: getApiErrorMessage(error, fallback) });
}

async function onSaveCategory(category: BusinessCategory) {
  const keys = dirtyKeysForCategory(category);
  const changes: Record<string, number | string | boolean> = {};
  for (const key of keys) {
    changes[key] = draft[key] as number | string | boolean;
  }

  try {
    await configStore.updateBusinessConfig(changes);
    const updated = configStore.categories.find((c) => c.key === category.key);
    if (updated) {
      resetCategoryDraft(updated);
    }
    $q.notify({ type: 'positive', message: t('admin.businessConfig.saveSuccess') });
  } catch (error) {
    notifyError(error, t('admin.businessConfig.saveError'));
  }
}

function onDiscardCategory(category: BusinessCategory) {
  resetCategoryDraft(category);
}

onMounted(async () => {
  try {
    await configStore.fetchBusinessConfig();
    resetDraft();
    if (configStore.categories.length > 0) {
      activeTab.value = configStore.categories[0]!.key;
    }
  } catch (error) {
    notifyError(error, t('admin.businessConfig.fetchError'));
  }
});
</script>
