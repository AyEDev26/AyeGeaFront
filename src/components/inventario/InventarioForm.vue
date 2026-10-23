<template>
  <component :is="embedded ? 'div' : AdminPageWrapper" v-bind="wrapperAttrs">
    <component :is="embedded ? 'div' : GlassCard" v-bind="cardAttrs">
      <div v-if="!embedded" class="row items-center justify-between q-mb-md">
        <div class="text-h5 text-weight-bolder text-teal-10 font-outfit">
          {{ pageTitle }}
        </div>
      </div>

      <div v-if="loading" class="row flex-center q-pa-xl">
        <q-spinner color="teal-9" size="40px" />
      </div>

      <q-form v-else ref="formRef" class="q-gutter-y-md" @submit.prevent="onSubmit">
        <!-- Datos generales -->
        <section class="form-section form-section--general">
          <div class="form-section__title text-subtitle1 text-weight-bold font-outfit q-mb-sm">
            {{ t('inventario.form.sections.general') }}
          </div>
          <div class="row q-col-gutter-x-md q-col-gutter-y-xs">
            <div class="col-12 col-sm-6">
              <q-input
                v-model="form.nombre"
                outlined
                dense
                hide-bottom-space
                class="elegant-input"
                :label="t('inventario.form.labels.nombre') + ' *'"
                :rules="nombreRules"
                lazy-rules
                :error="!!serverErrors.nombre"
                :error-message="serverErrors.nombre"
                @update:model-value="clearServerError('nombre')"
              />
            </div>
            <div class="col-12 col-sm-6 col-md-3">
              <q-input
                v-model="form.referencia"
                outlined
                dense
                hide-bottom-space
                class="elegant-input"
                :label="t('inventario.form.labels.referencia')"
                :rules="maxLengthRules(20)"
                lazy-rules
                :error="!!serverErrors.referencia"
                :error-message="serverErrors.referencia"
                @update:model-value="clearServerError('referencia')"
              />
            </div>
            <div class="col-12 col-sm-6 col-md-3">
              <q-input
                v-model="form.nSerie"
                outlined
                dense
                hide-bottom-space
                class="elegant-input"
                :label="t('inventario.form.labels.nSerie')"
                :rules="maxLengthRules(45)"
                lazy-rules
                :error="!!serverErrors.nSerie"
                :error-message="serverErrors.nSerie"
                @update:model-value="clearServerError('nSerie')"
              />
            </div>
            <div class="col-12">
              <q-input
                v-model="form.descripcion"
                outlined
                dense
                hide-bottom-space
                class="elegant-input"
                :label="t('inventario.form.labels.descripcion')"
                :rules="maxLengthRules(250)"
                lazy-rules
                :error="!!serverErrors.descripcion"
                :error-message="serverErrors.descripcion"
                @update:model-value="clearServerError('descripcion')"
              />
            </div>
            <div class="col-12 col-sm-6 col-md-3">
              <q-select
                v-model="form.categoriaId"
                outlined
                dense
                hide-bottom-space
                use-input
                hide-selected
                fill-input
                input-debounce="0"
                emit-value
                map-options
                option-value="id"
                option-label="label"
                class="elegant-input"
                :options="categoriaSelect.shown.value"
                :label="t('inventario.form.labels.categoria') + ' *'"
                :rules="[requiredRule]"
                lazy-rules
                :error="!!serverErrors.categoriaId"
                :error-message="serverErrors.categoriaId"
                @filter="categoriaSelect.onFilter"
                @update:model-value="onCategoriaChange"
              />
            </div>
            <div class="col-12 col-sm-6 col-md-3">
              <q-select
                v-model="form.subcategoriaId"
                outlined
                dense
                hide-bottom-space
                clearable
                use-input
                hide-selected
                fill-input
                input-debounce="0"
                emit-value
                map-options
                option-value="id"
                option-label="label"
                class="elegant-input"
                :disable="!form.categoriaId"
                :options="subcategoriaSelect.shown.value"
                :label="t('inventario.form.labels.subcategoria')"
                :error="!!serverErrors.subcategoriaId"
                :error-message="serverErrors.subcategoriaId"
                @filter="subcategoriaSelect.onFilter"
                @update:model-value="clearServerError('subcategoriaId')"
              />
            </div>
            <div class="col-12 col-sm-6 col-md-3">
              <q-select
                v-model="form.estadoId"
                outlined
                dense
                hide-bottom-space
                emit-value
                map-options
                option-value="id"
                option-label="label"
                class="elegant-input"
                :options="estadoOptions"
                :label="t('inventario.form.labels.estado')"
                :error="!!serverErrors.estadoId"
                :error-message="serverErrors.estadoId"
                @update:model-value="clearServerError('estadoId')"
              />
            </div>
            <div class="col-12">
              <q-input
                v-model="form.comentario"
                outlined
                dense
                hide-bottom-space
                class="elegant-input"
                :label="t('inventario.form.labels.comentario')"
                :rules="maxLengthRules(255)"
                lazy-rules
                :error="!!serverErrors.comentario"
                :error-message="serverErrors.comentario"
                @update:model-value="clearServerError('comentario')"
              />
            </div>
          </div>
        </section>

        <!-- Ubicación y proveedor -->
        <section class="form-section">
          <div class="form-section__title text-subtitle1 text-weight-bold font-outfit q-mb-sm">
            {{ t('inventario.form.sections.ubicacion') }}
          </div>
          <div class="row q-col-gutter-x-md q-col-gutter-y-xs">
            <div class="col-12 col-sm-6 col-md-3">
              <q-select
                v-model="form.delegacionId"
                outlined
                dense
                hide-bottom-space
                clearable
                use-input
                hide-selected
                fill-input
                input-debounce="0"
                emit-value
                map-options
                option-value="id"
                option-label="label"
                class="elegant-input"
                :options="delegacionSelect.shown.value"
                :label="t('inventario.form.labels.delegacion')"
                :error="!!serverErrors.delegacionId"
                :error-message="serverErrors.delegacionId"
                @filter="delegacionSelect.onFilter"
                @update:model-value="onDelegacionChange"
              />
            </div>
            <div class="col-12 col-sm-6 col-md-3">
              <q-select
                v-model="form.ubicacionId"
                outlined
                dense
                hide-bottom-space
                clearable
                use-input
                hide-selected
                fill-input
                input-debounce="0"
                emit-value
                map-options
                option-value="id"
                option-label="label"
                class="elegant-input"
                :disable="!form.delegacionId"
                :options="ubicacionSelect.shown.value"
                :label="t('inventario.form.labels.ubicacion')"
                :error="!!serverErrors.ubicacionId"
                :error-message="serverErrors.ubicacionId"
                @filter="ubicacionSelect.onFilter"
                @update:model-value="clearServerError('ubicacionId')"
              />
            </div>
            <div class="col-12 col-sm-6 col-md-3">
              <q-select
                v-model="form.departamentoId"
                outlined
                dense
                hide-bottom-space
                clearable
                use-input
                hide-selected
                fill-input
                input-debounce="0"
                emit-value
                map-options
                option-value="id"
                option-label="label"
                class="elegant-input"
                :options="departamentoSelect.shown.value"
                :label="t('inventario.form.labels.departamento')"
                :error="!!serverErrors.departamentoId"
                :error-message="serverErrors.departamentoId"
                @filter="departamentoSelect.onFilter"
                @update:model-value="clearServerError('departamentoId')"
              />
            </div>
            <div class="col-12">
              <q-input
                v-model="form.localizacion"
                outlined
                dense
                hide-bottom-space
                class="elegant-input"
                :label="t('inventario.form.labels.localizacion')"
                :rules="maxLengthRules(255)"
                lazy-rules
                :error="!!serverErrors.localizacion"
                :error-message="serverErrors.localizacion"
                @update:model-value="clearServerError('localizacion')"
              />
            </div>
            <div class="col-12 col-sm-6 col-md-3">
              <q-select
                v-model="form.proveedorId"
                outlined
                dense
                hide-bottom-space
                clearable
                use-input
                hide-selected
                fill-input
                input-debounce="0"
                emit-value
                map-options
                option-value="id"
                option-label="label"
                class="elegant-input"
                :options="proveedorSelect.shown.value"
                :label="t('inventario.form.labels.proveedor')"
                :error="!!serverErrors.proveedorId"
                :error-message="serverErrors.proveedorId"
                @filter="proveedorSelect.onFilter"
                @update:model-value="clearServerError('proveedorId')"
              />
            </div>
          </div>
        </section>

        <!-- Fechas y baja -->
        <section class="form-section">
          <div class="form-section__title text-subtitle1 text-weight-bold font-outfit q-mb-sm">
            {{ t('inventario.form.sections.fechas') }}
          </div>
          <div class="row q-col-gutter-x-md q-col-gutter-y-xs">
            <div class="col-12 col-sm-6 col-md-3">
              <q-input
                v-model="form.fechaAlta"
                outlined
                dense
                hide-bottom-space
                type="date"
                stack-label
                class="elegant-input"
                :label="t('inventario.form.labels.fechaAlta')"
                :error="!!serverErrors.fechaAlta"
                :error-message="serverErrors.fechaAlta"
                @update:model-value="clearServerError('fechaAlta')"
              />
            </div>
            <div class="col-12 col-sm-6 col-md-3">
              <q-input
                v-model="form.fechaBaja"
                outlined
                dense
                hide-bottom-space
                type="date"
                stack-label
                class="elegant-input"
                :label="t('inventario.form.labels.fechaBaja')"
                :error="!!serverErrors.fechaBaja"
                :error-message="serverErrors.fechaBaja"
                @update:model-value="clearServerError('fechaBaja')"
              />
            </div>
            <div class="col-12 col-sm-6 col-md-3">
              <q-input
                v-model="form.motivoBaja"
                outlined
                dense
                hide-bottom-space
                class="elegant-input"
                :label="t('inventario.form.labels.motivoBaja')"
                :rules="maxLengthRules(255)"
                lazy-rules
                :error="!!serverErrors.motivoBaja"
                :error-message="serverErrors.motivoBaja"
                @update:model-value="clearServerError('motivoBaja')"
              />
            </div>
          </div>
        </section>

        <!-- Bloque específico del tipo -->
        <section class="form-section" v-if="form.vehiculo">
          <div class="form-section__title text-subtitle1 text-weight-bold font-outfit q-mb-sm">
            {{ t('inventario.form.sections.vehiculo') }}
          </div>
          <div class="row q-col-gutter-x-md q-col-gutter-y-xs">
            <div class="col-12 col-sm-6 col-md-3">
              <q-input
                v-model="form.vehiculo.matricula"
                outlined
                dense
                hide-bottom-space
                class="elegant-input"
                :label="t('inventario.form.labels.matricula')"
                :rules="maxLengthRules(10)"
                lazy-rules
                :error="!!serverErrors.matricula"
                :error-message="serverErrors.matricula"
                @update:model-value="clearServerError('matricula')"
              />
            </div>
            <div class="col-12 col-sm-6 col-md-3">
              <q-input
                v-model="form.vehiculo.marca"
                outlined
                dense
                hide-bottom-space
                class="elegant-input"
                :label="t('inventario.form.labels.marca')"
                :rules="maxLengthRules(45)"
                lazy-rules
                :error="!!serverErrors.marca"
                :error-message="serverErrors.marca"
                @update:model-value="clearServerError('marca')"
              />
            </div>
            <div class="col-12 col-sm-6 col-md-3">
              <q-input
                v-model="form.vehiculo.modelo"
                outlined
                dense
                hide-bottom-space
                class="elegant-input"
                :label="t('inventario.form.labels.modelo')"
                :rules="maxLengthRules(45)"
                lazy-rules
                :error="!!serverErrors.modelo"
                :error-message="serverErrors.modelo"
                @update:model-value="clearServerError('modelo')"
              />
            </div>
            <div class="col-12 col-sm-6 col-md-3">
              <q-input
                v-model="form.vehiculo.fechaCompra"
                outlined
                dense
                hide-bottom-space
                class="elegant-input"
                :label="t('inventario.form.labels.fechaCompra')"
                type="date"
                stack-label
                :error="!!serverErrors.fechaCompra"
                :error-message="serverErrors.fechaCompra"
                @update:model-value="clearServerError('fechaCompra')"
              />
            </div>
            <div class="col-12 col-sm-6 col-md-3">
              <q-input
                v-model="form.vehiculo.ultimaRevision"
                outlined
                dense
                hide-bottom-space
                class="elegant-input"
                :label="t('inventario.form.labels.ultimaRevision')"
                type="date"
                stack-label
                :error="!!serverErrors.ultimaRevision"
                :error-message="serverErrors.ultimaRevision"
                @update:model-value="clearServerError('ultimaRevision')"
              />
            </div>
            <div class="col-12 col-sm-6 col-md-3">
              <q-input
                v-model="form.vehiculo.proximaRevision"
                outlined
                dense
                hide-bottom-space
                class="elegant-input"
                :label="t('inventario.form.labels.proximaRevision')"
                type="date"
                stack-label
                :error="!!serverErrors.proximaRevision"
                :error-message="serverErrors.proximaRevision"
                @update:model-value="clearServerError('proximaRevision')"
              />
            </div>
            <div class="col-12 col-sm-6 col-md-3">
              <q-select
                v-model="form.vehiculo.estadoRevisionId"
                outlined
                dense
                hide-bottom-space
                clearable
                use-input
                hide-selected
                fill-input
                input-debounce="0"
                emit-value
                map-options
                option-value="id"
                option-label="label"
                class="elegant-input"
                :options="estadoRevisionSelect.shown.value"
                :label="t('inventario.form.labels.estadoRevision')"
                :error="!!serverErrors.estadoRevisionId"
                :error-message="serverErrors.estadoRevisionId"
                @filter="estadoRevisionSelect.onFilter"
                @update:model-value="clearServerError('estadoRevisionId')"
              />
            </div>
            <div class="col-12 col-sm-6 col-md-3">
              <q-select
                v-model="form.vehiculo.tipoFuncionamientoId"
                outlined
                dense
                hide-bottom-space
                clearable
                use-input
                hide-selected
                fill-input
                input-debounce="0"
                emit-value
                map-options
                option-value="id"
                option-label="label"
                class="elegant-input"
                :options="tipoFuncionamientoSelect.shown.value"
                :label="t('inventario.form.labels.tipoFuncionamiento')"
                :error="!!serverErrors.tipoFuncionamientoId"
                :error-message="serverErrors.tipoFuncionamientoId"
                @filter="tipoFuncionamientoSelect.onFilter"
                @update:model-value="clearServerError('tipoFuncionamientoId')"
              />
            </div>
            <div class="col-12 col-sm-6 col-md-3">
              <q-select
                v-model="form.vehiculo.responsableId"
                outlined
                dense
                hide-bottom-space
                clearable
                use-input
                hide-selected
                fill-input
                input-debounce="0"
                emit-value
                map-options
                option-value="id"
                option-label="label"
                class="elegant-input"
                :options="responsableSelect.shown.value"
                :label="t('inventario.form.labels.responsable')"
                :error="!!serverErrors.responsableId"
                :error-message="serverErrors.responsableId"
                @filter="responsableSelect.onFilter"
                @update:model-value="clearServerError('responsableId')"
              />
            </div>
            <div class="col-12 col-sm-6 col-md-3">
              <q-input
                :model-value="form.vehiculo.precio"
                outlined
                dense
                hide-bottom-space
                type="number"
                min="0"
                step="any"
                class="elegant-input"
                :label="t('inventario.form.labels.precio')"
                :rules="[nonNegativeRule]"
                lazy-rules
                :error="!!serverErrors.precio"
                :error-message="serverErrors.precio"
                @update:model-value="
                  (val) => {
                    setBlockNumber('vehiculo', 'precio', val);
                    clearServerError('precio');
                  }
                "
              />
            </div>
            <div class="col-12 col-sm-6 col-md-3">
              <q-input
                :model-value="form.vehiculo.kmsActuales"
                outlined
                dense
                hide-bottom-space
                type="number"
                min="0"
                step="1"
                class="elegant-input"
                :label="t('inventario.form.labels.kmsActuales')"
                :rules="[nonNegativeRule]"
                lazy-rules
                :error="!!serverErrors.kmsActuales"
                :error-message="serverErrors.kmsActuales"
                @update:model-value="
                  (val) => {
                    setBlockNumber('vehiculo', 'kmsActuales', val);
                    clearServerError('kmsActuales');
                  }
                "
              />
            </div>
            <div class="col-12 col-sm-6 col-md-3">
              <q-input
                :model-value="form.vehiculo.horasActuales"
                outlined
                dense
                hide-bottom-space
                type="number"
                min="0"
                step="1"
                class="elegant-input"
                :label="t('inventario.form.labels.horasActuales')"
                :rules="[nonNegativeRule]"
                lazy-rules
                :error="!!serverErrors.horasActuales"
                :error-message="serverErrors.horasActuales"
                @update:model-value="
                  (val) => {
                    setBlockNumber('vehiculo', 'horasActuales', val);
                    clearServerError('horasActuales');
                  }
                "
              />
            </div>
            <div class="col-12 col-sm-6 col-md-3">
              <q-toggle
                v-model="form.vehiculo.renting"
                color="teal-9"
                :label="t('inventario.form.labels.renting')"
              />
            </div>
            <div class="col-12 col-sm-6 col-md-3">
              <q-toggle
                v-model="form.vehiculo.vehiculoEspecial"
                color="teal-9"
                :label="t('inventario.form.labels.vehiculoEspecial')"
              />
            </div>
            <div class="col-12 col-sm-6 col-md-3">
              <q-toggle
                v-model="form.vehiculo.critico"
                color="teal-9"
                :label="t('inventario.form.labels.critico')"
              />
            </div>
          </div>
        </section>

        <!-- Bloque específico del tipo -->
        <section class="form-section" v-if="form.maquinaria">
          <div class="form-section__title text-subtitle1 text-weight-bold font-outfit q-mb-sm">
            {{ t('inventario.form.sections.maquinaria') }}
          </div>
          <div class="row q-col-gutter-x-md q-col-gutter-y-xs">
            <div class="col-12 col-sm-6 col-md-3">
              <q-input
                v-model="form.maquinaria.marca"
                outlined
                dense
                hide-bottom-space
                class="elegant-input"
                :label="t('inventario.form.labels.marca')"
                :rules="maxLengthRules(45)"
                lazy-rules
                :error="!!serverErrors.marca"
                :error-message="serverErrors.marca"
                @update:model-value="clearServerError('marca')"
              />
            </div>
            <div class="col-12 col-sm-6 col-md-3">
              <q-input
                v-model="form.maquinaria.modelo"
                outlined
                dense
                hide-bottom-space
                class="elegant-input"
                :label="t('inventario.form.labels.modelo')"
                :rules="maxLengthRules(45)"
                lazy-rules
                :error="!!serverErrors.modelo"
                :error-message="serverErrors.modelo"
                @update:model-value="clearServerError('modelo')"
              />
            </div>
            <div class="col-12 col-sm-6 col-md-3">
              <q-input
                v-model="form.maquinaria.codInversion"
                outlined
                dense
                hide-bottom-space
                class="elegant-input"
                :label="t('inventario.form.labels.codInversion')"
                :rules="maxLengthRules(100)"
                lazy-rules
                :error="!!serverErrors.codInversion"
                :error-message="serverErrors.codInversion"
                @update:model-value="clearServerError('codInversion')"
              />
            </div>
            <div class="col-12 col-sm-6 col-md-3">
              <q-input
                v-model="form.maquinaria.fechaCompra"
                outlined
                dense
                hide-bottom-space
                class="elegant-input"
                :label="t('inventario.form.labels.fechaCompra')"
                type="date"
                stack-label
                :error="!!serverErrors.fechaCompra"
                :error-message="serverErrors.fechaCompra"
                @update:model-value="clearServerError('fechaCompra')"
              />
            </div>
            <div class="col-12 col-sm-6 col-md-3">
              <q-input
                v-model="form.maquinaria.ultimaRevision"
                outlined
                dense
                hide-bottom-space
                class="elegant-input"
                :label="t('inventario.form.labels.ultimaRevision')"
                type="date"
                stack-label
                :error="!!serverErrors.ultimaRevision"
                :error-message="serverErrors.ultimaRevision"
                @update:model-value="clearServerError('ultimaRevision')"
              />
            </div>
            <div class="col-12 col-sm-6 col-md-3">
              <q-input
                v-model="form.maquinaria.proximaRevision"
                outlined
                dense
                hide-bottom-space
                class="elegant-input"
                :label="t('inventario.form.labels.proximaRevision')"
                type="date"
                stack-label
                :error="!!serverErrors.proximaRevision"
                :error-message="serverErrors.proximaRevision"
                @update:model-value="clearServerError('proximaRevision')"
              />
            </div>
            <div class="col-12 col-sm-6 col-md-3">
              <q-select
                v-model="form.maquinaria.estadoRevisionId"
                outlined
                dense
                hide-bottom-space
                clearable
                use-input
                hide-selected
                fill-input
                input-debounce="0"
                emit-value
                map-options
                option-value="id"
                option-label="label"
                class="elegant-input"
                :options="estadoRevisionSelect.shown.value"
                :label="t('inventario.form.labels.estadoRevision')"
                :error="!!serverErrors.estadoRevisionId"
                :error-message="serverErrors.estadoRevisionId"
                @filter="estadoRevisionSelect.onFilter"
                @update:model-value="clearServerError('estadoRevisionId')"
              />
            </div>
            <div class="col-12 col-sm-6 col-md-3">
              <q-select
                v-model="form.maquinaria.periodicidadId"
                outlined
                dense
                hide-bottom-space
                clearable
                use-input
                hide-selected
                fill-input
                input-debounce="0"
                emit-value
                map-options
                option-value="id"
                option-label="label"
                class="elegant-input"
                :options="periodicidadSelect.shown.value"
                :label="t('inventario.form.labels.periodicidad')"
                :error="!!serverErrors.periodicidadId"
                :error-message="serverErrors.periodicidadId"
                @filter="periodicidadSelect.onFilter"
                @update:model-value="clearServerError('periodicidadId')"
              />
            </div>
            <div class="col-12 col-sm-6 col-md-3">
              <q-select
                v-model="form.maquinaria.responsableId"
                outlined
                dense
                hide-bottom-space
                clearable
                use-input
                hide-selected
                fill-input
                input-debounce="0"
                emit-value
                map-options
                option-value="id"
                option-label="label"
                class="elegant-input"
                :options="responsableSelect.shown.value"
                :label="t('inventario.form.labels.responsable')"
                :error="!!serverErrors.responsableId"
                :error-message="serverErrors.responsableId"
                @filter="responsableSelect.onFilter"
                @update:model-value="clearServerError('responsableId')"
              />
            </div>
            <div class="col-12 col-sm-6 col-md-3">
              <q-select
                v-model="form.maquinaria.vehiculoId"
                outlined
                dense
                hide-bottom-space
                clearable
                use-input
                hide-selected
                fill-input
                input-debounce="0"
                emit-value
                map-options
                option-value="id"
                option-label="label"
                class="elegant-input"
                :options="vehiculoSelect.shown.value"
                :label="t('inventario.form.labels.vehiculo')"
                :error="!!serverErrors.vehiculoId"
                :error-message="serverErrors.vehiculoId"
                @filter="vehiculoSelect.onFilter"
                @update:model-value="clearServerError('vehiculoId')"
              />
            </div>
            <div class="col-12 col-sm-6 col-md-3">
              <q-input
                :model-value="form.maquinaria.precio"
                outlined
                dense
                hide-bottom-space
                type="number"
                min="0"
                step="any"
                class="elegant-input"
                :label="t('inventario.form.labels.precio')"
                :rules="[nonNegativeRule]"
                lazy-rules
                :error="!!serverErrors.precio"
                :error-message="serverErrors.precio"
                @update:model-value="
                  (val) => {
                    setBlockNumber('maquinaria', 'precio', val);
                    clearServerError('precio');
                  }
                "
              />
            </div>
            <div class="col-12 col-sm-6 col-md-3">
              <q-toggle
                v-model="form.maquinaria.critico"
                color="teal-9"
                :label="t('inventario.form.labels.critico')"
              />
            </div>
          </div>
        </section>

        <!-- Bloque específico del tipo -->
        <section class="form-section" v-if="form.epi">
          <div class="form-section__title text-subtitle1 text-weight-bold font-outfit q-mb-sm">
            {{ t('inventario.form.sections.epi') }}
          </div>
          <div class="row q-col-gutter-x-md q-col-gutter-y-xs">
            <div class="col-12 col-sm-6 col-md-3">
              <q-input
                :model-value="form.epi.stockMinimo"
                outlined
                dense
                hide-bottom-space
                type="number"
                min="0"
                step="1"
                class="elegant-input"
                :label="t('inventario.form.labels.stockMinimo')"
                :rules="[nonNegativeRule]"
                lazy-rules
                :error="!!serverErrors.stockMinimo"
                :error-message="serverErrors.stockMinimo"
                @update:model-value="
                  (val) => {
                    setBlockNumber('epi', 'stockMinimo', val);
                    clearServerError('stockMinimo');
                  }
                "
              />
            </div>
          </div>
        </section>

        <!-- Imagen -->
        <section class="form-section">
          <div class="form-section__title text-subtitle1 text-weight-bold font-outfit q-mb-sm">
            {{ t('inventario.form.sections.imagen') }}
          </div>
          <div class="row items-center q-col-gutter-x-md q-col-gutter-y-xs">
            <div class="col-12 col-sm-auto">
              <q-img
                v-if="imagePreviewUrl"
                :src="imagePreviewUrl"
                fit="contain"
                class="rounded-borders"
                style="width: 200px; height: 150px"
              />
              <div
                v-else
                class="flex flex-center rounded-borders text-grey-7 bg-grey-2"
                style="width: 200px; height: 150px"
              >
                {{ t('inventario.form.image.none') }}
              </div>
            </div>
            <div class="col-12 col-sm">
              <input
                ref="fileInputRef"
                type="file"
                accept="image/jpeg,image/png,image/webp"
                class="hidden"
                @change="onFileSelected"
              />
              <div class="q-gutter-x-sm">
                <q-btn
                  outline
                  no-caps
                  color="primary"
                  icon="image"
                  class="elegant-btn"
                  :label="
                    imagePreviewUrl
                      ? t('inventario.form.image.replace')
                      : t('inventario.form.image.pick')
                  "
                  :loading="uploadingImage"
                  @click="fileInputRef?.click()"
                />
                <q-btn
                  v-if="pendingImage"
                  flat
                  no-caps
                  color="grey-7"
                  :label="t('inventario.form.image.remove')"
                  @click="clearPendingImage"
                />
              </div>
              <div v-if="!isEditMode" class="text-caption text-grey-7 q-mt-sm">
                {{ t('inventario.form.image.pendingHint') }}
              </div>
            </div>
          </div>
        </section>

        <div class="row justify-end q-gutter-x-sm">
          <q-btn
            flat
            no-caps
            color="grey-7"
            :label="t('common.cancel')"
            :disable="saving"
            @click="goToList"
          />
          <q-btn
            unelevated
            no-caps
            color="primary"
            class="elegant-btn px-lg"
            type="submit"
            :label="t('common.save')"
            :loading="saving"
          />
        </div>
      </q-form>
    </component>
  </component>
