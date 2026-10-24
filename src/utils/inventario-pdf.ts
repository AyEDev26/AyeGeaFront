import type {
  Content,
  TableCell,
  TDocumentDefinitions,
  TVirtualFileSystem,
} from 'pdfmake/interfaces';

export interface InventarioPdfField {
  label: string;
  value: string;
}

export interface InventarioPdfSection {
  title: string;
  fields: InventarioPdfField[];
}

export interface InventarioPdfInput {
  tipoId: 1 | 2 | 3;
  title: string;
  elementName: string;
  reference: string;
  referenceIsFallback: boolean;
  imageDataUrl: string | null;
  sections: InventarioPdfSection[];
  generatedAt: string;
  footerLabel: (page: number, pages: number) => string;
}

export interface InventarioPdfLabels {
  noImage: string;
  qrFallbackCaption: string;
}

export interface InventarioPdfOptions {
  fileName: string;
}

const COLOR_PRIMARY = '#00695c';
const COLOR_BORDER = '#b0bec5';
const COLOR_LABEL_BG = '#eceff1';
const COLOR_MUTED = '#607d8b';

const HEADER_BOX = 110;

export function unwrapDefault<T>(mod: T | { default: T }): T {
  return (mod as { default?: T }).default ?? (mod as T);
}

export async function loadPdfMake() {
  const [pdfMakeMod, vfsMod] = await Promise.all([
    import('pdfmake/build/pdfmake'),
    import('pdfmake/build/vfs_fonts'),
  ]);
  const pdfMake = unwrapDefault(pdfMakeMod);
  pdfMake.addVirtualFileSystem(unwrapDefault<TVirtualFileSystem>(vfsMod));
  return pdfMake;
}

async function generateQrDataUrl(text: string): Promise<string> {
  const QRCode = unwrapDefault(await import('qrcode'));
  return QRCode.toDataURL(text, { errorCorrectionLevel: 'M', margin: 1, width: 300 });
}

function buildImageBox(input: InventarioPdfInput, labels: InventarioPdfLabels): Content {
  if (input.imageDataUrl) {
    return { image: input.imageDataUrl, fit: [HEADER_BOX, HEADER_BOX] };
  }
  return {
    table: {
      widths: [HEADER_BOX - 2],
      heights: [HEADER_BOX - 2],
      body: [
        [
          {
            text: labels.noImage,
            alignment: 'center',
            color: COLOR_MUTED,
            fontSize: 9,
            margin: [0, HEADER_BOX / 2 - 12, 0, 0],
          },
        ],
      ],
    },
    layout: {
      hLineColor: () => COLOR_BORDER,
      vLineColor: () => COLOR_BORDER,
    },
  };
}

function buildQrBox(
  input: InventarioPdfInput,
  labels: InventarioPdfLabels,
  qrDataUrl: string,
): Content {
  const stack: Content[] = [
    { image: qrDataUrl, fit: [HEADER_BOX, HEADER_BOX], alignment: 'center' },
    { text: input.reference, alignment: 'center', fontSize: 9, bold: true, margin: [0, 2, 0, 0] },
  ];
  if (input.referenceIsFallback) {
    stack.push({
      text: labels.qrFallbackCaption,
      alignment: 'center',
      fontSize: 7,
      color: COLOR_MUTED,
    });
  }
  return { stack };
}

function buildSection(section: InventarioPdfSection): Content {
  const rows: TableCell[][] = section.fields.map((field) => [
    { text: field.label, bold: true, fontSize: 9, fillColor: COLOR_LABEL_BG, margin: [4, 2, 4, 2] },
    { text: field.value, fontSize: 9, margin: [4, 2, 4, 2] },
  ]);
  // La fila de título es la cabecera de la tabla (headerRows) y se repite en cada salto de página.
  return {
    margin: [0, 0, 0, 12],
    table: {
      widths: [150, '*'],
      headerRows: 1,
      dontBreakRows: true,
      body: [
        [
          {
            text: section.title,
            colSpan: 2,
            color: '#ffffff',
            bold: true,
            fontSize: 10,
            fillColor: COLOR_PRIMARY,
            margin: [4, 2, 4, 2],
          },
          {},
        ],
        ...rows,
      ],
    },
    layout: {
      hLineColor: () => COLOR_BORDER,
      vLineColor: () => COLOR_BORDER,
      hLineWidth: () => 0.5,
      vLineWidth: () => 0.5,
    },
  };
}

function buildDefinition(
  input: InventarioPdfInput,
  labels: InventarioPdfLabels,
  qrDataUrl: string,
): TDocumentDefinitions {
  return {
    pageSize: 'A4',
    pageOrientation: 'portrait',
    pageMargins: [40, 40, 40, 50],
    defaultStyle: { font: 'Roboto', fontSize: 9 },
    info: { title: `${input.title} - ${input.elementName}` },
    content: [
      {
        columns: [
          { width: HEADER_BOX, stack: [buildImageBox(input, labels)] },
          {
            width: '*',
            margin: [14, 0, 14, 0],
            stack: [
              { text: input.title, fontSize: 11, color: COLOR_MUTED, bold: true },
              { text: input.elementName, fontSize: 18, bold: true, color: COLOR_PRIMARY },
            ],
          },
          { width: HEADER_BOX, stack: [buildQrBox(input, labels, qrDataUrl)] },
        ],
        margin: [0, 0, 0, 14],
      },
      ...input.sections.map(buildSection),
    ],
    footer: (currentPage, pageCount) => ({
      margin: [40, 12, 40, 0],
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

export async function generateInventarioPdf(
  input: InventarioPdfInput,
  labels: InventarioPdfLabels,
  options: InventarioPdfOptions,
): Promise<void> {
  const [pdfMake, qrDataUrl] = await Promise.all([
    loadPdfMake(),
    generateQrDataUrl(input.reference),
  ]);
  await pdfMake.createPdf(buildDefinition(input, labels, qrDataUrl)).download(options.fileName);
}
