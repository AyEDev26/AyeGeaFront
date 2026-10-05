<template>
  <AdminPageWrapper wide align-top>
    <GlassCard class="q-pa-md animate__fadeIn" style="min-height: 50vh">
      <div class="row items-center justify-between q-mb-md q-col-gutter-sm">
        <div>
          <div class="text-h5 text-weight-bolder text-teal-10 font-outfit">
            {{ t('admin.organizationReport.title') }}
          </div>
          <div class="org-meta">
            {{ t('admin.organizationReport.subtitle') }}
          </div>
        </div>
        <div class="row items-center q-gutter-sm">
          <q-btn
            flat
            no-caps
            color="grey-8"
            icon="unfold_more"
            :label="t('admin.organizationReport.expandAll')"
            :disable="!hasTree"
            @click="treeRef?.expandAll()"
          />
          <q-btn
            flat
            no-caps
            color="grey-8"
            icon="unfold_less"
            :label="t('admin.organizationReport.collapseAll')"
            :disable="!hasTree"
            @click="treeRef?.collapseAll()"
          />
          <q-btn
            unelevated
            no-caps
            color="primary"
            icon="refresh"
            class="elegant-btn"
            :label="t('admin.organizationReport.refresh')"
            :loading="loading"
            @click="loadReport"
          />
        </div>
      </div>

      <div v-if="loading && !hasTree" class="column items-center q-pa-xl text-grey-7">
        <q-spinner color="primary" size="40px" />
        <div class="q-mt-sm">{{ t('admin.organizationReport.loading') }}</div>
      </div>

      <q-banner v-else-if="forbidden" rounded class="bg-orange-1 text-orange-10">
        <template #avatar>
          <q-icon name="lock" color="orange-8" />
        </template>
        <div class="text-weight-medium">{{ t('admin.organizationReport.forbiddenTitle') }}</div>
        <div>{{ t('admin.organizationReport.forbiddenMessage') }}</div>
      </q-banner>

      <q-banner v-else-if="errorMessage" rounded class="bg-red-1 text-red-10">
        <template #avatar>
          <q-icon name="error_outline" color="negative" />
        </template>
        {{ errorMessage }}
        <template #action>
          <q-btn
            flat
            no-caps
            color="negative"
            :label="t('admin.organizationReport.retry')"
            @click="loadReport"
          />
        </template>
      </q-banner>

      <div v-else-if="!hasTree" class="text-center text-grey-7 q-pa-xl">
        <q-icon name="account_tree" size="48px" class="q-mb-sm" />
        <div>{{ t('admin.organizationReport.empty') }}</div>
      </div>

      <q-tree
        v-else
        ref="treeRef"
        :nodes="tree"
        node-key="key"
        no-selection-unset
        class="org-tree"
      >
        <template #default-header="{ node }">
          <div v-if="node.kind === 'delegacion'" class="org-line org-delegacion">
            <q-icon name="business" color="teal-8" size="sm" />
            <span class="text-weight-bold">{{ delegacionLabel(node) }}</span>
            <q-badge rounded color="teal-1" text-color="teal-10">
              {{ t('admin.organizationReport.counts.almacenes', { count: node.counts.almacenes }) }}
            </q-badge>
            <q-badge rounded color="blue-grey-1" text-color="blue-grey-10">
              {{
                t('admin.organizationReport.counts.ubicaciones', {
                  count: node.counts.ubicaciones,
                })
              }}
            </q-badge>
            <q-badge rounded color="blue-1" text-color="blue-10">
              {{ t('admin.organizationReport.counts.usuarios', { count: node.counts.usuarios }) }}
            </q-badge>
          </div>

          <div v-else-if="node.kind === 'almacen'" class="org-line">
            <q-icon
              :name="node.almacen ? 'warehouse' : 'help_outline'"
              :color="node.almacen ? 'teal-7' : 'grey-6'"
              size="sm"
            />
            <template v-if="node.almacen">
              <span class="text-weight-medium">{{ node.almacen.nombre }}</span>
              <span v-if="node.almacen.prefijo" class="org-meta">
                {{ t('admin.organizationReport.fields.prefijo') }}: {{ node.almacen.prefijo }}
              </span>
              <span class="org-meta">
                {{ t('admin.organizationReport.fields.ubicacion') }}:
                {{ node.almacen.ubicacion?.nombre ?? noValue }}
              </span>
              <span class="org-meta">
                {{ t('admin.organizationReport.fields.responsable') }}:
                {{ node.almacen.responsable?.name ?? noValue }}
              </span>
            </template>
            <span v-else class="text-weight-medium text-grey-8">
              {{ t('admin.organizationReport.noAlmacen') }}
            </span>
            <q-badge rounded color="blue-1" text-color="blue-10">
              {{ t('admin.organizationReport.counts.usuarios', { count: node.usuariosCount }) }}
            </q-badge>
          </div>

          <div v-else class="org-line org-usuario">
            <q-icon name="person" color="blue-grey-6" size="xs" />
            <span>{{ node.user.name }}</span>
            <span class="org-meta">
              {{ t('admin.organizationReport.fields.alias') }}:
              {{ node.user.alias || noValue }}
            </span>
            <q-chip dense square color="teal-1" text-color="teal-10" class="q-ma-none">
              {{ t('admin.organizationReport.fields.departamento') }}:
              {{ node.user.departamento?.nombre ?? noValue }}
            </q-chip>
          </div>
        </template>

        <template #default-body="{ node }">
          <div v-if="node.kind === 'delegacion'" class="q-pl-lg q-pb-sm">
            <div class="text-caption text-weight-bold text-grey-8 q-mb-xs">
              {{ t('admin.organizationReport.locationsBlock') }}
            </div>
            <div v-if="node.ubicaciones.length === 0" class="text-caption text-grey-6">
              {{ t('admin.organizationReport.noLocations') }}
            </div>
            <div
              v-for="ubicacion in node.ubicaciones"
              :key="ubicacion.id"
              class="org-line text-caption"
            >
              <q-icon name="place" color="blue-grey-6" size="xs" />
              <span class="text-weight-medium">{{ ubicacion.nombre }}</span>
              <span class="org-meta">{{ ubicacion.direccion || noValue }}</span>
            </div>
          </div>
        </template>
      </q-tree>
    </GlassCard>
  </AdminPageWrapper>