</template>

<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { useQuasar, type QForm } from 'quasar';
import { AxiosError } from 'axios';
import { useI18n } from 'vue-i18n';
import {
  useElemsInventarioStore,
  type ElemInventarioForm,
  type TipoElemInventarioId,
} from '@/stores/elemsInventario';
import { useCategoriasStore } from '@/stores/categorias';
import { useSubcategoriasStore, type Subcategoria } from '@/stores/subcategorias';
import { useDelegacionesStore } from '@/stores/delegaciones';
import { useUbicacionesStore, type Ubicacion } from '@/stores/ubicaciones';
import { useDepartamentosStore } from '@/stores/departamentos';
import { useProveedoresStore } from '@/stores/proveedores';
import { useAuxiliaresInventarioStore } from '@/stores/auxiliaresInventario';
import { usePeriodicidadesStore } from '@/stores/periodicidades';
import { useUsersStore } from '@/stores/users';
import { getApiErrorMessage } from '@/utils/api-error';
import AdminPageWrapper from '@/components/common/AdminPageWrapper.vue';
import GlassCard from '@/components/common/GlassCard.vue';

const props = defineProps<{
  tipoId: TipoElemInventarioId;
  /** Se renderiza dentro de la carpeta «Información»: sin título, wrapper ni card propios. */
  embedded?: boolean;
}>();

