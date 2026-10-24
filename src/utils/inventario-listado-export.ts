import type { Content, TableCell, TDocumentDefinitions } from 'pdfmake/interfaces';
import { loadPdfMake, unwrapDefault } from '@/utils/inventario-pdf';

export interface InventarioExportColumn {
  name: string;
  label: string;
  type: 'text' | 'date' | 'number';
}

export interface InventarioExportFilter {
  label: string;
  value: string;
}

export interface InventarioListExportInput {
  tipoId: 1 | 2 | 3;
  title: string;
  generatedAt: string;
  filtersTitle: string;
  noFiltersLabel: string;
  filters: InventarioExportFilter[];
  columns: InventarioExportColumn[];
  // Las fechas son Date a medianoche local; null se muestra como «—».
  rows: (string | number | Date | null)[][];
  footerLabel: (page: number, pages: number) => string;
}

export interface InventarioListExportOptions {
  fileName: string;
  formatDate: (date: Date) => string;
}

const COLOR_PRIMARY = '#00695c';
const COLOR_BORDER = '#b0bec5';
const COLOR_MUTED = '#607d8b';

const EMPTY = '—';

const EXCEL_DATE_FORMAT = 'dd/mm/yyyy';
const EXCEL_MIN_WIDTH = 10;
const EXCEL_MAX_WIDTH = 50;

function filterLines(input: InventarioListExportInput): string[] {
  return input.filters.length
    ? input.filters.map((f) => `${f.label}: ${f.value}`)
    : [input.noFiltersLabel];
}

function cellText(
  value: string | number | Date | null,
  formatDate: (date: Date) => string,
): string {
  if (value === null || value === '') return EMPTY;
  if (value instanceof Date) return formatDate(value);
  return String(value);
}

function triggerDownload(blob: Blob, fileName: string) {
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = fileName;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}

export async function generateInventarioListExcel(
  input: InventarioListExportInput,
  options: InventarioListExportOptions,
): Promise<void> {
  const ExcelJS = unwrapDefault(await import('exceljs'));
  const workbook = new ExcelJS.Workbook();
  const sheet = workbook.addWorksheet(input.title.slice(0, 31));

  sheet.addRow([input.title]).font = { bold: true, size: 14, color: { argb: 'FF00695C' } };
  sheet.addRow([input.generatedAt]).font = { color: { argb: 'FF607D8B' } };
  sheet.addRow([]);
  sheet.addRow([input.filtersTitle]).font = { bold: true };
  for (const line of filterLines(input)) sheet.addRow([line]);
  sheet.addRow([]);

  const headerRow = sheet.addRow(input.columns.map((c) => c.label));
  headerRow.eachCell((cell) => {
    cell.font = { bold: true, color: { argb: 'FFFFFFFF' } };
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF00695C' } };
    cell.alignment = { vertical: 'middle', wrapText: true };
  });

  const widths = input.columns.map((c) => c.label.length + 2);
  for (const row of input.rows) {
    const excelRow = sheet.addRow(
      row.map((value, i) => {
        if (value === null || value === '') return EMPTY;
        // ExcelJS escribe las fechas en UTC: se conserva el día local.
        if (value instanceof Date) {
          return new Date(Date.UTC(value.getFullYear(), value.getMonth(), value.getDate()));
        }
        return input.columns[i]?.type === 'number' ? Number(value) : value;
      }),
    );
    row.forEach((value, i) => {
      const column = input.columns[i];
      if (column?.type === 'date') excelRow.getCell(i + 1).numFmt = EXCEL_DATE_FORMAT;
      widths[i] = Math.max(widths[i] ?? 0, cellText(value, options.formatDate).length + 2);
    });
  }

  widths.forEach((width, i) => {
    sheet.getColumn(i + 1).width = Math.min(Math.max(width, EXCEL_MIN_WIDTH), EXCEL_MAX_WIDTH);
  });
  sheet.autoFilter = {
    from: { row: headerRow.number, column: 1 },
    to: { row: headerRow.number, column: input.columns.length },
  };
  sheet.views = [{ state: 'frozen', ySplit: headerRow.number }];

  const buffer = await workbook.xlsx.writeBuffer();
  triggerDownload(
    new Blob([buffer], {
      type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    }),
    options.fileName,
  );
}

function buildPdfDefinition(
  input: InventarioListExportInput,
  options: InventarioListExportOptions,
): TDocumentDefinitions {
  const header: TableCell[] = input.columns.map((c) => ({
    text: c.label,
    bold: true,
    color: '#ffffff',
    fillColor: COLOR_PRIMARY,
    margin: [2, 2, 2, 2],
  }));
  const body: TableCell[][] = input.rows.map((row) =>
    row.map((value, i) => ({
      text: cellText(value, options.formatDate),
      alignment: input.columns[i]?.type === 'number' ? 'right' : 'left',
      margin: [2, 1, 2, 1],
    })),
  );
  const content: Content[] = [
    { text: input.title, fontSize: 16, bold: true, color: COLOR_PRIMARY },
    { text: input.generatedAt, fontSize: 9, color: COLOR_MUTED, margin: [0, 2, 0, 6] },
    { text: input.filtersTitle, fontSize: 9, bold: true },
    {
      ul: filterLines(input),
      fontSize: 9,
      margin: [0, 2, 0, 10],
    },
    {
      table: {
        headerRows: 1,
        dontBreakRows: true,
        widths: input.columns.map((c) => (c.type === 'text' ? '*' : 'auto')),
        body: [header, ...body],
      },
      layout: {
        hLineColor: () => COLOR_BORDER,
        vLineColor: () => COLOR_BORDER,
        hLineWidth: () => 0.5,
        vLineWidth: () => 0.5,
      },
    },
  ];
  return {
    pageSize: 'A4',
    pageOrientation: 'landscape',
    pageMargins: [30, 30, 30, 45],
    defaultStyle: { font: 'Roboto', fontSize: 8 },
    info: { title: input.title },
    content,
    footer: (currentPage, pageCount) => ({
      margin: [30, 12, 30, 0],
      columns: [
        { text: input.generatedAt, fontSize: 8, color: COLOR_MUTED },
        {
          text: input.footerLabel(currentPage, pageCount),
          fontSize: 8,
          color: COLOR_MUTED,
          alignment: 'right',
        },
      ],
    }),
  };
}

export async function generateInventarioListPdf(
  input: InventarioListExportInput,
  options: InventarioListExportOptions,
): Promise<void> {
  const pdfMake = await loadPdfMake();
  await pdfMake.createPdf(buildPdfDefinition(input, options)).download(options.fileName);
}
