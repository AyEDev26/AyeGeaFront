import type { ElemInventarioForm, TipoElemInventarioId } from '@/stores/elemsInventario';
import { todayLocal } from '@/utils/date';

// Copia profunda del formulario guardado con los datos propios de cada unidad reiniciados
// (incluidos los campos de solo lectura; kmsIniciales y horasIniciales sí se copian).
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
    // Campos de solo lectura: los calcula el backend para el nuevo elemento.
    copy.vehiculo.ultimaRevision = null;
    copy.vehiculo.proximaRevision = null;
    copy.vehiculo.estadoRevisionId = null;
    copy.vehiculo.kmsActuales = null;
    copy.vehiculo.horasActuales = null;
  }
  if (tipoId === 2 && copy.maquinaria) {
    copy.maquinaria.ultimaRevision = null;
    copy.maquinaria.proximaRevision = null;
    copy.maquinaria.estadoRevisionId = null;
  }
  return copy;
}