const $q = useQuasar();
const { t } = useI18n();
const route = useRoute();
const router = useRouter();
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

const wrapperAttrs = computed(() => (props.embedded ? {} : { wide: true, alignTop: true }));
const cardAttrs = computed(() =>
  props.embedded ? {} : { class: 'q-pa-md animate__fadeIn', style: 'min-height: 50vh' },
);

const TIPO_KEYS = { 1: 'vehiculos', 2: 'maquinaria', 3: 'epis' } as const;
const tipoKey = computed(() => TIPO_KEYS[props.tipoId]);
const listPath = computed(() => `/inventario/${tipoKey.value}`);

// Una misma pantalla sirve para alta (sin :id) y edición (con :id).
const elemId = computed(() => {
  const raw = route.params.id;
  const id = Number(Array.isArray(raw) ? raw[0] : raw);
  return Number.isInteger(id) && id > 0 ? id : null;
});
const isEditMode = computed(() => elemId.value !== null);

const pageTitle = computed(() =>
  isEditMode.value
    ? t(`inventario.form.editTitle.${tipoKey.value}`)
    : t(`inventario.form.createTitle.${tipoKey.value}`),
);

const formRef = ref<QForm | null>(null);
const loading = ref(false);
const saving = ref(false);

// Bloque específico del tipo con valores por defecto (booleanos a false, resto null).
function withBlock(base: ElemInventarioForm, tipoId: TipoElemInventarioId): ElemInventarioForm {
  if (tipoId === 1) {
    base.vehiculo ??= {
      matricula: null,
      marca: null,
      modelo: null,
      fechaCompra: null,
      ultimaRevision: null,
      proximaRevision: null,
      estadoRevisionId: null,
      renting: false,
      precio: null,
      kmsActuales: null,
      horasActuales: null,
      responsableId: null,
      vehiculoEspecial: false,
      tipoFuncionamientoId: null,
      critico: false,
    };
  } else if (tipoId === 2) {
    base.maquinaria ??= {
      marca: null,
      modelo: null,
      fechaCompra: null,
      ultimaRevision: null,
      proximaRevision: null,
      estadoRevisionId: null,
      codInversion: null,
      precio: null,
      responsableId: null,
      vehiculoId: null,
      periodicidadId: null,
      critico: false,
    };
  } else {
    base.epi ??= { stockMinimo: null };
  }
  return base;
}

