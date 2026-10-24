import type { ElemInventarioForm, TipoElemInventarioId } from '@/stores/elemsInventario';

// Fecha local en formato YYYY-MM-DD (toISOString usaría UTC y podría dar el día anterior).
function todayLocal(): string {
  const now = new Date();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  return `${now.getFullYear()}-${month}-${day}`;
}

// Copia profunda del formulario guardado con los datos propios de cada unidad reiniciados.
// No muta el original; la imagen no forma parte del formulario.
export function buildDuplicateForm(
  detailForm: ElemInventarioForm,
  referencia: string,
  tipoId: TipoElemInventarioId,
): ElemInventarioForm {
  const copy = JSON.parse(JSON.stringify(detailForm)) as ElemInventarioForm;
  copy.referencia = referencia.trim();
  copy.nSerie = null;
  copy.estadoId = 1;
  copy.fechaAlta = todayLocal();
  copy.fechaBaja = null;
  copy.motivoBaja = null;
  if (tipoId === 1 && copy.vehiculo) {
    copy.vehiculo.matricula = null;
  }
  return copy;
}
