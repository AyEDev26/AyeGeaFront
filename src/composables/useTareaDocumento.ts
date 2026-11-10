import { computed, nextTick, ref, toValue, type ComputedRef, type Ref } from 'vue';
import { useQuasar } from 'quasar';
import { useI18n } from 'vue-i18n';
import { useAuthStore } from '@/stores/auth';
import { useDocumentosStore, type Documento, type ElementoContext } from '@/stores/documentos';
import { useElemsInventarioStore } from '@/stores/elemsInventario';
import { useTiposDocumentoStore } from '@/stores/tiposDocumento';
import type { TareaDocumento } from '@/stores/revisiones';
import { getApiErrorMessage } from '@/utils/api-error';

// Fila mínima que necesita el flujo: cualquier revisión, mantenimiento o ITV.
interface TareaConDocumento {
  id: number;
  documento: TareaDocumento | null;
}

interface UseTareaDocumentoOptions {
  elementoId: Ref<number> | number;
  // Permiso de edición de la tarea (`mantenimiento_revisiones.editar`).
  canEdit: ComputedRef<boolean>;
  // Debe enviar solo `documento_id` (null desasocia).
  setDocumento: (tareaId: number, documentoId: number | null) => Promise<void>;
  reload: () => Promise<void>;
  // La tarea cambió: la ficha del elemento debe recargarse.
  onChanged: () => void;
  // Un documento se asoció o eliminó: la carpeta «Documentos» debe recargarse.
  onDocumentoChanged: () => void;
}

// Flujo documental compartido por las pestañas Revisiones, Mantenimientos e ITVs.
export function useTareaDocumento(options: UseTareaDocumentoOptions) {
  const $q = useQuasar();
  const { t } = useI18n();
  const auth = useAuthStore();
  const documentosStore = useDocumentosStore();
  const elemsStore = useElemsInventarioStore();
  const tiposDocumentoStore = useTiposDocumentoStore();

  const canViewDocumento = computed(() => auth.hasPermission('documentos.ver'));
  const canDeleteDocumento = computed(() => auth.hasPermission('documentos.eliminar'));
  const canAttach = computed(() => options.canEdit.value && auth.hasPermission('documentos.crear'));

  const downloadingId = ref<number | null>(null);
  const documentoDialogVisible = ref(false);
  const openingDocumento = ref(false);
  const documentoTarea = ref<TareaConDocumento | null>(null);
  const elementoContext = ref<ElementoContext | null>(null);
  const tipoOptions = ref<{ label: string; value: number }[]>([]);

  function notifyError(error: unknown, fallback: string) {
    $q.notify({ type: 'negative', color: 'red-9', message: getApiErrorMessage(error, fallback) });
  }

  function notifySuccess(message: string) {
    $q.notify({ type: 'positive', color: 'teal-9', message });
  }

  // `documento` de la tarea no trae el nombre original: se consulta antes de descargar.
  async function onDownload(documentoId: number) {
    downloadingId.value = documentoId;
    try {
      const documento = await documentosStore.fetchDocumento(documentoId);
      await documentosStore.downloadDocumento(documento);
    } catch (error) {
      notifyError(error, t('documentos.downloadError'));
    } finally {
      downloadingId.value = null;
    }
  }

  // Elemento (categoría/subcategoría) y tipos de documento se cargan al abrir el diálogo.
  async function openDocumento(row: TareaConDocumento) {
    openingDocumento.value = true;
    documentoTarea.value = row;
    try {
      const [elem, tipos] = await Promise.all([
        elemsStore.fetchElem(toValue(options.elementoId)),
        tiposDocumentoStore.fetchAllTiposDocumento(),
      ]);
      elementoContext.value = {
        id: elem.id,
        categoria: elem.categoria,
        subcategoria: elem.subcategoria,
      };
      tipoOptions.value = tipos.map((tipo) => ({ label: tipo.descripcion, value: tipo.id }));
      // Si el diálogo se monta ahora, debe nacer cerrado para que su watch reinicie el formulario.
      await nextTick();
      documentoDialogVisible.value = true;
    } catch (error) {
      notifyError(error, t('tareaDocumento.elementoFetchError'));
    } finally {
      openingDocumento.value = false;
    }
  }

  // El documento ya está subido: si falla la asociación, se avisa y el documento queda en «Documentos».
  async function onDocumentoSaved(documento?: Documento) {
    documentoDialogVisible.value = false;
    const tarea = documentoTarea.value;
    if (!documento || !tarea) return;
    const previous = tarea.documento;
    try {
      await options.setDocumento(tarea.id, documento.id);
      notifySuccess(t('tareaDocumento.attachSuccess'));
      options.onChanged();
      options.onDocumentoChanged();
      await options.reload();
      if (previous) offerDeletePrevious(previous.id);
    } catch (error) {
      notifyError(error, t('tareaDocumento.attachError'));
    }
  }

  function onUnlinkConfirm(row: TareaConDocumento) {
    $q.dialog({
      title: t('tareaDocumento.unlinkDialogTitle'),
      message: t('tareaDocumento.unlinkDialogMessage', {
        name: row.documento?.descripcion ?? '',
      }),
      cancel: true,
      persistent: true,
    }).onOk(() => {
      void onUnlink(row);
    });
  }

  async function onUnlink(row: TareaConDocumento) {
    const previous = row.documento;
    try {
      await options.setDocumento(row.id, null);
      notifySuccess(t('tareaDocumento.unlinkSuccess'));
      options.onChanged();
      options.onDocumentoChanged();
      await options.reload();
      if (previous) offerDeletePrevious(previous.id);
    } catch (error) {
      notifyError(error, t('tareaDocumento.unlinkError'));
    }
  }

  // El documento anterior se conserva por defecto; solo se ofrece borrarlo con `documentos.eliminar`.
  function offerDeletePrevious(documentoId: number) {
    if (!canDeleteDocumento.value) return;
    $q.dialog({
      title: t('tareaDocumento.deletePreviousTitle'),
      message: t('tareaDocumento.deletePreviousMessage'),
      cancel: { label: t('tareaDocumento.deletePreviousKeep'), flat: true },
      ok: { label: t('tareaDocumento.deletePreviousConfirm'), color: 'negative' },
      persistent: true,
    }).onOk(() => {
      void deletePrevious(documentoId);
    });
  }

  async function deletePrevious(documentoId: number) {
    try {
      await documentosStore.deleteDocumento(documentoId, { refresh: false });
      notifySuccess(t('tareaDocumento.deletePreviousSuccess'));
      options.onDocumentoChanged();
    } catch (error) {
      notifyError(error, t('tareaDocumento.deletePreviousError'));
    }
  }

  return {
    canViewDocumento,
    canAttach,
    downloadingId,
    openingDocumento,
    documentoTarea,
    documentoDialogVisible,
    elementoContext,
    tipoOptions,
    onDownload,
    openDocumento,
    onDocumentoSaved,
    onUnlinkConfirm,
  };
}