function emptyForm(): ElemInventarioForm {
  return withBlock(
    {
      nombre: '',
      descripcion: null,
      referencia: null,
      categoriaId: null,
      subcategoriaId: null,
      estadoId: 1,
      fechaAlta: null,
      fechaBaja: null,
      motivoBaja: null,
      delegacionId: null,
      ubicacionId: null,
      departamentoId: null,
      localizacion: null,
      comentario: null,
      proveedorId: null,
      nSerie: null,
    },
    props.tipoId,
  );
}

const form = ref<ElemInventarioForm>(emptyForm());

// --- Validaciones ------------------------------------------------------------

const requiredRule = (val: unknown) =>
  (val !== null && val !== undefined && val !== '') || t('inventario.form.validation.required');

function maxLengthRules(max: number) {
  return [
    (val: string | null) =>
      (val ?? '').length <= max || t('inventario.form.validation.maxLength', { max }),
  ];
}

const nonNegativeRule = (val: number | null) =>
  val === null || val >= 0 || t('inventario.form.validation.nonNegative');

// q-input type=number emite string (vacío = ''): el modelo guarda number | null.
function toNumberOrNull(val: string | number | null): number | null {
  if (val === null || val === '') return null;
  const n = Number(val);
  return Number.isNaN(n) ? null : n;
}

