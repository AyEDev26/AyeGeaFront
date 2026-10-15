<template>
  <AdminPageWrapper wide align-top>
    <GlassCard class="q-pa-md animate__fadeIn" style="min-height: 50vh">
      <div class="q-mb-md">
        <div class="text-h5 text-weight-bolder text-teal-10 font-outfit">
          {{ t('admin.adminHub.title') }}
        </div>
        <div class="hub-meta">
          {{ t('admin.adminHub.subtitle') }}
        </div>
      </div>

      <q-banner v-if="!visibleSections.length" rounded class="bg-orange-1 text-orange-10">
        <template #avatar>
          <q-icon name="lock" color="orange-8" />
        </template>
        <div class="text-weight-medium">{{ t('admin.adminHub.noAccessTitle') }}</div>
        <div>{{ t('admin.adminHub.noAccessMessage') }}</div>
      </q-banner>

      <template v-else>
        <section v-for="section in visibleSections" :key="section.key" class="q-mb-lg">
          <div class="text-subtitle1 text-weight-bold text-teal-10 font-outfit q-mb-sm">
            {{ t(section.titleKey) }}
          </div>
          <div class="row q-col-gutter-md">
            <div v-for="card in section.cards" :key="card.key" class="col-12 col-sm-6 col-md-4">
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
        </section>
      </template>
    </GlassCard>
  </AdminPageWrapper>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import { useI18n } from 'vue-i18n';
import { useAuthStore } from '@/stores/auth';
import AdminPageWrapper from '@/components/common/AdminPageWrapper.vue';
import GlassCard from '@/components/common/GlassCard.vue';

interface AdminHubCard {
  key: string;
  to: string;
  icon: string;
  titleKey: string;
  descriptionKey: string;
  visible: () => boolean;
}

interface AdminHubSection {
  key: 'accesos' | 'estructura' | 'catalogos' | 'sistema';
  titleKey: string;
  cards: AdminHubCard[];
}

const { t } = useI18n();
const auth = useAuthStore();

// Rutas, iconos y permisos replican los ítems del menú y del router:
// si cambian allí, hay que cambiarlos aquí.
const sections: AdminHubSection[] = [
  {
    key: 'accesos',
    titleKey: 'admin.adminHub.sections.accesos',
    cards: [
      {
        key: 'usuarios',
        to: '/admin/usuarios',
        icon: 'people',
        titleKey: 'admin.adminHub.cards.usuarios.title',
        descriptionKey: 'admin.adminHub.cards.usuarios.description',
        visible: () => auth.hasPermission('usuarios.ver'),
      },
      {
        key: 'roles',
        to: '/admin/roles',
        icon: 'admin_panel_settings',
        titleKey: 'admin.adminHub.cards.roles.title',
        descriptionKey: 'admin.adminHub.cards.roles.description',
        visible: () => auth.hasPermission('usuarios.ver'),
      },
    ],
  },
  {
    key: 'estructura',
    titleKey: 'admin.adminHub.sections.estructura',
    cards: [
      {
        key: 'departamentos',
        to: '/admin/departamentos',
        icon: 'account_tree',
        titleKey: 'admin.adminHub.cards.departamentos.title',
        descriptionKey: 'admin.adminHub.cards.departamentos.description',
        visible: () => auth.hasPermission('catalogos.ver'),
      },
      {
        key: 'delegaciones',
        to: '/admin/delegaciones',
        icon: 'business',
        titleKey: 'admin.adminHub.cards.delegaciones.title',
        descriptionKey: 'admin.adminHub.cards.delegaciones.description',
        visible: () => auth.hasPermission('delegaciones.ver'),
      },
      {
        key: 'almacenes',
        to: '/admin/almacenes',
        icon: 'warehouse',
        titleKey: 'admin.adminHub.cards.almacenes.title',
        descriptionKey: 'admin.adminHub.cards.almacenes.description',
        visible: () => auth.hasPermission('catalogos.ver'),
      },
      {
        key: 'ubicaciones',
        to: '/admin/ubicaciones',
        icon: 'place',
        titleKey: 'admin.adminHub.cards.ubicaciones.title',
        descriptionKey: 'admin.adminHub.cards.ubicaciones.description',
        visible: () => auth.hasPermission('catalogos.ver'),
      },
      {
        key: 'informe',
        to: '/admin/informes/organizacion',
        icon: 'schema',
        titleKey: 'admin.adminHub.cards.informe.title',
        descriptionKey: 'admin.adminHub.cards.informe.description',
        visible: () =>
          auth.hasPermission('usuarios.ver') &&
          auth.hasPermission('delegaciones.ver') &&
          auth.hasPermission('catalogos.ver'),
      },
    ],
  },
  {
    key: 'catalogos',
    titleKey: 'admin.adminHub.sections.catalogos',
    cards: [
      {
        key: 'proveedores',
        to: '/admin/proveedores',
        icon: 'local_shipping',
        titleKey: 'admin.adminHub.cards.proveedores.title',
        descriptionKey: 'admin.adminHub.cards.proveedores.description',
        visible: () => auth.hasPermission('catalogos.ver'),
      },
      {
        key: 'categorias',
        to: '/admin/categorias',
        icon: 'category',
        titleKey: 'admin.adminHub.cards.categorias.title',
        descriptionKey: 'admin.adminHub.cards.categorias.description',
        visible: () => auth.hasPermission('catalogos.ver'),
      },
      {
        key: 'periodicidades',
        to: '/admin/periodicidades',
        icon: 'schedule',
        titleKey: 'admin.adminHub.cards.periodicidades.title',
        descriptionKey: 'admin.adminHub.cards.periodicidades.description',
        visible: () => auth.hasPermission('catalogos.ver'),
      },
    ],
  },
  {
    key: 'sistema',
    titleKey: 'admin.adminHub.sections.sistema',
    cards: [
      {
        key: 'configuracion',
        to: '/admin/configuracion',
        icon: 'tune',
        titleKey: 'admin.adminHub.cards.configuracion.title',
        descriptionKey: 'admin.adminHub.cards.configuracion.description',
        visible: () => auth.hasPermission('configuracion.ver'),
      },
      {
        key: 'actividad',
        to: '/admin/actividad',
        icon: 'history',
        titleKey: 'admin.adminHub.cards.actividad.title',
        descriptionKey: 'admin.adminHub.cards.actividad.description',
        visible: () => auth.hasPermission('actividad.ver'),
      },
    ],
  },
];

const visibleSections = computed(() =>
  sections
    .map((section) => ({ ...section, cards: section.cards.filter((card) => card.visible()) }))
    .filter((section) => section.cards.length),
);
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
