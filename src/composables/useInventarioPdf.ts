import { ref } from 'vue';
import { useQuasar } from 'quasar';
import { useI18n } from 'vue-i18n';
import {
  useElemsInventarioStore,
  type ElemInventarioDetail,
  type TipoElemInventarioId,
} from '@/stores/elemsInventario';
import { useCategoriasStore } from '@/stores/categorias';
import { useSubcategoriasStore } from '@/stores/subcategorias';
import { useDelegacionesStore } from '@/stores/delegaciones';
import { useUbicacionesStore } from '@/stores/ubicaciones';
import { useDepartamentosStore } from '@/stores/departamentos';
import { useProveedoresStore } from '@/stores/proveedores';
import { useAuxiliaresInventarioStore } from '@/stores/auxiliaresInventario';
import { usePeriodicidadesStore } from '@/stores/periodicidades';
import { useUsersStore } from '@/stores/users';
import { getApiErrorMessage } from '@/utils/api-error';
import {
  generateInventarioPdf,
  type InventarioPdfField,
  type InventarioPdfSection,
} from '@/utils/inventario-pdf';

const TIPO_KEYS = { 1: 'vehiculos', 2: 'maquinaria', 3: 'epis' } as const;
const FILE_PREFIX = { 1: 'vehiculo', 2: 'maquinaria', 3: 'epi' } as const;
const EMPTY = '—';

type IdMap = Map<number, string>;

function toMap<T>(items: T[], id: (i: T) => number, label: (i: T) => string): IdMap {
  return new Map(items.map((i) => [id(i), label(i)]));
}

// Una carga que falla (p. ej. 403 por permisos) deja el mapa vacío: los ids se muestran como «—».
async function safe(load: () => Promise<IdMap>): Promise<IdMap> {
  try {
    return await load();
  } catch {
    return new Map();
  }
}

// pdfmake solo admite PNG y JPEG: se pasa por canvas para cubrir también WebP.
async function fetchImageAsDataUrl(url: string): Promise<string> {
  const response = await fetch(url);
  if (!response.ok) throw new Error(`HTTP ${response.status}`);
  const bitmap = await createImageBitmap(await response.blob());
  const canvas = document.createElement('canvas');
  canvas.width = bitmap.width;
  canvas.height = bitmap.height;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('canvas');
  ctx.drawImage(bitmap, 0, 0);
  bitmap.close();
  return canvas.toDataURL('image/png');
}

function sanitizeFileName(name: string) {
  return name.replace(/[^A-Za-z0-9._-]+/g, '_');
}