// Los handlers inline pierden el narrowing del v-if, así que el bloque se resuelve aquí.
function setBlockNumber(block: 'vehiculo' | 'maquinaria' | 'epi', field: string, val: unknown) {
  const target = form.value[block] as Record<string, unknown> | undefined;
  if (target) target[field] = toNumberOrNull(val as string | number | null);
}

const nombreRules = [
  (val: string) => !!val?.trim() || t('inventario.form.validation.required'),
  ...maxLengthRules(250),
];

// --- Errores 422 por campo ---------------------------------------------------

const serverErrors = ref<Record<string, string>>({});

function clearServerError(field: string) {
  if (serverErrors.value[field]) {
    const rest = { ...serverErrors.value };
    delete rest[field];
    serverErrors.value = rest;
  }
}

function snakeToCamel(text: string) {
  return text.replace(/_([a-z])/g, (_m, c: string) => c.toUpperCase());
}

// Convierte `errors` de un 422 (claves como `referencia` o `vehiculo.matricula`) en errores
// por campo. Devuelve true si se mapeó al menos uno.
function applyServerErrors(error: unknown): boolean {
  if (!(error instanceof AxiosError) || error.response?.status !== 422) return false;
  const errors = (error.response.data as { errors?: Record<string, string[]> } | undefined)?.errors;
  if (!errors) return false;
  const mapped: Record<string, string> = {};
  for (const [key, messages] of Object.entries(errors)) {
    const last = key.split('.').pop() ?? key;
    const message = messages?.[0];
    if (message) mapped[snakeToCamel(last)] = message;
  }
  serverErrors.value = mapped;
  return Object.keys(mapped).length > 0;
}

