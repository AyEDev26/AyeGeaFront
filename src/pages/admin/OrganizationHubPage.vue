<template>
  <AdminPageWrapper wide align-top>
    <GlassCard class="q-pa-md animate__fadeIn" style="min-height: 50vh">
      <div class="q-mb-md">
        <div class="text-h5 text-weight-bolder text-teal-10 font-outfit">
          {{ t('admin.organizationHub.title') }}
        </div>
        <div class="hub-meta">
          {{ t('admin.organizationHub.subtitle') }}
        </div>
      </div>

      <q-banner v-if="!visibleCards.length" rounded class="bg-orange-1 text-orange-10">
        <template #avatar>
          <q-icon name="lock" color="orange-8" />
        </template>
        <div class="text-weight-medium">{{ t('admin.organizationHub.noAccessTitle') }}</div>
        <div>{{ t('admin.organizationHub.noAccessMessage') }}</div>
      </q-banner>

      <div v-else class="row q-col-gutter-md">
        <div v-for="card in visibleCards" :key="card.key" class="col-12 col-sm-6 col-md-4">
          <router-link :to="card.to" class="hub-card-link">
            <q-card flat bordered class="hub-card">
              <q-card-section class="row items-start no-wrap q-gutter-md">
                <q-avatar color="teal-1" text-color="teal-9" :icon="card.icon" size="48px" />
                <div class="hub-card__body">
                  <div class="text-subtitle1 text-weight-bold text-teal-10 font-outfit">
                    {{ t(card.titleKey) }}
                  </div>
                  <div class="hub-meta">{{ t(card.descriptionKey) }}</div>
                </div>
              </q-card-section>
            </q-card>
          </router-link>
        </div>
      </div>
    </GlassCard>
  </AdminPageWrapper>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import { useI18n } from 'vue-i18n';
import { useAuthStore } from '@/stores/auth';
import AdminPageWrapper from '@/components/common/AdminPageWrapper.vue';
import GlassCard from '@/components/common/GlassCard.vue';

interface OrgHubCard {
  key: string;
  to: string;
  icon: string;
  titleKey: string;
  descriptionKey: string;
  visible: () => boolean;
}

const { t } = useI18n();
const auth = useAuthStore();

// Rutas, iconos y permisos replican los ítems del grupo "Organización" de MainLayout.vue:
// si cambian allí, hay que cambiarlos aquí.
const cards: OrgHubCard[] = [
  {
    key: 'departamentos',
    to: '/admin/departamentos',
    icon: 'account_tree',
    titleKey: 'admin.organizationHub.cards.departamentos.title',
    descriptionKey: 'admin.organizationHub.cards.departamentos.description',
    visible: () => auth.hasPermission('catalogos.ver'),
  },
  {
    key: 'delegaciones',
    to: '/admin/delegaciones',
    icon: 'business',
    titleKey: 'admin.organizationHub.cards.delegaciones.title',
    descriptionKey: 'admin.organizationHub.cards.delegaciones.description',
    visible: () => auth.hasPermission('delegaciones.ver'),
  },
  {
    key: 'almacenes',
    to: '/admin/almacenes',
    icon: 'warehouse',
    titleKey: 'admin.organizationHub.cards.almacenes.title',
    descriptionKey: 'admin.organizationHub.cards.almacenes.description',
    visible: () => auth.hasPermission('catalogos.ver'),
  },
  {
    key: 'ubicaciones',
    to: '/admin/ubicaciones',
    icon: 'place',
    titleKey: 'admin.organizationHub.cards.ubicaciones.title',
    descriptionKey: 'admin.organizationHub.cards.ubicaciones.description',
    visible: () => auth.hasPermission('catalogos.ver'),
  },
  {
    key: 'informe',
    to: '/admin/informes/organizacion',
    icon: 'schema',
    titleKey: 'admin.organizationHub.cards.informe.title',
    descriptionKey: 'admin.organizationHub.cards.informe.description',
    visible: () =>
      auth.hasPermission('usuarios.ver') &&
      auth.hasPermission('delegaciones.ver') &&
      auth.hasPermission('catalogos.ver'),
  },
];

const visibleCards = computed(() => cards.filter((card) => card.visible()));
</script>

<style scoped>
.hub-meta {
  color: #607d8b;
  font-size: 0.8rem;
}

.hub-card-link {
  display: block;
  height: 100%;
  color: inherit;
  text-decoration: none;
  border-radius: 8px;
}

.hub-card-link:focus-visible {
  outline: 2px solid #00897b;
  outline-offset: 2px;
}

.hub-card {
  height: 100%;
  background: rgba(255, 255, 255, 0.55);
  transition:
    transform 0.15s ease,
    box-shadow 0.15s ease;
}

.hub-card-link:hover .hub-card {
  transform: translateY(-2px);
  box-shadow: 0 6px 18px rgba(0, 77, 64, 0.15);
}

.hub-card__body {
  min-width: 0;
  overflow-wrap: anywhere;
}

/* Tema "Claro": tarjetas opacas, acento plano, sin tintes translúcidos */
[data-theme='claro'] .hub-card {
  background: #ffffff;
  border-color: rgba(15, 23, 42, 0.08);
  border-radius: 16px;
}

[data-theme='claro'] .hub-card-link {
  border-radius: 16px;
}

[data-theme='claro'] .hub-card-link:hover .hub-card {
  box-shadow: 0 6px 18px rgba(15, 23, 42, 0.12);
}

@media (prefers-reduced-motion: reduce) {
  .hub-card {
    transition: none;
  }

  .hub-card-link:hover .hub-card {
    transform: none;
  }
}
</style>
