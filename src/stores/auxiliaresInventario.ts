import { defineStore } from 'pinia';
import { api } from '@/boot/axios';

export interface DescripcionOption {
  id: number;
  descripcion: string;
}

// Los endpoints auxiliares devuelven { data: [{ id, descripcion }] } sin paginar.
async function fetchDescripciones(url: string): Promise<DescripcionOption[]> {
  const response = await api.get<{ data: DescripcionOption[] }>(url);
  return response.data.data.map((o) => ({ id: o.id, descripcion: o.descripcion }));
}

export const useAuxiliaresInventarioStore = defineStore('auxiliaresInventario', () => {
  const fetchEstados = () => fetchDescripciones('/estados');
  const fetchEstadosRevision = () => fetchDescripciones('/estados-revision');
  const fetchTiposFuncionamiento = () => fetchDescripciones('/tipos-funcionamiento');
  // Catálogos de la revisión como tarea (no confundir con /estados-revision, estado del elemento).
  const fetchPrioridadesRevisionMant = () => fetchDescripciones('/revision-mant-prioridades');
  const fetchEstadosRevisionMant = () => fetchDescripciones('/revision-mant-estados');

  return {
    fetchEstados,
    fetchEstadosRevision,
    fetchTiposFuncionamiento,
    fetchPrioridadesRevisionMant,
    fetchEstadosRevisionMant,
  };
});