// --- Selects -----------------------------------------------------------------

interface SelectOption {
  id: number;
  label: string;
}

// Select con filtro por texto sobre una lista (que puede depender de otros campos).
function createSelect(source: () => SelectOption[]) {
  const needle = ref('');
  const shown = computed(() => {
    const text = needle.value.trim().toLowerCase();
    const options = source();
    return text ? options.filter((o) => o.label.toLowerCase().includes(text)) : options;
  });
  function onFilter(val: string, update: (callback: () => void) => void) {
    update(() => {
      needle.value = val;
    });
  }
  return { shown, onFilter };
}

const categorias = ref<SelectOption[]>([]);
const allSubcategorias = ref<Subcategoria[]>([]);
const delegaciones = ref<SelectOption[]>([]);
const allUbicaciones = ref<Ubicacion[]>([]);
const departamentos = ref<SelectOption[]>([]);
const proveedores = ref<SelectOption[]>([]);
const estados = ref<SelectOption[]>([]);
const estadosRevision = ref<SelectOption[]>([]);
const tiposFuncionamiento = ref<SelectOption[]>([]);
const responsables = ref<SelectOption[]>([]);
const vehiculos = ref<SelectOption[]>([]);
const periodicidades = ref<SelectOption[]>([]);

const categoriaSelect = createSelect(() => categorias.value);
const subcategoriaSelect = createSelect(() =>
  allSubcategorias.value
    .filter((s) => s.categoriaId === form.value.categoriaId)
    .map((s) => ({ id: s.id, label: s.nombre })),
);
const delegacionSelect = createSelect(() => delegaciones.value);
const ubicacionSelect = createSelect(() =>
  allUbicaciones.value
    .filter((u) => u.delegacionId === form.value.delegacionId)
    .map((u) => ({ id: u.id, label: u.nombre })),
);
const departamentoSelect = createSelect(() => departamentos.value);
const proveedorSelect = createSelect(() => proveedores.value);
const estadoRevisionSelect = createSelect(() => estadosRevision.value);
const tipoFuncionamientoSelect = createSelect(() => tiposFuncionamiento.value);
const responsableSelect = createSelect(() => responsables.value);
const vehiculoSelect = createSelect(() => vehiculos.value);
const periodicidadSelect = createSelect(() => periodicidades.value);

