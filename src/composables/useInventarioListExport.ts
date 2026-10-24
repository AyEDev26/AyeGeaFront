import { ref, toValue, type MaybeRefOrGetter } from 'vue';
import { useQuasar, type QTableColumn } from 'quasar';
import { useI18n } from 'vue-i18n';
import {
  useElemsInventarioStore,
  type ElemInventario,
  type ElemsInventarioFilters,
  type TipoElemInventarioId,
} from '@/stores/elemsInventario';
import { getApiErrorMessage } from '@/utils/api-error';
import {
  generateInventarioListExcel,
  generateInventarioListPdf,
  type InventarioExportColumn,
  type InventarioExportFilter,
  type InventarioListExportInput,
} from '@/utils/inventario-listado-export';

export type InventarioExportFormat = 'excel' | 'pdf';

interface NamedOption {
  id: number;
  nombre: string;
}

// Opciones ya cargadas en la pantalla para resolver los ids de los filtros a texto.
export interface InventarioExportFilterOptions {
  categoriaId: NamedOption[];
  subcategoriaId: NamedOption[];
  delegacionId: NamedOption[];
  ubicacionId: NamedOption[];
  departamentoId: NamedOption[];
  proveedorId: NamedOption[];
}

export interface UseInventarioListExportOptions {
  tipoId: MaybeRefOrGetter<TipoElemInventarioId>;
  // Columnas de datos de la tabla (sin la de acciones): se reutilizan sus etiquetas y campos.
  dataColumns: MaybeRefOrGetter<QTableColumn<ElemInventario>[]>;
  // Filtros aplicados con «Filtrar», no los valores sin aplicar de los campos.
  appliedFilters: MaybeRefOrGetter<ElemsInventarioFilters>;
  filterOptions: MaybeRefOrGetter<InventarioExportFilterOptions>;
}

const TIPO_KEYS = { 1: 'vehiculos', 2: 'maquinaria', 3: 'epis' } as const;
const COLUMN_TYPES: Record<string, InventarioExportColumn['type']> = {
  proximaRevision: 'date',
  stockMinimo: 'number',
};

function pad(n: number) {
  return String(n).padStart(2, '0');
}

function fileDate(date: Date) {
  return `${date.getFullYear()}${pad(date.getMonth() + 1)}${pad(date.getDate())}`;
}

// Las fechas llegan como 'YYYY-MM-DD' (o ISO); se convierten a Date a medianoche local.
function parseDate(value: string): Date | null {
  const [y, m, d] = value.slice(0, 10).split('-').map(Number);
  return y && m && d ? new Date(y, m - 1, d) : null;
}

function rawValue(column: QTableColumn<ElemInventario>, row: ElemInventario) {
  const field = column.field;
  if (typeof field === 'function') return field(row);
  return row[field];
}

export function useInventarioListExport(options: UseInventarioListExportOptions) {
  const $q = useQuasar();
  const { t, locale } = useI18n();
  const elemsStore = useElemsInventarioStore();

  const exporting = ref(false);

  function buildColumns(): InventarioExportColumn[] {
    return toValue(options.dataColumns).map((c) => ({
      name: c.name,
      label: c.label,
      type: COLUMN_TYPES[c.name] ?? 'text',
    }));
  }

  function buildRow(
    columns: InventarioExportColumn[],
    row: ElemInventario,
  ): (string | number | Date | null)[] {
    const dataColumns = toValue(options.dataColumns);
    return dataColumns.map((column, i) => {
      if (column.name === 'estado') {
        return row.estadoId === 1
          ? t('inventario.estados.active')
          : t('inventario.estados.inactive');
      }
      const value = rawValue(column, row);
      if (value === null || value === undefined || value === '') return null;
      if (columns[i]?.type === 'date') return parseDate(String(value));
      if (columns[i]?.type === 'number') return Number(value);
      return String(value);
    });
  }

  function buildFilterSummary(tipoId: TipoElemInventarioId, f: ElemsInventarioFilters) {
    const filterOptions = toValue(options.filterOptions);
    const filters: InventarioExportFilter[] = [];
    const label = (key: string) => t(`inventario.filters.${key}`);
    const addText = (key: string, value: string | undefined) => {
      if (value) filters.push({ label: label(key), value });
    };
    const addSelect = (key: string, id: number | null | undefined, list: NamedOption[]) => {
      if (!id) return;
      // Un id sin correspondencia (opción no cargada) se omite del resumen.
      const name = list.find((o) => o.id === id)?.nombre;
      if (name) filters.push({ label: label(key), value: name });
    };

    addText('nombreLabel', f.nombre);
    addText('referenciaLabel', f.referencia);
    addText('nSerieLabel', f.nSerie);
    if (tipoId === 1) addText('matriculaLabel', f.matricula);
    if (f.estadoId !== undefined && f.estadoId !== null) {
      filters.push({
        label: label('estadoLabel'),
        value: f.estadoId === 1 ? t('inventario.estados.active') : t('inventario.estados.inactive'),
      });
    }
    addSelect('categoriaLabel', f.categoriaId, filterOptions.categoriaId);
    addSelect('subcategoriaLabel', f.subcategoriaId, filterOptions.subcategoriaId);
    addSelect('delegacionLabel', f.delegacionId, filterOptions.delegacionId);
    addSelect('ubicacionLabel', f.ubicacionId, filterOptions.ubicacionId);
    addSelect('departamentoLabel', f.departamentoId, filterOptions.departamentoId);
    addSelect('proveedorLabel', f.proveedorId, filterOptions.proveedorId);
    return filters;
  }

  async function exportList(format: InventarioExportFormat) {
    if (exporting.value) return;
    exporting.value = true;
    try {
      const tipoId = toValue(options.tipoId);
      // Instantánea de los filtros aplicados: no cambia si el usuario edita los campos durante la carga.
      const filters = { ...toValue(options.appliedFilters) };
      const items = await elemsStore.fetchAllElems(tipoId, filters);

      const now = new Date();
      const columns = buildColumns();
      const input: InventarioListExportInput = {
        tipoId,
        title: t(`inventario.export.titles.${TIPO_KEYS[tipoId]}`),
        generatedAt: t('inventario.export.generatedAt', { date: now.toLocaleString(locale.value) }),
        filtersTitle: t('inventario.export.filtersTitle'),
        noFiltersLabel: t('inventario.export.noFilters'),
        filters: buildFilterSummary(tipoId, filters),
        columns,
        rows: items.map((item) => buildRow(columns, item)),
        footerLabel: (page, pages) => t('inventario.export.footerPage', { page, pages }),
      };
      const exportOptions = {
        fileName: `${TIPO_KEYS[tipoId]}-listado-${fileDate(now)}.${format === 'excel' ? 'xlsx' : 'pdf'}`,
        formatDate: (date: Date) => date.toLocaleDateString(locale.value),
      };

      if (format === 'excel') {
        await generateInventarioListExcel(input, exportOptions);
      } else {
        await generateInventarioListPdf(input, exportOptions);
      }
      $q.notify({ type: 'positive', color: 'teal-9', message: t('inventario.export.success') });
    } catch (error) {
      $q.notify({
        type: 'negative',
        color: 'red-9',
        message: getApiErrorMessage(error, t('inventario.export.error')),
      });
    } finally {
      exporting.value = false;
    }
  }

  return { exporting, exportList };
}