</template>

<script setup lang="ts">
import { computed, onMounted, ref } from 'vue';
import { useI18n } from 'vue-i18n';
import { isAxiosError } from 'axios';
import type { QTree } from 'quasar';
import { useAlmacenesStore } from '@/stores/almacenes';
import { useDelegacionesStore } from '@/stores/delegaciones';
import { useUbicacionesStore } from '@/stores/ubicaciones';
import { useUsersStore } from '@/stores/users';
import { getApiErrorMessage } from '@/utils/api-error';
import { buildOrganizationTree, type OrgNode } from '@/utils/organization-tree';
import AdminPageWrapper from '@/components/common/AdminPageWrapper.vue';
import GlassCard from '@/components/common/GlassCard.vue';

const { t } = useI18n();
const delegacionesStore = useDelegacionesStore();
const ubicacionesStore = useUbicacionesStore();
const almacenesStore = useAlmacenesStore();
const usersStore = useUsersStore();

const treeRef = ref<QTree | null>(null);
const tree = ref<OrgNode[]>([]);
const loading = ref(false);
const forbidden = ref(false);
const errorMessage = ref('');

const hasTree = computed(() => tree.value.length > 0);
const noValue = computed(() => t('admin.organizationReport.noValue'));

function delegacionLabel(node: Extract<OrgNode, { kind: 'delegacion' }>) {
  return node.id === null ? t('admin.organizationReport.noDelegacion') : node.nombre;
}

async function loadReport() {
  loading.value = true;
  forbidden.value = false;
  errorMessage.value = '';
  try {
    const [delegaciones, ubicaciones, almacenes, users] = await Promise.all([
      delegacionesStore.fetchAllDelegaciones(),
      ubicacionesStore.fetchAllUbicaciones(),
      almacenesStore.fetchAllAlmacenes(),
      usersStore.fetchAllUsers(),
    ]);
    tree.value = buildOrganizationTree({ delegaciones, ubicaciones, almacenes, users });
  } catch (error) {
    // Nunca se muestra un árbol parcial: ante cualquier fallo se descarta el anterior.
    tree.value = [];
    if (isAxiosError(error) && error.response?.status === 403) {
      forbidden.value = true;
    } else {
      errorMessage.value = getApiErrorMessage(error, t('admin.organizationReport.fetchError'));
    }
  } finally {
    loading.value = false;
  }
}

onMounted(loadReport);
</script>

<style scoped>
.org-tree {
  color: #263238;
}

.org-tree :deep(.q-tree__node-header) {
  flex-wrap: wrap;
  padding: 6px 8px;
  border-radius: 8px;
  transition: background 0.2s ease;
}

.org-tree :deep(.q-tree__node-header:hover) {
  background: rgba(0, 150, 136, 0.08);
}

/* Delegaciones (nivel 1): barra teal suave para separarlas visualmente */
.org-tree :deep(.q-tree__node-header:has(.org-delegacion)) {
  background: rgba(0, 150, 136, 0.1);
  border-left: 4px solid #00897b;
  margin-top: 6px;
}

.org-tree :deep(.q-tree__node-header:has(.org-delegacion):hover) {
  background: rgba(0, 150, 136, 0.16);
}

/* Usuarios (hojas): filas lo más compactas posible */
.org-tree :deep(.q-tree__node-header:has(.org-usuario)) {
  padding-top: 0;
  padding-bottom: 0;
  margin-top: 0;
  min-height: 0;
}

.org-tree :deep(.q-tree__node:has(> .q-tree__node-header .org-usuario)) {
  padding-bottom: 0;
}

.org-usuario {
  line-height: 1.2;
}

.org-usuario :deep(.q-chip) {
  height: 1.4em;
  font-size: 0.7rem;
}

.org-line {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 4px 10px;
  min-width: 0;
}

.org-meta {
  color: #607d8b;
  font-size: 0.75rem;
  overflow-wrap: anywhere;
}

/* Tema "Claro": acento plano, sin tintes translúcidos */
[data-theme='claro'] .org-tree :deep(.q-tree__node-header:has(.org-delegacion)) {
  background: #eceff1;
  border-left-color: #f59e0b;
}

[data-theme='claro'] .org-tree :deep(.q-tree__node-header:has(.org-delegacion):hover) {
  background: #e2e8ee;
}

@media (max-width: 599px) {
  .org-tree :deep(.q-tree__node-header) {
    padding: 6px 4px;
  }

  .org-line {
    gap: 4px 6px;
  }
}
</style>