// Si GET /estados falla (403), se usan los dos estados conocidos para no bloquear el formulario.
const estadoOptions = computed<SelectOption[]>(() =>
  estados.value.length
    ? estados.value
    : [
        { id: 1, label: t('inventario.estados.active') },
        { id: 0, label: t('inventario.estados.inactive') },
      ],
);

function onCategoriaChange() {
  form.value.subcategoriaId = null;
  clearServerError('categoriaId');
}

function onDelegacionChange() {
  form.value.ubicacionId = null;
  clearServerError('delegacionId');
}

function toOptions<T extends { id: number; nombre: string }>(items: T[]): SelectOption[] {
  return items.map((i) => ({ id: i.id, label: i.nombre }));
}

// Un fallo de carga de un select (p. ej. 403 por permisos) deja su lista vacía con un aviso.
async function loadSelectOptions() {
  const loaders: Promise<unknown>[] = [
    categoriasStore.fetchAllCategorias(props.tipoId).then((r) => (categorias.value = toOptions(r))),
    subcategoriasStore
      .fetchAllSubcategorias({ tipoElementoInventarioId: props.tipoId })
      .then((r) => (allSubcategorias.value = r)),
    delegacionesStore.fetchAllDelegaciones().then((r) => (delegaciones.value = toOptions(r))),
    ubicacionesStore.fetchAllUbicaciones().then((r) => (allUbicaciones.value = r)),
    departamentosStore.fetchAllDepartamentos().then((r) => (departamentos.value = toOptions(r))),
    proveedoresStore.fetchAllProveedores().then((r) => (proveedores.value = toOptions(r))),
    auxiliaresStore
      .fetchEstados()
      .then((r) => (estados.value = r.map((e) => ({ id: e.id, label: e.descripcion })))),
  ];
  // Vehículos y maquinaria comparten estado de revisión y responsable.
  if (props.tipoId !== 3) {
    loaders.push(
      auxiliaresStore
        .fetchEstadosRevision()
        .then((r) => (estadosRevision.value = r.map((e) => ({ id: e.id, label: e.descripcion })))),
      usersStore
        .fetchUsersSelector()
        .then((r) => (responsables.value = r.map((u) => ({ id: u.id, label: u.name })))),
    );
  }
  if (props.tipoId === 1) {
    loaders.push(
      auxiliaresStore
        .fetchTiposFuncionamiento()
        .then(
          (r) => (tiposFuncionamiento.value = r.map((e) => ({ id: e.id, label: e.descripcion }))),
        ),
    );
  }
  if (props.tipoId === 2) {
    loaders.push(
      elemsStore.fetchAllVehiculos().then(
        (r) =>
          (vehiculos.value = r.map((v) => ({
            id: v.id,
            label: `${[v.referencia, v.matricula].filter(Boolean).join(' / ')} ${v.nombre}`.trim(),
          }))),
      ),
      periodicidadesStore
        .fetchAllPeriodicidades()
        .then((r) => (periodicidades.value = r.map((p) => ({ id: p.id, label: p.descripcion })))),
    );
  }
  const results = await Promise.allSettled(loaders);
  if (results.some((r) => r.status === 'rejected')) {
    $q.notify({ type: 'warning', message: t('inventario.form.optionsError') });
  }
}