export function useInventarioPdf() {
  const $q = useQuasar();
  const { t, locale } = useI18n();
  const elemsStore = useElemsInventarioStore();
  const categoriasStore = useCategoriasStore();
  const subcategoriasStore = useSubcategoriasStore();
  const delegacionesStore = useDelegacionesStore();
  const ubicacionesStore = useUbicacionesStore();
  const departamentosStore = useDepartamentosStore();
  const proveedoresStore = useProveedoresStore();
  const auxiliaresStore = useAuxiliaresInventarioStore();
  const periodicidadesStore = usePeriodicidadesStore();
  const usersStore = useUsersStore();

  const loading = ref(false);

  const lbl = (key: string) => t(`inventario.form.labels.${key}`);

  function formatDate(val: string | null) {
    if (!val) return EMPTY;
    const [y, m, d] = val.split('-').map(Number);
    if (!y || !m || !d) return EMPTY;
    return new Date(y, m - 1, d).toLocaleDateString(locale.value);
  }

  const formatText = (val: string | null | undefined) => val?.trim() || EMPTY;
  const formatBool = (val: boolean) => t(val ? 'inventario.pdf.yes' : 'inventario.pdf.no');
  const formatNumber = (val: number | null) =>
    val === null ? EMPTY : val.toLocaleString(locale.value);
  const formatPrice = (val: number | null) =>
    val === null
      ? EMPTY
      : new Intl.NumberFormat(locale.value, { style: 'currency', currency: 'EUR' }).format(val);
  const formatSelect = (map: IdMap, id: number | null) =>
    id === null ? EMPTY : (map.get(id) ?? EMPTY);

  // Resuelve los ids de los selects a texto; solo carga lo que el tipo necesita.
  async function loadLookups(tipoId: TipoElemInventarioId) {
    const needsBlock = tipoId !== 3;
    const [
      categorias,
      subcategorias,
      delegaciones,
      ubicaciones,
      departamentos,
      proveedores,
      estados,
      estadosRevision,
      responsables,
      tiposFuncionamiento,
      vehiculos,
      periodicidades,
    ] = await Promise.all([
      safe(async () =>
        toMap(
          await categoriasStore.fetchAllCategorias(tipoId),
          (i) => i.id,
          (i) => i.nombre,
        ),
      ),
      safe(async () =>
        toMap(
          await subcategoriasStore.fetchAllSubcategorias({ tipoElementoInventarioId: tipoId }),
          (i) => i.id,
          (i) => i.nombre,
        ),
      ),
      safe(async () =>
        toMap(
          await delegacionesStore.fetchAllDelegaciones(),
          (i) => i.id,
          (i) => i.nombre,
        ),
      ),
      safe(async () =>
        toMap(
          await ubicacionesStore.fetchAllUbicaciones(),
          (i) => i.id,
          (i) => i.nombre,
        ),
      ),
      safe(async () =>
        toMap(
          await departamentosStore.fetchAllDepartamentos(),
          (i) => i.id,
          (i) => i.nombre,
        ),
      ),
      safe(async () =>
        toMap(
          await proveedoresStore.fetchAllProveedores(),
          (i) => i.id,
          (i) => i.nombre,
        ),
      ),
      safe(async () =>
        toMap(
          await auxiliaresStore.fetchEstados(),
          (i) => i.id,
          (i) => i.descripcion,
        ),
      ),
      needsBlock
        ? safe(async () =>
            toMap(
              await auxiliaresStore.fetchEstadosRevision(),
              (i) => i.id,
              (i) => i.descripcion,
            ),
          )
        : new Map<number, string>(),
      needsBlock
        ? safe(async () =>
            toMap(
              await usersStore.fetchUsersSelector(),
              (i) => i.id,
              (i) => i.name,
            ),
          )
        : new Map<number, string>(),
      tipoId === 1
        ? safe(async () =>
            toMap(
              await auxiliaresStore.fetchTiposFuncionamiento(),
              (i) => i.id,
              (i) => i.descripcion,
            ),
          )
        : new Map<number, string>(),
      tipoId === 2
        ? safe(async () =>
            toMap(
              await elemsStore.fetchAllVehiculos(),
              (i) => i.id,
              (i) =>
                `${[i.referencia, i.matricula].filter(Boolean).join(' / ')} ${i.nombre}`.trim(),
            ),
          )
        : new Map<number, string>(),
      tipoId === 2
        ? safe(async () =>
            toMap(
              await periodicidadesStore.fetchAllPeriodicidades(),
              (i) => i.id,
              (i) => i.descripcion,
            ),
          )
        : new Map<number, string>(),
    ]);
    return {
      categorias,
      subcategorias,
      delegaciones,
      ubicaciones,
      departamentos,
      proveedores,
      estados,
      estadosRevision,
      responsables,
      tiposFuncionamiento,
      vehiculos,
      periodicidades,
    };
  }

  type Lookups = Awaited<ReturnType<typeof loadLookups>>;

  const field = (key: string, value: string): InventarioPdfField => ({ label: lbl(key), value });

  // Mismo orden de secciones y campos que InventarioForm.vue (sin la sección «Imagen»).
  function buildSections(detail: ElemInventarioDetail, l: Lookups): InventarioPdfSection[] {
    const f = detail.form;
    const sections: InventarioPdfSection[] = [
      {
        title: t('inventario.form.sections.general'),
        fields: [
          field('nombre', formatText(f.nombre)),
          field('referencia', formatText(f.referencia)),
          field('nSerie', formatText(f.nSerie)),
          field('descripcion', formatText(f.descripcion)),
          field('categoria', formatSelect(l.categorias, f.categoriaId)),
          field('subcategoria', formatSelect(l.subcategorias, f.subcategoriaId)),
          field(
            'estado',
            l.estados.get(f.estadoId) ??
              t(f.estadoId === 1 ? 'inventario.estados.active' : 'inventario.estados.inactive'),
          ),
          field('comentario', formatText(f.comentario)),
        ],
      },
      {
        title: t('inventario.form.sections.ubicacion'),
        fields: [
          field('delegacion', formatSelect(l.delegaciones, f.delegacionId)),
          field('ubicacion', formatSelect(l.ubicaciones, f.ubicacionId)),
          field('departamento', formatSelect(l.departamentos, f.departamentoId)),
          field('localizacion', formatText(f.localizacion)),
          field('proveedor', formatSelect(l.proveedores, f.proveedorId)),
        ],
      },
      {
        title: t('inventario.form.sections.fechas'),
        fields: [
          field('fechaAlta', formatDate(f.fechaAlta)),
          field('fechaBaja', formatDate(f.fechaBaja)),
          field('motivoBaja', formatText(f.motivoBaja)),
        ],
      },
    ];
    const v = f.vehiculo;
    if (v) {
      sections.push({
        title: t('inventario.form.sections.vehiculo'),
        fields: [
          field('matricula', formatText(v.matricula)),
          field('marca', formatText(v.marca)),
          field('modelo', formatText(v.modelo)),
          field('fechaCompra', formatDate(v.fechaCompra)),
          field('ultimaRevision', formatDate(v.ultimaRevision)),
          field('proximaRevision', formatDate(v.proximaRevision)),
          field('estadoRevision', formatSelect(l.estadosRevision, v.estadoRevisionId)),
          field('tipoFuncionamiento', formatSelect(l.tiposFuncionamiento, v.tipoFuncionamientoId)),
          field('responsable', formatSelect(l.responsables, v.responsableId)),
          field('precio', formatPrice(v.precio)),
          field('kmsActuales', formatNumber(v.kmsActuales)),
          field('horasActuales', formatNumber(v.horasActuales)),
          field('renting', formatBool(v.renting)),
          field('vehiculoEspecial', formatBool(v.vehiculoEspecial)),
          field('critico', formatBool(v.critico)),
        ],
      });
    }
    const m = f.maquinaria;
    if (m) {
      sections.push({
        title: t('inventario.form.sections.maquinaria'),
        fields: [
          field('marca', formatText(m.marca)),
          field('modelo', formatText(m.modelo)),
          field('codInversion', formatText(m.codInversion)),
          field('fechaCompra', formatDate(m.fechaCompra)),
          field('ultimaRevision', formatDate(m.ultimaRevision)),
          field('proximaRevision', formatDate(m.proximaRevision)),
          field('estadoRevision', formatSelect(l.estadosRevision, m.estadoRevisionId)),
          field('periodicidad', formatSelect(l.periodicidades, m.periodicidadId)),
          field('responsable', formatSelect(l.responsables, m.responsableId)),
          field('vehiculo', formatSelect(l.vehiculos, m.vehiculoId)),
          field('precio', formatPrice(m.precio)),
          field('critico', formatBool(m.critico)),
        ],
      });
    }
    if (f.epi) {
      sections.push({
        title: t('inventario.form.sections.epi'),
        fields: [field('stockMinimo', formatNumber(f.epi.stockMinimo))],
      });
    }
    return sections;
  }

  // Genera y descarga la ficha con los datos guardados en el servidor.
  async function generate(tipoId: TipoElemInventarioId, id: number) {
    if (loading.value) return;
    loading.value = true;
    try {
      const detail = await elemsStore.fetchElem(id);

      let imageDataUrl: string | null = null;
      let imageFailed = false;
      if (detail.imagenUrl) {
        try {
          imageDataUrl = await fetchImageAsDataUrl(detail.imagenUrl);
        } catch {
          imageFailed = true;
        }
      }

      const lookups = await loadLookups(tipoId);
      const referencia = detail.form.referencia?.trim() || null;
      const reference = referencia ?? String(detail.id);

      await generateInventarioPdf(
        {
          tipoId,
          title: t(`inventario.pdf.titles.${TIPO_KEYS[tipoId]}`),
          elementName: detail.form.nombre,
          reference,
          referenceIsFallback: referencia === null,
          imageDataUrl,
          sections: buildSections(detail, lookups),
          generatedAt: t('inventario.pdf.generatedAt', {
            date: new Date().toLocaleString(locale.value),
          }),
          footerLabel: (page, pages) => t('inventario.pdf.footerPage', { page, pages }),
        },
        {
          noImage: t('inventario.pdf.noImage'),
          qrFallbackCaption: t('inventario.pdf.qrFallbackCaption'),
        },
        { fileName: `${sanitizeFileName(`${FILE_PREFIX[tipoId]}-${reference}`)}.pdf` },
      );

      if (imageFailed) {
        $q.notify({ type: 'warning', message: t('inventario.pdf.imageWarning') });
      }
      $q.notify({ type: 'positive', color: 'teal-9', message: t('inventario.pdf.success') });
    } catch (error) {
      $q.notify({
        type: 'negative',
        color: 'red-9',
        message: getApiErrorMessage(error, t('inventario.pdf.error')),
      });
    } finally {
      loading.value = false;
    }
  }

  return { loading, generate };
}