// --- Imagen ------------------------------------------------------------------

const IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp'];
const IMAGE_MAX_BYTES = 5 * 1024 * 1024;

const fileInputRef = ref<HTMLInputElement | null>(null);
const currentImageUrl = ref<string | null>(null); // imagenUrl del elemento (edición)
const pendingImage = ref<File | null>(null); // alta: se sube tras crear el elemento
const pendingPreviewUrl = ref<string | null>(null);
const uploadingImage = ref(false);

const imagePreviewUrl = computed(() => pendingPreviewUrl.value ?? currentImageUrl.value);

function clearPendingImage() {
  if (pendingPreviewUrl.value) URL.revokeObjectURL(pendingPreviewUrl.value);
  pendingImage.value = null;
  pendingPreviewUrl.value = null;
}

async function onFileSelected(event: Event) {
  const input = event.target as HTMLInputElement;
  const file = input.files?.[0];
  input.value = ''; // permite volver a elegir el mismo fichero
  if (!file) return;

  if (!IMAGE_TYPES.includes(file.type)) {
    $q.notify({
      type: 'negative',
      color: 'red-9',
      message: t('inventario.form.image.invalidType'),
    });
    return;
  }
  if (file.size > IMAGE_MAX_BYTES) {
    $q.notify({ type: 'negative', color: 'red-9', message: t('inventario.form.image.tooLarge') });
    return;
  }

  if (elemId.value === null) {
    clearPendingImage();
    pendingImage.value = file;
    pendingPreviewUrl.value = URL.createObjectURL(file);
    return;
  }

  uploadingImage.value = true;
  try {
    currentImageUrl.value = await elemsStore.uploadImagen(elemId.value, props.tipoId, file);
    $q.notify({ type: 'positive', color: 'teal-9', message: t('inventario.form.image.uploaded') });
  } catch (error) {
    notifyError(error, t('inventario.form.image.uploadFailed'));
  } finally {
    uploadingImage.value = false;
  }
}

onBeforeUnmount(clearPendingImage);

// --- Carga, guardado y navegación -------------------------------------------

function notifyError(error: unknown, fallback: string) {
  $q.notify({ type: 'negative', color: 'red-9', message: getApiErrorMessage(error, fallback) });
}

function goToList() {
  void router.push(listPath.value);
}

async function loadElem(id: number) {
  try {
    const detail = await elemsStore.fetchElem(id);
    if (detail.tipoElementoInventarioId !== props.tipoId) {
      $q.notify({ type: 'negative', color: 'red-9', message: t('inventario.form.wrongType') });
      void router.replace(listPath.value);
      return;
    }
    form.value = withBlock(detail.form, props.tipoId);
    currentImageUrl.value = detail.imagenUrl;
  } catch (error) {
    notifyError(error, t('inventario.form.loadError'));
    void router.replace(listPath.value);
  }
}

async function onSubmit() {
  const isValid = await formRef.value?.validate();
  if (!isValid) return;

  serverErrors.value = {};
  saving.value = true;
  try {
    if (elemId.value !== null) {
      await elemsStore.updateElem(elemId.value, props.tipoId, form.value);
    } else {
      const newId = await elemsStore.createElem(props.tipoId, form.value);
      if (pendingImage.value) {
        // El elemento ya existe: si la imagen falla, se avisa y se sigue al listado.
        try {
          await elemsStore.uploadImagen(newId, props.tipoId, pendingImage.value);
        } catch (imageError) {
          $q.notify({
            type: 'negative',
            color: 'red-9',
            message: getApiErrorMessage(imageError, t('inventario.form.image.uploadError')),
          });
        }
      }
    }
    $q.notify({
      type: 'positive',
      color: 'teal-9',
      message: t(
        isEditMode.value
          ? 'inventario.form.saveSuccessUpdate'
          : 'inventario.form.saveSuccessCreate',
      ),
    });
    goToList();
  } catch (error) {
    // Con errores mapeados a campos basta el mensaje bajo cada uno; si no, aviso general.
    if (!applyServerErrors(error)) {
      notifyError(error, t('inventario.form.saveError'));
    }
  } finally {
    saving.value = false;
  }
}

onMounted(async () => {
  loading.value = true;
  try {
    await Promise.all([loadSelectOptions(), elemId.value !== null ? loadElem(elemId.value) : null]);
  } finally {
    loading.value = false;
  }
});
</script>

<style scoped>
.form-section {
  padding: 12px 16px;
  border-radius: 8px;
  border-left: 4px solid #90a4ae;
  background: rgba(144, 164, 174, 0.1);
}
.form-section__title {
  color: #37474f;
}
/* Datos generales: destaca sobre el resto con el teal de la marca. */
.form-section--general {
  border-left-color: #00695c;
  background: rgba(0, 150, 136, 0.14);
  box-shadow: 0 1px 6px rgba(0, 105, 92, 0.18);
}
.form-section--general .form-section__title {
  color: #004d40;
}
</style>
