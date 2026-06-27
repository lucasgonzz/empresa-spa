<template>
	<b-modal
	:id="modal_id"
	size="lg"
	hide-footer
	:title="modal_title"
	@hide="reset">

		<!-- Indicador de pasos -->
		<div class="ai-import-steps m-b-20">
		<span
		v-for="n in 4"
			:key="n"
			class="ai-import-step-dot"
			:class="{ 'ai-import-step-dot--active': step >= n }">
				{{ n }}
			</span>
		</div>

		<!-- ========================================================== -->
		<!-- PASO 1: Subir archivo y analizar con IA                     -->
		<!-- ========================================================== -->
		<div v-if="step === 1">

			<p class="text-muted m-b-15">
				Subí tu planilla Excel y Claude IA detectará automáticamente qué columna corresponde a cada propiedad del sistema.
			</p>

			<b-form-group label="Archivo Excel (.xlsx, .xls)">
				<b-form-file
				v-model="file"
				accept=".xlsx,.xls"
				placeholder="Seleccioná un archivo..."
				browse-text="Explorar"
				@input="onFileChange">
				</b-form-file>
			</b-form-group>

			<!-- Resumen del rango detectado y detección de cabecera al elegir el archivo -->
			<div v-if="finish_row && !file_processing" class="ai-import-file-info m-t-10 m-b-10">

				<!-- Resumen de filas -->
				<p class="text-muted small m-b-5">
					Última fila con contenido detectada: <strong>{{ finish_row }}</strong>.
					<span v-if="excel_rows_to_import_count > 0">
						Se importarán <strong>{{ excel_rows_to_import_count }}</strong> filas
						(desde la fila <strong>{{ start_row }}</strong> hasta la <strong>{{ finish_row }}</strong>).
					</span>
				</p>

				<!-- Toggle de cabecera: permite corregir la detección automática -->
				<div class="ai-import-header-detection">
					<b-form-checkbox
					v-model="has_header_row"
					size="sm"
					@change="header_row_manually_overridden = true">
						La primera fila es una cabecera de columnas
						<span v-if="!header_row_manually_overridden" class="text-muted ai-import-header-auto-label">
							(detectado automáticamente)
						</span>
					</b-form-checkbox>
					<!-- Advertencia cuando no hay cabecera: el mapeo de Claude puede ser menos preciso -->
					<small v-if="!has_header_row" class="text-warning d-block m-t-3">
						Sin cabecera: Claude recibirá solo los datos para inferir el mapeo. La detección puede ser menos precisa.
					</small>
					<!-- Aviso cuando la cabecera no está en la fila 1 (filas vacías al inicio del Excel) -->
					<small
					v-if="has_header_row && !header_row_manually_overridden && Number(start_row) > 2"
					class="text-muted d-block m-t-3">
						Cabecera detectada en fila {{ Number(start_row) - 1 }}. Los datos empiezan en la fila {{ start_row }}.
					</small>
				</div>

			</div>
			<p
			v-if="file_processing"
			class="text-muted small m-t-10 m-b-0">
				Leyendo filas del Excel...
			</p>
			<b-alert
			v-if="excel_rows_read_error"
			show
			variant="warning"
			class="m-t-10 m-b-0">
				{{ excel_rows_read_error }}
			</b-alert>

			<!-- Mensaje de error del análisis -->
			<b-alert
			v-if="error_message"
			show
			variant="danger"
			class="m-t-10">
				{{ error_message }}
			</b-alert>

			<b-button
			variant="primary"
			block
			:disabled="!file || loading || file_processing"
			@click="analyze">
				<b-spinner
				v-if="loading"
				small
				class="m-r-5">
				</b-spinner>
				{{ loading ? 'Analizando con IA...' : 'Analizar con IA' }}
			</b-button>

		</div>

		<!-- ========================================================== -->
		<!-- PASO 2: Confirmar proveedor y mapeo de columnas             -->
		<!-- ========================================================== -->
		<div v-if="step === 2">

		<!-- Sección de proveedor inferido (solo para artículos) -->
		<div
		v-if="model === 'article'"
		class="m-b-20">

			<p class="font-weight-bold m-b-5">Proveedor detectado</p>

			<!-- Alerta si la confianza del proveedor es baja -->
			<b-alert
			v-if="provider_confidence === 'bajo'"
			show
			variant="warning"
			class="m-b-10">
				<i class="icon-alert-triangle m-r-5"></i>
				Confianza baja — verificá el proveedor antes de continuar.
			</b-alert>

			<b-form-group
			:description="provider_confidence_label">
				<b-form-select
				v-model="selected_provider_id"
				:options="provider_options">
				</b-form-select>
			</b-form-group>

			<b-alert
			v-if="has_provider_column"
			show
			variant="info"
			class="m-t-10 m-b-0">
				<i class="icon-info m-r-5"></i>
				El proveedor de cada artículo se tomará de la columna del Excel.
				Dejá <strong>Sin proveedor</strong> en el selector de arriba para que funcione correctamente.
				Si elegís un proveedor global, pisará el valor de la columna para todos los artículos.
			</b-alert>

		</div>

		<hr
		v-if="model === 'article'">

			<!-- Tabla de mapeo de columnas -->
			<p class="font-weight-bold m-b-10">Mapeo de columnas</p>

			<p class="text-muted small m-b-15">
				Revisá que cada columna del Excel esté asignada a la propiedad correcta.
				<span class="text-warning">Las filas en amarillo tienen baja confianza.</span>
				<span class="ai-import-mapping-legend-interpretation"> Las filas en celeste son interpretaciones de la IA que conviene validar.</span>
				<span class="ai-import-mapping-legend-ignored"> Las filas en violeta se ignoran en la importación.</span>
			</p>

			<!-- Notas de asistencia globales de Claude (consejos generales sobre el archivo) -->
			<div
			v-if="assistant_notes.length > 0"
			class="assistant-notes-container m-b-15">
				<div
				v-for="(note, idx) in assistant_notes"
				:key="'an-' + idx"
				class="assistant-note">
					<span class="assistant-note-icon">💡</span>
					<span class="assistant-note-text">{{ note }}</span>
				</div>
			</div>

			<b-alert
			v-if="column_mapping_interpretation_alerts.length > 0"
			show
			variant="info"
			class="m-b-15">
				<p class="font-weight-bold m-b-5 m-t-0">
					<i class="icon-info m-r-5"></i>
					Interpretaciones de la IA
				</p>
				<p
				v-for="(alert_text, alert_index) in column_mapping_interpretation_alerts"
				:key="'interpretation-alert-' + alert_index"
				class="small m-b-5 m-t-0">
					{{ alert_text }}
				</p>
			</b-alert>

			<div class="ai-import-mapping-table">

				<!-- Cabecera -->
				<div class="ai-import-mapping-row ai-import-mapping-row--header">
					<span>Columna en Excel</span>
					<span>Propiedad del sistema</span>
					<span class="text-center">Confianza</span>
				</div>

				<!-- Fila por cada columna detectada -->
				<div
				v-for="(item, index) in column_mapping"
				:key="index"
				class="ai-import-mapping-block"
				:class="mapping_row_highlight_class(item)">

					<div class="ai-import-mapping-row">

						<!-- Letra y nombre de la columna en el Excel -->
						<span
						class="ai-import-mapping-excel-col"
						:title="excel_column_full_label(item, index)">
							<span class="ai-import-mapping-excel-letter">
								{{ excel_column_letter_label(item, index) }}
							</span>
							<span class="ai-import-mapping-excel-header">
								{{ item.excel_column }}
							</span>
						</span>

						<!-- Select de propiedad del sistema -->
						<b-form-select
						v-model="item.system_property"
						:options="system_property_options"
						size="sm">
						</b-form-select>

						<!-- Nivel de confianza del mapeo sugerido por IA -->
						<span class="ai-import-mapping-confidence text-center">
							<span
							class="ai-import-mapping-confidence-value"
							:class="column_confidence_text_class(item.confidence)"
							:title="column_confidence_title(item.confidence)">
								{{ format_column_confidence(item.confidence) }}
							</span>
							<small
							v-if="column_confidence_is_low(item.confidence)"
							class="ai-import-mapping-confidence-hint text-warning">
								Revisar
							</small>
							<small
							v-else-if="column_has_interpretation_note(item)"
							class="ai-import-mapping-confidence-hint text-info">
								Validar
							</small>
						</span>

					</div>

					<p
					v-if="column_has_interpretation_note(item)"
					class="ai-import-mapping-interpretation-note small m-b-0">
						<i class="icon-info m-r-5"></i>
						{{ item.interpretation_note }}
					</p>

				</div>

			</div>

			<!-- Preview de artículos: tabla reactiva con los primeros 5 registros del Excel -->
			<div
			v-if="preview_columns.length > 0 && preview_rows.length > 0"
			class="m-t-20">
				<p class="font-weight-bold m-b-8 small">
					Vista previa - primeros {{ preview_rows.length }} artículos del Excel
				</p>

				<div class="ai-import-preview-table-wrapper">
					<table class="ai-import-preview-table">
						<thead>
							<tr>
								<th
								v-for="(col, idx) in preview_columns"
								:key="'ph-' + idx">
									{{ col.label }}
								</th>
							</tr>
						</thead>
						<tbody>
							<tr
							v-for="(row, rowIdx) in preview_rows"
							:key="'pr-' + rowIdx">
								<td
								v-for="(col, colIdx) in preview_columns"
								:key="'pc-' + rowIdx + '-' + colIdx">
									{{ row[col.excel_column_index] || '-' }}
								</td>
							</tr>
						</tbody>
					</table>
				</div>

				<small class="text-muted d-block m-t-5">
					Las columnas marcadas como "Ignorar columna" no aparecen en esta preview.
				</small>

			</div>

			<div class="m-t-20 j-end">
				<b-button
				variant="outline-secondary"
				class="m-r-10"
				@click="step = 1">
					Volver
				</b-button>
				<b-button
				variant="primary"
				:disabled="loading_recomendacion"
				@click="confirmar_paso_2">
					<b-spinner
					v-if="loading_recomendacion"
					small
					class="m-r-5">
					</b-spinner>
					{{ loading_recomendacion ? 'Generando recomendación...' : 'Confirmar y configurar importación' }}
				</b-button>
			</div>

		</div>

		<!-- ========================================================== -->
		<!-- PASO 3: Recomendación de configuración basada en preanálisis -->
		<!-- ========================================================== -->
		<div v-if="step === 3">

			<!-- Chips de resumen del archivo -->
			<div v-if="duplicate_stats" class="ai-import-summary-chips m-b-15">

				<!-- Total de filas -->
				<span class="ai-import-summary-chip">
					📄 {{ duplicate_stats.total_filas_datos }} filas totales
				</span>

				<!-- Códigos de proveedor repetidos (solo si hay) -->
				<span
				v-if="duplicate_stats.provider_codes_duplicados_intra_archivo > 0"
				class="ai-import-summary-chip ai-import-summary-chip--warning">
					⚠️ {{ duplicate_stats.provider_codes_duplicados_intra_archivo }} cód. proveedor repetido{{ duplicate_stats.provider_codes_duplicados_intra_archivo > 1 ? 's' : '' }}
				</span>

				<!-- Códigos de barras repetidos (solo si hay) -->
				<span
				v-if="duplicate_stats.bar_codes_duplicados_intra_archivo > 0"
				class="ai-import-summary-chip ai-import-summary-chip--warning">
					⚠️ {{ duplicate_stats.bar_codes_duplicados_intra_archivo }} cód. barras repetido{{ duplicate_stats.bar_codes_duplicados_intra_archivo > 1 ? 's' : '' }}
				</span>

				<!-- Colisiones en BD (mismo proveedor) -->
				<span
				v-if="duplicate_stats.provider_codes_existentes_mismo_proveedor > 0"
				class="ai-import-summary-chip ai-import-summary-chip--info">
					🔁 {{ duplicate_stats.provider_codes_existentes_mismo_proveedor }} ya en BD (mismo proveedor)
				</span>

				<!-- Colisiones en BD (otros proveedores) -->
				<span
				v-if="duplicate_stats.provider_codes_existentes_otros_proveedores > 0"
				class="ai-import-summary-chip ai-import-summary-chip--info">
					🔁 {{ duplicate_stats.provider_codes_existentes_otros_proveedores }} ya en BD (otro proveedor)
				</span>

			</div>

			<!-- Tabla de códigos de proveedor repetidos -->
			<div v-if="provider_codes_detail.length > 0" class="m-b-15">

				<p class="font-weight-bold m-b-8 small">Códigos de proveedor repetidos</p>

				<div class="ai-import-duplicates-table">
					<div class="ai-import-duplicates-table__header">
						<span>Código</span>
						<span class="text-center">Repeticiones</span>
						<span>Filas en el Excel</span>
					</div>
					<div
					v-for="(item, idx) in provider_codes_detail"
					:key="'pc-' + idx"
					class="ai-import-duplicates-table__row">
						<span>{{ item.codigo }}</span>
						<span class="text-center">
							<span class="ai-import-duplicates-badge">{{ item.veces }}</span>
						</span>
						<span class="text-muted">{{ item.filas.join(', ') }}</span>
					</div>
				</div>

				<!-- Aviso de truncado cuando hay más duplicados que los mostrados -->
				<small
				v-if="duplicate_stats && duplicate_stats.provider_codes_duplicados_intra_archivo > provider_codes_detail.length"
				class="text-muted d-block m-t-5">
					y {{ duplicate_stats.provider_codes_duplicados_intra_archivo - provider_codes_detail.length }} más...
				</small>

			</div>

			<!-- Tabla de códigos de barras repetidos -->
			<div v-if="bar_codes_detail.length > 0" class="m-b-15">

				<p class="font-weight-bold m-b-8 small">Códigos de barras repetidos</p>

				<div class="ai-import-duplicates-table">
					<div class="ai-import-duplicates-table__header">
						<span>Código</span>
						<span class="text-center">Repeticiones</span>
						<span>Filas en el Excel</span>
					</div>
					<div
					v-for="(item, idx) in bar_codes_detail"
					:key="'bc-' + idx"
					class="ai-import-duplicates-table__row">
						<span>{{ item.codigo }}</span>
						<span class="text-center">
							<span class="ai-import-duplicates-badge">{{ item.veces }}</span>
						</span>
						<span class="text-muted">{{ item.filas.join(', ') }}</span>
					</div>
				</div>

				<!-- Aviso de truncado cuando hay más duplicados que los mostrados -->
				<small
				v-if="duplicate_stats && duplicate_stats.bar_codes_duplicados_intra_archivo > bar_codes_detail.length"
				class="text-muted d-block m-t-5">
					y {{ duplicate_stats.bar_codes_duplicados_intra_archivo - bar_codes_detail.length }} más...
				</small>

			</div>

			<!-- Explicación del comportamiento con bar_codes repetidos -->
			<b-alert
			v-if="bar_codes_detail.length > 0 || (duplicate_stats && duplicate_stats.bar_codes_duplicados_intra_archivo > 0)"
			show
			variant="warning"
			class="m-b-15">
				<p class="font-weight-bold m-b-5 m-t-0 small">
					<i class="icon-alert-triangle m-r-5"></i>
					¿Qué va a pasar con los códigos de barras repetidos?
				</p>
				<p class="small m-b-0 m-t-0">
					No se crearán artículos con código de barras duplicado.
					Cuando el mismo código aparece varias veces en el Excel,
					se procesará <strong>un único artículo</strong> y la información
					de la <strong>última aparición</strong> en el archivo sobreescribirá a las anteriores.
					Revisá el Excel antes de continuar, o tené en cuenta que solo quedará
					la información de la última fila con ese código.
				</p>
			</b-alert>

			<!-- Card de recomendación de Claude IA -->
			<div v-if="recomendacion_configuracion" class="ai-import-recomendacion-card m-b-20">

				<p class="font-weight-bold m-b-8">
					<i class="icon-cpu m-r-5"></i>Recomendación de Claude IA
				</p>

				<!-- Texto explicativo de la recomendación -->
				<p class="text-muted small m-b-10">{{ recomendacion_configuracion.explicacion }}</p>

				<!-- Resumen visual: qué clave recomienda usar -->
				<div v-if="recomendacion_clave_label" class="ai-import-recomendacion-decision">
					<i class="icon-check-circle m-r-5"></i>
					Identificar por: <strong>{{ recomendacion_clave_label }}</strong>
				</div>

			</div>

		<!-- Decisión 1: clave de identidad del artículo -->
		<b-form-group
		label="¿Qué campo identifica un artículo como 'el mismo'?"
		label-class="ai-import-decision-title">
			<b-form-radio v-model="clave_identidad" value="bar_code" class="m-b-5">
				Código de barras
			</b-form-radio>
			<b-form-radio v-model="clave_identidad" value="provider_code" class="m-b-5">
				Código de proveedor
			</b-form-radio>
			<b-form-radio v-model="clave_identidad" value="name" class="m-b-5">
				Nombre del artículo
			</b-form-radio>
		</b-form-group>

		<!-- Decisión 2: política de colisión — visible siempre que la clave sea provider_code -->
		<b-form-group
		v-if="clave_identidad === 'provider_code'"
		label="Si el código de proveedor coincide con artículos que ya existen en el sistema, ¿qué hacer?"
		label-class="ai-import-decision-title">
			<b-form-radio v-model="politica_colision" value="actualizar_todos" class="m-b-5">
				Actualizar todos los artículos con ese código de proveedor
				<small class="d-block text-muted m-t-3">
					<template v-if="duplicate_stats && duplicate_stats.provider_codes_existentes_mismo_proveedor === 0">
						Como es la primera importación, se creará un artículo por cada fila. En futuras importaciones, si el mismo código ya existe en el sistema, se actualizarán todos los artículos que lo tengan.
					</template>
					<template v-else>
						Cada fila del Excel actualizará todos los artículos del sistema que tengan ese mismo código de proveedor, sin importar cuántos sean.
					</template>
				</small>
			</b-form-radio>
			<b-form-radio v-model="politica_colision" value="actualizar_uno" class="m-b-5">
				Actualizar solo el primer artículo con ese código de proveedor
				<small class="d-block text-muted m-t-3">
					Si en el sistema hay varios artículos con el mismo código de proveedor, solo se actualizará el más antiguo. Si no existe ninguno, se creará uno nuevo.
				</small>
			</b-form-radio>
			<b-form-radio v-model="politica_colision" value="crear_nuevo" class="m-b-5">
				Ignorar coincidencias y crear un artículo nuevo
				<small class="d-block text-muted m-t-3">
					Aunque ya exista un artículo con ese código de proveedor en el sistema, se creará uno nuevo adicional.
				</small>
			</b-form-radio>
		</b-form-group>

		<!-- Decisión 3: política para códigos de proveedor existentes en otros proveedores -->
		<b-form-group
		v-if="clave_identidad === 'provider_code' && duplicate_stats && duplicate_stats.provider_codes_existentes_otros_proveedores > 0"
		label="El código de proveedor ya existe en otros proveedores. ¿Qué hacer con esos artículos?"
		label-class="ai-import-decision-title">
			<b-form-radio v-model="politica_otro_proveedor" value="ignorar" class="m-b-5">
				Ignorar esos artículos y crear nuevos para este proveedor
				<small class="d-block text-muted m-t-3">
					El mismo código de proveedor puede pertenecer a distintos proveedores. Los artículos del otro proveedor no serán modificados. Se crearán artículos nuevos para el proveedor seleccionado en este paso, aunque compartan el código de proveedor con los existentes.
				</small>
			</b-form-radio>
			<b-form-radio v-model="politica_otro_proveedor" value="actualizar" class="m-b-5">
				Actualizar los artículos del otro proveedor con los datos de este Excel
				<small class="d-block text-muted m-t-3">
					Usá esta opción si los artículos fueron importados antes con el proveedor equivocado. Los artículos que tengan ese código de proveedor, sin importar a qué proveedor están asignados actualmente, serán actualizados con los datos de este Excel.
				</small>
			</b-form-radio>
		</b-form-group>

			<div class="j-end">
				<b-button
				variant="outline-secondary"
				class="m-r-10"
				@click="step = 2">
					Volver
				</b-button>
				<b-button
				variant="primary"
				:disabled="!clave_identidad
					|| (clave_identidad === 'provider_code' && duplicate_stats && duplicate_stats.provider_codes_duplicados_intra_archivo > 0 && !politica_colision)
					|| (clave_identidad === 'provider_code' && duplicate_stats && duplicate_stats.provider_codes_existentes_otros_proveedores > 0 && !politica_otro_proveedor)"
				@click="step = 4">
					Continuar
				</b-button>
			</div>

		</div>

		<!-- ========================================================== -->
		<!-- PASO 4: Opciones de importación                             -->
		<!-- ========================================================== -->
		<div v-if="step === 4">

			<p class="font-weight-bold m-b-15">Opciones de importación</p>

			<!-- Rango de filas (igual que el modal de importación clásico) -->
			<b-form-group
			label="Fila a partir de la cual empezar a importar">
				<b-form-input
				type="number"
				v-model="start_row"
				placeholder="Fila a partir de la cual empezar a importar">
				</b-form-input>
			</b-form-group>

			<b-form-group
			description="Dejar en blanco para importar hasta la última fila"
			label="Última fila hasta la cual importar">
				<b-form-input
				type="number"
				v-model="finish_row"
				placeholder="Última fila hasta la cual importar">
				</b-form-input>
			</b-form-group>

		<p
		v-if="excel_rows_to_import_count > 0"
		class="text-muted small m-b-15">
			Rango efectivo: filas {{ start_row }} a {{ finish_row }}
			<span v-if="model === 'article'">
				({{ excel_rows_to_import_count }} filas, aprox. {{ estimated_chunks_count }} chunks de 50 filas).
			</span>
			<span v-else>
				({{ excel_rows_to_import_count }} filas).
			</span>
		</p>

		<hr>

		<!-- Operación a realizar -->
		<b-form-group label="Operaciones a realizar">
			<b-form-radio
			class="radio-option m-b-5"
			:value="0"
			size="lg"
			v-model="create_and_edit">
				Solo editar {{ model_label_plural }} existentes
			</b-form-radio>
			<b-form-radio
			class="radio-option"
			:value="1"
			size="lg"
			v-model="create_and_edit">
				Cargar nuevos {{ model_label_plural }} y editar existentes
			</b-form-radio>
		</b-form-group>

			<!-- Error al importar -->
			<b-alert
			v-if="error_message"
			show
			variant="danger"
			class="m-t-10 m-b-15">
				{{ error_message }}
			</b-alert>

			<div class="j-end">
				<b-button
				variant="outline-secondary"
				class="m-r-10"
				@click="step = 3">
					Volver
				</b-button>
				<b-button
				variant="success"
				:disabled="loading || create_and_edit === null || !can_start_import"
				@click="importar">
					<b-spinner
					v-if="loading"
					small
					class="m-r-5">
					</b-spinner>
					{{ loading ? 'Iniciando importación...' : 'Importar' }}
				</b-button>
			</div>

		</div>

	</b-modal>
</template>

<script>
import * as XLSX from 'xlsx/xlsx.mjs'

export default {

	props: {
		/*
		 * Modelo de importación: 'article', 'client' o 'provider'.
		 * Controla las propiedades del sistema disponibles, las secciones
		 * condicionales y el id del modal.
		 */
		model: {
			type: String,
			default: 'article',
		},
	},

	/* Estado reactivo del modal. */
	data() {
		return {
			/* Paso actual del flujo (1, 2 o 3). */
			step: 1,

			/* Archivo Excel seleccionado por el usuario en el paso 1. */
			file: null,

			/* Lectura local del Excel para detectar última fila (como importación clásica). */
			file_processing: false,

			/* Primera fila de datos a importar; por defecto 2 (fila 1 = encabezados). */
			start_row: 2,

			/* Última fila con contenido detectada en el archivo. */
			finish_row: '',

			/* Copia de respaldo del finish_row detectado automáticamente. */
			finish_row_original: '',

			/* Error al leer filas localmente (no bloquea analizar; se reintenta al hacer clic). */
			excel_rows_read_error: '',

			/* Estado de carga para bloquear botones durante peticiones. */
			loading: false,

			/* Mensaje de error descriptivo para mostrar en la UI. */
			error_message: '',

			/* Ruta relativa del archivo guardado, devuelta por /analyze. */
			excel_path: null,

			/* Mapeo de columnas devuelto por Claude, modificable por el usuario. */
			column_mapping: [],

			/* ID del proveedor inferido por Claude (puede ser null). */
			selected_provider_id: null,

			/* Nivel de confianza del proveedor inferido: "alto", "medio" o "bajo". */
			provider_confidence: 'bajo',

			/* Opción de operación: 0=solo actualizar, 1=crear y actualizar. */
			create_and_edit: null,

			/* Opciones avanzadas de importación, con los mismos defaults que el modal existente. */
			actualizar_articulos_de_otro_proveedor: 1,
			permitir_provider_code_repetido: 0,
			permitir_provider_code_repetido_en_multi_providers: 0,
			actualizar_por_provider_code: 0,
			actualizar_proveedor: 0,

			/* True si la fila 1 del Excel fue detectada como cabecera de columnas. */
			has_header_row: true,

			/* True si el usuario corrigió manualmente la detección automática de cabecera. */
			header_row_manually_overridden: false,

			/* Estadísticas de duplicados devueltas por el análisis IA (preanálisis del Excel). */
			duplicate_stats: null,

			/* Índice 0-based de la columna provider_code, guardado tras el análisis para refresh-provider-stats. */
			provider_code_column_index: null,

			/* Recomendación de configuración generada por Claude: { clave_identidad, politica_colision, explicacion }. */
			recomendacion_configuracion: null,

			/* True mientras se espera la recomendación de Claude al confirmar el paso 2. */
			loading_recomendacion: false,

			/* Clave que identifica un artículo como "el mismo": 'bar_code' | 'provider_code' | 'name'. */
			clave_identidad: null,

			/* Política a aplicar cuando la clave coincide con varios artículos: 'actualizar_todos' | 'actualizar_uno' | 'crear_nuevo'. */
			politica_colision: null,

			/*
			 * Política para artículos de otros proveedores con el mismo provider_code:
			 * 'ignorar' → no tocar esos artículos, crear nuevos para este proveedor
			 * 'actualizar' → pisar los artículos del otro proveedor con los datos del Excel
			 */
			politica_otro_proveedor: null,

			/* Filas de muestra del Excel (máx. 5) para la preview del paso 2. */
			preview_rows: [],

			/* Notas globales de asistencia generadas por Claude durante el análisis. */
			assistant_notes: [],
		}
	},

	computed: {

		/*
		 * ID único del modal según el modelo; mantiene compatibilidad con artículos
		 * y permite múltiples instancias del modal en la misma app sin colisión de ids.
		 */
		modal_id() {
			if (this.model === 'article') return 'ai-excel-import-modal'
			return 'ai-' + this.model + '-excel-import-modal'
		},

		/*
		 * Etiqueta en plural del modelo para los textos de la UI.
		 */
		model_label_plural() {
			const labels = {
				article:  'artículos',
				client:   'clientes',
				provider: 'proveedores',
			}
			return labels[this.model] || this.model
		},

		/*
		 * Título dinámico del modal según el paso actual y el modelo de importación.
		 */
		modal_title() {
			const model_labels = {
				article:  'Artículos',
				client:   'Clientes',
				provider: 'Proveedores',
			}
			const model_label = model_labels[this.model] || this.model

			const titles = {
				1: 'Importar ' + model_label + ' con IA — Subir archivo',
				2: 'Importar ' + model_label + ' con IA — Confirmar mapeo',
				3: 'Importar ' + model_label + ' con IA — Recomendación',
				4: 'Importar ' + model_label + ' con IA — Opciones de importación',
			}
			return titles[this.step] || ('Importar ' + model_label + ' con IA')
		},

		/*
		 * Proveedores disponibles del usuario, cargados desde el store.
		 * Se transforman en opciones para b-form-select.
		 */
		providers() {
			return this.$store.state.provider.models
		},

		/*
		 * Depósitos del usuario, usados para generar dinámicamente las opciones
		 * de stock por depósito en el dropdown de mapeo.
		 */
		addresses() {
			return this.$store.state.address.models
		},

		/*
		 * Listas de precio del usuario, usadas para generar dinámicamente las
		 * opciones de precio por lista en el dropdown de mapeo.
		 */
		price_types() {
			return this.$store.state.price_type.models
		},

		provider_options() {
			/* Opción vacía como primera opción del select. */
			let options = [{ value: null, text: 'Sin proveedor' }]

			/* Deduplicar por id antes de mapear, por si el store acumuló cargas múltiples. */
			const seen_ids = new Set()
			this.providers.forEach(provider => {
				if (!seen_ids.has(provider.id)) {
					seen_ids.add(provider.id)
					options.push({ value: provider.id, text: provider.name })
				}
			})

			return options
		},

		/*
		 * Descripción textual del nivel de confianza del proveedor inferido.
		 * Se muestra como descripción del b-form-group en el paso 2.
		 */
		provider_confidence_label() {
			const labels = {
				alto: 'Alta confianza — el proveedor fue inferido con seguridad',
				medio: 'Confianza media — verificá que el proveedor sea correcto',
				bajo: 'Confianza baja — no se pudo determinar con seguridad',
			}
			return labels[this.provider_confidence] || ''
		},

		/*
		 * True si en el paso 2 se eligió un proveedor para todo el archivo (no "Sin proveedor").
		 */
		has_selected_provider() {
			if (this.selected_provider_id === null || this.selected_provider_id === '') {
				return false
			}

			return Number(this.selected_provider_id) > 0
		},

		/*
		 * True si alguna columna del mapeo fue asignada a 'proveedor'.
		 * En ese caso el proveedor de cada artículo se toma de la columna del Excel,
		 * no del selector global.
		 */
		has_provider_column() {
			return this.column_mapping.some(item => item.system_property === 'proveedor')
		},

		/*
		 * Cantidad de filas que se importarán según start_row y finish_row.
		 */
		excel_rows_to_import_count() {
			let finish = Number(this.finish_row)
			let start = Number(this.start_row)

			if (!finish || !start || finish < start) {
				return 0
			}

			return finish - start + 1
		},

		/*
		 * Estimación de chunks según ARTICLE_EXCEL_CHUNK_SIZE del backend (referencia UX).
		 */
		estimated_chunks_count() {
			let rows = this.excel_rows_to_import_count
			if (rows <= 0) {
				return 0
			}

			let chunk_size = 50
			return Math.ceil(rows / chunk_size)
		},

		/*
		 * Permite importar solo si hay rango de filas válido y el archivo ya fue leído.
		 */
		can_start_import() {
			if (this.file_processing) {
				return false
			}

			let finish = Number(this.finish_row)
			let start = Number(this.start_row)

			return finish > 0 && start > 0 && finish >= start
		},

		/*
		 * Textos únicos de interpretation_note para el alert resumen del paso 2.
		 */
		column_mapping_interpretation_alerts() {
			let alerts = []
			let seen = {}

			this.column_mapping.forEach(item => {
				if (!this.column_has_interpretation_note(item)) {
					return
				}

				let note = (item.interpretation_note || '').trim()
				if (note === '' || seen[note]) {
					return
				}

				seen[note] = true
				alerts.push(note)
			})

			return alerts
		},

		/*
		 * Detalle enriquecido de códigos de proveedor repetidos (del preanálisis).
		 * Cada elemento: { codigo, veces, filas }.
		 * Vacío si no hay datos o si la columna no estaba mapeada.
		 */
		provider_codes_detail() {
			if (
				!this.duplicate_stats
				|| !Array.isArray(this.duplicate_stats.detalle_provider_codes_duplicados)
			) {
				return []
			}

			return this.duplicate_stats.detalle_provider_codes_duplicados
		},

		/*
		 * Detalle enriquecido de códigos de barras repetidos (del preanálisis).
		 * Cada elemento: { codigo, veces, filas }.
		 * Vacío si no hay datos o si la columna no estaba mapeada.
		 */
		bar_codes_detail() {
			if (
				!this.duplicate_stats
				|| !Array.isArray(this.duplicate_stats.detalle_bar_codes_duplicados)
			) {
				return []
			}

			return this.duplicate_stats.detalle_bar_codes_duplicados
		},

		/*
		 * Etiqueta legible de la clave de identidad recomendada por Claude.
		 * Se usa en el resumen visual de la card de recomendación.
		 */
		recomendacion_clave_label() {
			if (!this.recomendacion_configuracion) return ''

			const labels = {
				bar_code:     'Código de barras',
				provider_code: 'Código de proveedor',
				name:          'Nombre del artículo',
			}

			return labels[this.recomendacion_configuracion.clave_identidad] || ''
		},

		/*
		 * Opciones para el select de propiedades del sistema en la tabla de mapeo.
		 * Varía según el modelo (article, client, provider).
		 * El valor null corresponde a "Ignorar columna".
		 */
		system_property_options() {
			/* Opción vacía común a todos los modelos. */
			const ignore_option = { value: null, text: 'Ignorar columna' }

			if (this.model === 'client') {
				return [
					ignore_option,
					{ value: 'nombre',                   text: 'Nombre' },
					{ value: 'telefono',                 text: 'Teléfono' },
					{ value: 'email',                    text: 'Email' },
					{ value: 'direccion',                text: 'Dirección' },
					{ value: 'localidad',                text: 'Localidad' },
					{ value: 'provincia',                text: 'Provincia' },
					{ value: 'cuit',                     text: 'CUIT' },
					{ value: 'cuil',                     text: 'CUIL' },
					{ value: 'dni',                      text: 'DNI' },
					{ value: 'razon_social',             text: 'Razón social' },
					{ value: 'numero',                   text: 'Número de cliente' },
					{ value: 'vendedor',                 text: 'Vendedor' },
					{ value: 'condicion_frente_al_iva',  text: 'Condición frente al IVA' },
					{ value: 'tipo_de_precio',           text: 'Tipo de precio' },
					{ value: 'saldo_actual',             text: 'Saldo actual' },
					{ value: 'descripcion',              text: 'Descripción' },
				]
			}

			if (this.model === 'provider') {
				return [
					ignore_option,
					{ value: 'nombre',                   text: 'Nombre' },
					{ value: 'telefono',                 text: 'Teléfono' },
					{ value: 'email',                    text: 'Email' },
					{ value: 'direccion',                text: 'Dirección' },
					{ value: 'localidad',                text: 'Localidad' },
					{ value: 'cuit',                     text: 'CUIT' },
					{ value: 'razon_social',             text: 'Razón social' },
					{ value: 'numero',                   text: 'Número de proveedor' },
					{ value: 'condicion_frente_al_iva',  text: 'Condición frente al IVA' },
					{ value: 'observaciones',            text: 'Observaciones' },
				]
			}

			/* Opciones para artículos (model === 'article' o default). */
			let options = [
				ignore_option,
				{ value: 'nombre',                text: 'Nombre' },
				{ value: 'codigo_de_barras',      text: 'Código de barras' },
				{ value: 'sku',                   text: 'SKU' },
				{ value: 'codigo_de_proveedor',   text: 'Código de proveedor' },
				{ value: 'costo',                 text: 'Costo' },
				{ value: 'precio',                text: 'Precio' },
				{ value: 'iva',                   text: 'IVA' },
				{ value: 'margen_de_ganancia',    text: 'Margen de ganancia' },
				{ value: 'categoria',             text: 'Categoría' },
				{ value: 'sub_categoria',         text: 'Sub categoría' },
				{ value: 'marca',                 text: 'Marca' },
				{ value: 'descripcion',           text: 'Descripción' },
				{ value: 'stock_actual',          text: 'Stock actual' },
				{ value: 'descuentos',            text: 'Descuentos' },
				{ value: 'recargos',              text: 'Recargos' },
				{ value: 'proveedor',             text: 'Proveedor' },
				/* Precio */
				{ value: 'costo_en_dolares',    text: 'Costo en dólares (Si/No)' },
				{ value: 'aplicar_iva',         text: 'Aplicar IVA (Si/No)' },
				/* Stock y medidas */
				{ value: 'medida',              text: 'Medida / Contenido (número)' },
				{ value: 'contenido',           text: 'Contenido (texto)' },
				{ value: 'unidad_medida',       text: 'Unidad de medida' },
				{ value: 'u_individuales',      text: 'Unidades individuales' },
				/* Descuentos y recargos */
				{ value: 'descuentos_montos',   text: 'Descuentos (montos $)' },
				{ value: 'recargos_montos',     text: 'Recargos (montos $)' },
				/* Estado y visibilidad */
				{ value: 'in_offer',            text: 'En oferta (Si/No)' },
				{ value: 'online',              text: 'Activo / Visible (Si/No)' },
				{ value: 'precio_pausado',      text: 'Precio pausado (Si/No)' },
				{ value: 'disponible_tienda_nube', text: 'Disponible en Tienda Nube (Si/No)' },
			]

			/*
			 * Grupo dinámico de depósitos: una opción de stock/min/max por cada depósito del usuario.
			 * El separador __group__ es una opción deshabilitada que actúa como encabezado visual.
			 */
			if (this.addresses.length > 0) {
				options.push({ value: '__group__', text: '— Stock por depósito —', disabled: true })
				this.addresses.forEach(address => {
					const id = address.id
					const name = address.street
					options.push({ value: `address_${id}_amount`, text: `Stock: ${name}` })
					options.push({ value: `address_${id}_min`,    text: `Stock mínimo: ${name}` })
					options.push({ value: `address_${id}_max`,    text: `Stock máximo: ${name}` })
				})
			}

			/*
			 * Grupo dinámico de listas de precio: solo disponible si el usuario tiene listas
			 * cargadas y la extensión de margen por lista activa.
			 */
			if (this.price_types.length > 0 && this.hasExtencion('articulo_margen_de_ganancia_segun_lista_de_precios')) {
				options.push({ value: '__group__', text: '— Listas de precio —', disabled: true })
				this.price_types.forEach(pt => {
					const id = pt.id
					const name = pt.name
					options.push({ value: `price_type_${id}_final_price`, text: `$ Final: ${name}` })
					options.push({ value: `price_type_${id}_percentage`,  text: `%: ${name}` })
					options.push({ value: `price_type_${id}_setear`,      text: `Setear precio final: ${name}` })
				})
			}

			return options
		},

		/*
		 * Columnas visibles en la preview del paso 2.
		 * Excluye las columnas marcadas como "Ignorar columna" (system_property === null).
		 * Cada elemento: { label: string, excel_column_index: number }
		 */
		preview_columns() {
			if (!this.column_mapping || this.column_mapping.length === 0) return []

			return this.column_mapping
				.filter(item => item.system_property !== null && item.system_property !== '')
				.map(item => ({
					label: this.get_property_label(item.system_property),
					excel_column_index: item.excel_column_index,
				}))
		},

	},

	watch: {

		/*
		 * Al elegir archivo (v-model de b-form-file), detectamos última fila como en import clásico.
		 */
		file(new_file) {
			if (new_file) {
				this.onFileChange(new_file)
			} else {
				this.finish_row = ''
				this.finish_row_original = ''
			}
		},

		/*
		 * Cuando se desactiva permitir_provider_code_repetido, limpiamos
		 * la opción dependiente para mantener consistencia.
		 */
		permitir_provider_code_repetido() {
			if (!this.permitir_provider_code_repetido) {
				this.permitir_provider_code_repetido_en_multi_providers = 0
			}
		},

		/*
		 * Cuando se desactiva actualizar_articulos_de_otro_proveedor,
		 * limpiamos actualizar_proveedor para evitar estado inconsistente.
		 */
		actualizar_articulos_de_otro_proveedor() {
			if (!this.actualizar_articulos_de_otro_proveedor) {
				this.actualizar_proveedor = 0
			}
		},

		/*
		 * Sin proveedor del archivo, las opciones de "otro proveedor" no aplican y se desactivan.
		 */
		selected_provider_id(new_val) {
			if (!this.has_selected_provider) {
				this.actualizar_articulos_de_otro_proveedor = 0
				this.actualizar_proveedor = 0
			}
			/* Recalcular stats de existentes en BD con el proveedor real seleccionado en paso 2. */
			if (this.excel_path && this.provider_code_column_index !== null) {
				this.refresh_provider_stats()
			}
		},

		/*
		 * Al cambiar el toggle de cabecera manualmente, ajustar start_row de forma relativa.
		 * Si la detección es automática, detect_header_row ya asignó start_row correctamente.
		 *
		 * @param {Boolean} val - Nuevo valor de has_header_row
		 */
		has_header_row(val) {
			/* Solo ajustar start_row si el usuario cambió el toggle manualmente. */
			if (this.header_row_manually_overridden) {
				this.start_row = val
					? Number(this.start_row) + 1
					: Math.max(1, Number(this.start_row) - 1)
			}
		},
	},

	methods: {

		/*
		 * Procesa el archivo elegido (File o evento nativo del input), igual que import/Index.vue.
		 */
		onFileChange(file_or_event) {
			let selected_file = this.resolve_selected_excel_file(file_or_event)

			if (!selected_file) {
				this.finish_row = ''
				this.finish_row_original = ''
				this.excel_rows_read_error = ''
				return
			}

			this.process_excel_file(selected_file)
		},

		/*
		 * Obtiene el File desde el evento de b-form-file, v-model o input nativo.
		 */
		resolve_selected_excel_file(file_or_event) {
			if (file_or_event && file_or_event.target && file_or_event.target.files && file_or_event.target.files.length > 0) {
				return file_or_event.target.files[0]
			}

			if (file_or_event && file_or_event.name) {
				return file_or_event
			}

			if (this.file && this.file.name) {
				return this.file
			}

			return null
		},

		/*
		 * Lee el Excel en el navegador y calcula finish_row (retorna promesa).
		 * Resetea header_row_manually_overridden para que la detección automática
		 * vuelva a correr con el nuevo archivo.
		 */
		process_excel_file(file) {
			let self = this

			self.file_processing = true
			self.finish_row = ''
			self.finish_row_original = ''
			self.excel_rows_read_error = ''

			/* Al cambiar el archivo, se vuelve a detectar la cabecera automáticamente. */
			self.header_row_manually_overridden = false

			return new Promise(function(resolve, reject) {
				let reader = new FileReader()

				reader.onload = function(e) {
					try {
						let ultima_fila_con_contenido = self.detect_last_excel_row_from_buffer(e.target.result)

						self.finish_row = ultima_fila_con_contenido
						self.finish_row_original = ultima_fila_con_contenido
						self.file_processing = false
						resolve(ultima_fila_con_contenido)
					} catch (err) {
						console.error('Error al leer filas del Excel:', err)
						self.file_processing = false
						self.excel_rows_read_error = 'No se pudo leer el archivo para detectar filas. Podés analizar igual; el servidor ajustará el rango.'
						reject(err)
					}
				}

				reader.onerror = function() {
					self.file_processing = false
					self.excel_rows_read_error = 'Error al leer el archivo en el navegador.'
					reject(new Error('FileReader error'))
				}

				reader.readAsArrayBuffer(file)
			})
		},

		/*
		 * Calcula la última fila con contenido desde el buffer del Excel (xlsx/xls).
		 * También detecta automáticamente si la fila 1 es cabecera y ajusta start_row,
		 * siempre que el usuario no haya corregido la detección manualmente.
		 */
		detect_last_excel_row_from_buffer(array_buffer) {
			let data = new Uint8Array(array_buffer)
			let workbook = XLSX.read(data, { type: 'array' })
			let sheet_name = workbook.SheetNames[0]
			let worksheet = workbook.Sheets[sheet_name]

			if (!worksheet) {
				throw new Error('Hoja vacía')
			}

			/* Método principal: mismo criterio que import/Index.vue cuando hay !ref. */
			if (worksheet['!ref']) {
				let range = XLSX.utils.decode_range(worksheet['!ref'])
				let ultima_fila_con_contenido = 1

				for (let fila = range.s.r; fila <= range.e.r; fila++) {
					for (let col = range.s.c; col <= range.e.c; col++) {
						let cell_ref = XLSX.utils.encode_cell({ c: col, r: fila })
						let cell = worksheet[cell_ref]

						if (cell && cell.v !== null && cell.v !== '') {
							ultima_fila_con_contenido = fila + 1
							break
						}
					}
				}

				/* Detectar si la fila 1 es cabecera antes de retornar. */
				this.detect_header_row(worksheet)

				return ultima_fila_con_contenido
			}

			/* Fallback si el Excel no trae !ref: recorremos filas parseadas. */
			let rows = XLSX.utils.sheet_to_json(worksheet, { header: 1, defval: '' })
			let ultima = 1

			for (let i = rows.length - 1; i >= 0; i--) {
				let row = rows[i]
				let has_content = false

				if (Array.isArray(row)) {
					for (let j = 0; j < row.length; j++) {
						if (row[j] !== null && row[j] !== '' && String(row[j]).trim() !== '') {
							has_content = true
							break
						}
					}
				}

				if (has_content) {
					ultima = i + 1
					break
				}
			}

			/* Detectar si la fila 1 es cabecera antes de retornar. */
			this.detect_header_row(worksheet)

			return ultima
		},

		/*
		 * Determina automáticamente la fila de cabecera y start_row, tolerando filas vacías al inicio.
		 * Busca la primera fila no vacía; si todas sus celdas no vacías son texto, es cabecera.
		 * Solo actúa si el usuario no sobreescribió la detección manualmente.
		 *
		 * @param {Object} worksheet - Hoja de trabajo de XLSX
		 */
		detect_header_row(worksheet) {
			/* Respetar corrección manual del usuario. */
			if (this.header_row_manually_overridden) {
				return
			}

			/*
			 * IMPORTANTE: sheet_to_json omite filas vacías del inicio, por lo que
			 * rows[0] siempre es la primera fila con contenido sin importar en qué
			 * fila física del Excel esté. Para calcular el número de fila real usamos
			 * el rango !ref del worksheet, que sí preserva la posición física.
			 *
			 * Estrategia:
			 * 1. Recorrer el worksheet celda por celda usando !ref (igual que detect_last_excel_row_from_buffer)
			 *    para encontrar la primera fila física con al menos una celda no vacía.
			 * 2. Analizar esa fila para determinar si es cabecera o datos.
			 * 3. Asignar start_row con el número de fila real del Excel.
			 */

			if (!worksheet || !worksheet['!ref']) {
				/* Sin referencia de rango: fallback a sheet_to_json para no romper el flujo. */
				let rows = XLSX.utils.sheet_to_json(worksheet, { header: 1, defval: '' })
				this.has_header_row = true
				this.start_row = rows.length > 0 ? 2 : 1
				return
			}

			let range = XLSX.utils.decode_range(worksheet['!ref'])

			/* Encontrar la primera fila física (0-based) que tenga al menos una celda no vacía. */
			let first_non_empty_r = -1

			outer:
			for (let r = range.s.r; r <= range.e.r; r++) {
				for (let c = range.s.c; c <= range.e.c; c++) {
					let cell_ref = XLSX.utils.encode_cell({ c: c, r: r })
					let cell = worksheet[cell_ref]
					if (cell && cell.v !== null && cell.v !== undefined && String(cell.v).trim() !== '') {
						first_non_empty_r = r
						break outer
					}
				}
			}

			/* Sin filas con contenido: fallback al default. */
			if (first_non_empty_r < 0) {
				this.start_row = 2
				this.has_header_row = true
				return
			}

			/* Número de fila Excel (1-based). */
			let first_non_empty_row = first_non_empty_r + 1

			/* Leer las celdas de esa fila para determinar si es cabecera. */
			let detected_as_header = true

			for (let c = range.s.c; c <= range.e.c; c++) {
				let cell_ref = XLSX.utils.encode_cell({ c: c, r: first_non_empty_r })
				let cell = worksheet[cell_ref]

				if (!cell || cell.v === null || cell.v === undefined || String(cell.v).trim() === '') {
					continue
				}

				/* Si alguna celda no vacía es numérica, no es cabecera. */
				if (typeof cell.v === 'number' || !isNaN(Number(cell.v))) {
					detected_as_header = false
					break
				}
			}

			/* Calcular start_row antes de asignar has_header_row (evita que el watcher lo pise). */
			let calculated_start_row = detected_as_header
				? first_non_empty_row + 1
				: first_non_empty_row

			this.start_row = Math.max(1, calculated_start_row)
			this.has_header_row = detected_as_header
		},

		/*
		 * True si la fila del Excel tiene al menos una celda con contenido (tras trim).
		 *
		 * @param {Array} row - Fila parseada con sheet_to_json
		 * @returns {Boolean}
		 */
		excel_row_has_content(row) {
			if (!Array.isArray(row)) {
				return false
			}

			for (let j = 0; j < row.length; j++) {
				let cell_value = row[j]

				if (cell_value !== null && cell_value !== '' && String(cell_value).trim() !== '') {
					return true
				}
			}

			return false
		},

		/*
		 * Llama al endpoint /ai-excel-import/analyze con el archivo Excel seleccionado.
		 * Al recibir respuesta de Claude, avanza al paso 2 con el mapeo sugerido.
		 */
		analyze() {
			let self = this

			if (!self.file) {
				self.$toast.error('Seleccioná un archivo Excel')
				return
			}

			if (self.file_processing) {
				self.$toast.error('Esperá a que termine de leerse el archivo')
				return
			}

			self.error_message = ''
			self.loading = true

			/*
			 * Si no se detectaron filas al elegir el archivo, reintentamos antes de llamar a la API.
			 */
			let detect_promise = Promise.resolve()

			if (!self.finish_row) {
				let file_to_read = self.resolve_selected_excel_file(self.file)
				if (file_to_read) {
					detect_promise = self.process_excel_file(file_to_read)
				}
			}

			detect_promise
			.then(function() {
				self.run_analyze_request()
			})
			.catch(function() {
				/* Aunque falle la lectura local, permitimos analizar (el backend ajusta finish_row). */
				self.run_analyze_request()
			})
		},

		/*
		 * POST a /ai-excel-import/analyze con el archivo ya seleccionado.
		 */
		run_analyze_request() {
			let self = this

			let form_data = new FormData()
			form_data.append('excel_file', self.file)
			/* Informamos al backend qué modelo analizar para elegir el analizador correcto. */
			form_data.append('model', self.model)

			let config = { headers: { 'content-type': 'multipart/form-data' } }

			self.$store.commit('auth/setMessage', 'Analizando archivo con IA...')
			self.$store.commit('auth/setLoading', true)

			self.$api.post('ai-excel-import/analyze', form_data, config)
			.then(function(res) {
				self.loading = false
				self.$store.commit('auth/setLoading', false)
				self.$store.commit('auth/setMessage', '')

				self.excel_path        = res.data.excel_path
				self.column_mapping    = self.normalize_column_mapping(res.data.column_mapping)
				self.selected_provider_id = res.data.provider_id
				self.provider_confidence  = res.data.provider_confidence

				/* Guardar índice de columna provider_code para refresh-provider-stats al cambiar proveedor. */
				const provider_col = res.data.column_mapping.find(
					col => col.system_property === 'codigo_de_proveedor'
				)
				self.provider_code_column_index = provider_col ? provider_col.excel_column_index : null

				/* Datos del preanálisis de duplicados (la recomendación se genera al confirmar el paso 2). */
				self.duplicate_stats = res.data.duplicate_stats || null
				self.preview_rows    = res.data.preview_rows || []

				/* Notas globales de asistencia que Claude generó sobre el archivo completo. */
				self.assistant_notes = res.data.assistant_notes || []

				self.step = 2
			})
			.catch(function(err) {
				self.loading = false
				self.$store.commit('auth/setLoading', false)
				self.$store.commit('auth/setMessage', '')

				let message = 'Error al analizar el archivo.'

				if (err.response && err.response.data && err.response.data.message) {
					message = err.response.data.message
				}

				self.error_message = message
			})
		},

		/*
		 * Llama al endpoint get-recomendacion con el proveedor confirmado por el usuario
		 * y los stats actualizados, y avanza al paso 3 con la recomendación correcta.
		 */
		confirmar_paso_2() {
			let self = this

			self.loading_recomendacion = true
			self.recomendacion_configuracion = null

			self.$api.post('ai-excel-import/get-recomendacion', {
				excel_path:                 self.excel_path,
				provider_id:                self.selected_provider_id,
				provider_code_column_index: self.provider_code_column_index,
				column_mapping:             self.column_mapping,
			})
			.then(function(res) {
				self.loading_recomendacion = false

				self.recomendacion_configuracion = res.data.recomendacion_configuracion || null

				/* Actualizar duplicate_stats con los conteos recalculados para el proveedor confirmado. */
				if (self.duplicate_stats) {
					self.duplicate_stats = {
						...self.duplicate_stats,
						provider_codes_existentes_mismo_proveedor:   res.data.provider_codes_existentes_mismo_proveedor,
						provider_codes_existentes_otros_proveedores: res.data.provider_codes_existentes_otros_proveedores,
					}
				}

				/* Preseleccionar los valores recomendados. */
				if (self.recomendacion_configuracion) {
					self.clave_identidad   = self.recomendacion_configuracion.clave_identidad
					self.politica_colision = self.recomendacion_configuracion.politica_colision
				}

				self.step = 3
			})
			.catch(function(err) {
				self.loading_recomendacion = false

				let message = 'Error al generar la recomendación.'
				if (err.response && err.response.data && err.response.data.message) {
					message = err.response.data.message
				}

				self.$toast.error(message)
			})
		},

		/**
		 * Recalcula provider_codes_existentes_mismo/otros_proveedor cuando el usuario
		 * cambia el proveedor en el paso 2 (stats del /analyze usan el proveedor inferido).
		 */
		refresh_provider_stats() {
			let self = this

			self.$api.post('ai-excel-import/refresh-provider-stats', {
				excel_path:                 self.excel_path,
				provider_code_column_index: self.provider_code_column_index,
				provider_id:                self.selected_provider_id,
			})
			.then(function(res) {
				self.duplicate_stats = {
					...self.duplicate_stats,
					provider_codes_existentes_mismo_proveedor:   res.data.provider_codes_existentes_mismo_proveedor,
					provider_codes_existentes_otros_proveedores: res.data.provider_codes_existentes_otros_proveedores,
				}
			})
			.catch(function(err) {
				console.warn('refresh_provider_stats: error al recalcular stats', err)
			})
		},

		/**
		 * Traduce las decisiones de negocio (clave_identidad, politica_colision y politica_otro_proveedor)
		 * a los 5 flags que sigue esperando /ai-excel-import/import.
		 * Permite mantener el contrato del backend sin cambios.
		 *
		 * @returns {Object} - Objeto con los 5 flags calculados (0 o 1 cada uno).
		 */
		derive_flags_from_choice() {
			/* Valores por defecto: todos los flags desactivados. */
			let flags = {
				permitir_provider_code_repetido: 0,
				permitir_provider_code_repetido_en_multi_providers: 0,
				actualizar_articulos_de_otro_proveedor: 0,
				actualizar_por_provider_code: 0,
				actualizar_proveedor: 0,
			}

			/* Solo se activan flags cuando la clave es provider_code. */
			if (this.clave_identidad === 'provider_code') {

				/* La política politica_otro_proveedor controla si se actualizan artículos de otros proveedores. */
				if (this.politica_otro_proveedor === 'actualizar') {
					flags.actualizar_articulos_de_otro_proveedor = 1
				}

				if (this.politica_colision === 'actualizar_todos') {
					flags.permitir_provider_code_repetido = 1
					flags.permitir_provider_code_repetido_en_multi_providers = 1
					flags.actualizar_por_provider_code = 1

				} else if (this.politica_colision === 'crear_nuevo') {
					flags.permitir_provider_code_repetido = 1
					flags.permitir_provider_code_repetido_en_multi_providers = 1
				}
				/* 'actualizar_uno' deja todos esos flags en 0. */
			}

			return flags
		},

		/*
		 * Lanza la importación de artículos usando el mapeo confirmado por el usuario.
		 * Cierra el modal al recibir respuesta exitosa del backend.
		 */
		importar() {
			if (this.create_and_edit === null) {
				this.$toast.error('Indicá las operaciones a realizar')
				return
			}

			if (!this.can_start_import) {
				this.$toast.error('Indicá un rango de filas válido (inicio y última fila)')
				return
			}

			this.error_message = ''
			this.loading = true

			this.$store.commit('auth/setMessage', 'Iniciando importación...')
			this.$store.commit('auth/setLoading', true)

			/* Traducir las decisiones de negocio del paso 3 a los flags que espera el backend. */
			let derived_flags = this.derive_flags_from_choice()

			this.$api.post('ai-excel-import/import', {
				model:           this.model,
				excel_path:      this.excel_path,
				columns:         this.build_columns(),
				provider_id:     this.selected_provider_id,
				create_and_edit: this.create_and_edit,
				start_row:       Number(this.start_row),
				finish_row:      Number(this.finish_row),
				/* Campos específicos de artículos (ignorados por el backend para client/provider). */
				registrar_art_cre: true,
				registrar_art_act: true,
				permitir_provider_code_repetido:                    derived_flags.permitir_provider_code_repetido,
				permitir_provider_code_repetido_en_multi_providers: derived_flags.permitir_provider_code_repetido_en_multi_providers,
				actualizar_articulos_de_otro_proveedor:             derived_flags.actualizar_articulos_de_otro_proveedor,
				actualizar_por_provider_code:                       derived_flags.actualizar_por_provider_code,
				actualizar_proveedor:                               derived_flags.actualizar_proveedor,
			})
			.then(() => {
				this.loading = false
				this.$store.commit('auth/setLoading', false)
				this.$store.commit('auth/setMessage', '')

				this.$bvModal.hide(this.modal_id)

				this.$toast.success(
					'La importación está en proceso. Te avisaremos cuando termine.',
					{ duration: 7000 }
				)
			})
			.catch(err => {
				this.loading = false
				this.$store.commit('auth/setLoading', false)
				this.$store.commit('auth/setMessage', '')

				let message = 'Error al iniciar la importación.'

				if (err.response && err.response.data && err.response.data.message) {
					message = err.response.data.message
				}

				this.error_message = message
			})
		},

		/*
		 * Alinea claves del mapeo IA con las que usa el importador de artículos en el backend.
		 *
		 * @param {string|null} system_property Propiedad elegida en el select de mapeo.
		 * @return {string|null} Clave canónica o null si se ignora la columna.
		 */
		normalize_system_property_key(system_property) {
			if (system_property === null || system_property === '') {
				return null
			}

			let property_aliases = {
				codigo_proveedor:  'codigo_de_proveedor',
				codigo_barras:     'codigo_de_barras',
				moneda:            'costo_en_dolares',
			}

			if (property_aliases[system_property]) {
				return property_aliases[system_property]
			}

			return system_property
		},

		/*
		 * Devuelve una etiqueta amigable para una propiedad del sistema, incluyendo
		 * las propiedades codificadas de depósitos (address_{id}_{sub_tipo}) y listas
		 * de precio (price_type_{id}_{sub_tipo}). Para propiedades planas conocidas
		 * usa el diccionario estático; si no la reconoce devuelve el valor crudo.
		 *
		 * @param {string|null} system_property - Propiedad a etiquetar.
		 * @returns {string} - Etiqueta legible para mostrar en la UI.
		 */
		get_property_label(system_property) {
			if (system_property === null || system_property === '') {
				return ''
			}

			/* Propiedad codificada de depósito: address_{id}_{amount|min|max}. */
			let address_match = system_property.match(/^address_(\d+)_(amount|min|max)$/)
			if (address_match) {
				const address_id = parseInt(address_match[1])
				const sub_type   = address_match[2]
				const address    = this.addresses.find(a => a.id === address_id)
				if (address) {
					if (sub_type === 'amount') return 'Stock: ' + address.street
					if (sub_type === 'min')    return 'Stock mín: ' + address.street
					if (sub_type === 'max')    return 'Stock máx: ' + address.street
				}
				return system_property
			}

			/* Propiedad codificada de lista de precio: price_type_{id}_{final_price|percentage|setear}. */
			let pt_match = system_property.match(/^price_type_(\d+)_(final_price|percentage|setear)$/)
			if (pt_match) {
				const pt_id    = parseInt(pt_match[1])
				const sub_type = pt_match[2]
				const pt       = this.price_types.find(p => p.id === pt_id)
				if (pt) {
					if (sub_type === 'final_price') return '$ Final: ' + pt.name
					if (sub_type === 'percentage')  return '%: ' + pt.name
					if (sub_type === 'setear')      return 'Setear: ' + pt.name
				}
				return system_property
			}

			/* Diccionario de etiquetas para propiedades planas conocidas. */
			const labels = {
				nombre:               'Nombre',
				codigo_de_barras:     'Cód. barras',
				sku:                  'SKU',
				codigo_de_proveedor:  'Cód. proveedor',
				costo:                'Costo',
				precio:               'Precio',
				iva:                  'IVA',
				margen_de_ganancia:   'Margen',
				categoria:            'Categoría',
				sub_categoria:        'Sub categoría',
				marca:                'Marca',
				descripcion:          'Descripción',
				stock_actual:         'Stock',
				descuentos:           'Descuentos',
				recargos:             'Recargos',
				proveedor:            'Proveedor',
				// propiedades nuevas de artículo
				costo_en_dolares:       'Costo en USD',
				aplicar_iva:            'Aplicar IVA',
				medida:                 'Medida',
				contenido:              'Contenido',
				unidad_medida:          'Unidad medida',
				u_individuales:         'U. individuales',
				descuentos_montos:      'Desc. (montos)',
				recargos_montos:        'Recarg. (montos)',
				in_offer:               'En oferta',
				online:                 'Activo',
				precio_pausado:         'Precio pausado',
				disponible_tienda_nube: 'Tienda Nube',
				// cliente
				telefono:             'Teléfono',
				email:                'Email',
				direccion:            'Dirección',
				localidad:            'Localidad',
				provincia:            'Provincia',
				cuit:                 'CUIT',
				cuil:                 'CUIL',
				dni:                  'DNI',
				razon_social:         'Razón social',
				numero:               'Número',
				vendedor:             'Vendedor',
				condicion_frente_al_iva: 'Cond. IVA',
				tipo_de_precio:       'Tipo precio',
				saldo_actual:         'Saldo',
				// proveedor
				observaciones:        'Observaciones',
			}

			return labels[system_property] || system_property
		},

		/*
		 * Transforma el column_mapping al formato que espera InitExcelImport.
		 * Genera un objeto { system_property: 0-indexed-position } descartando
		 * las columnas marcadas como "Ignorar columna" (system_property === null).
		 * Las propiedades codificadas de depósitos y listas de precio se traducen
		 * a los nombres internos planos que espera ProcessRow.
		 */
		build_columns() {
			let columns = {}

			this.column_mapping.forEach((item, index) => {
				let system_property = this.normalize_system_property_key(item.system_property)
				if (system_property === null) {
					return
				}

				/*
				 * Posición real en el Excel (0-based); el backend la envía como excel_column_index.
				 */
				let column_position = index
				if (typeof item.excel_column_index === 'number') {
					column_position = item.excel_column_index
				}

				/* Traducir propiedades codificadas de depósitos a las claves planas de ProcessRow. */
				let address_match = system_property.match(/^address_(\d+)_(amount|min|max)$/)
				if (address_match) {
					const address_id = parseInt(address_match[1])
					const sub_type   = address_match[2]
					const address    = this.addresses.find(a => a.id === address_id)
					if (address) {
						const street_key = address.street.toLowerCase().replace(/\s+/g, '_')
						if (sub_type === 'amount') columns[street_key]          = column_position
						if (sub_type === 'min')    columns['min_' + street_key] = column_position
						if (sub_type === 'max')    columns['max_' + street_key] = column_position
					}
					return
				}

				/* Traducir propiedades codificadas de listas de precio a las claves planas de ProcessRow. */
				let pt_match = system_property.match(/^price_type_(\d+)_(final_price|percentage|setear)$/)
				if (pt_match) {
					const pt_id    = parseInt(pt_match[1])
					const sub_type = pt_match[2]
					const pt       = this.price_types.find(p => p.id === pt_id)
					if (pt) {
						const name_key = pt.name.toLowerCase().replace(/\s+/g, '_')
						if (sub_type === 'final_price') columns['$_final_' + name_key]             = column_position
						if (sub_type === 'percentage')  columns['%_' + name_key]                   = column_position
						if (sub_type === 'setear')      columns['setear_precio_final_' + name_key] = column_position
					}
					return
				}

				/* Propiedad plana normal. */
				columns[system_property] = column_position
			})

			/*
			 * Respaldo: si quedó solo descripcion en el mapeo, usar esa columna como nombre.
			 */
			if (typeof columns.nombre === 'undefined' && typeof columns.descripcion !== 'undefined') {
				columns.nombre = columns.descripcion
				delete columns.descripcion
			}

			return columns
		},

		/*
		 * Asegura tipos consistentes en cada ítem del mapeo recibido del análisis.
		 */
		normalize_column_mapping(column_mapping) {
			if (!Array.isArray(column_mapping)) {
				return []
			}

			let normalized = []

			column_mapping.forEach((item, index) => {
				if (!item) {
					return
				}

				let confidence = parseFloat(item.confidence)
				if (isNaN(confidence)) {
					confidence = 0
				}
				confidence = Math.max(0, Math.min(1, confidence))

				let excel_column_index = index
				if (typeof item.excel_column_index === 'number') {
					excel_column_index = item.excel_column_index
				}

				let interpretation_note = item.interpretation_note
				if (typeof interpretation_note === 'string') {
					interpretation_note = interpretation_note.trim()
					if (interpretation_note === '') {
						interpretation_note = null
					}
				} else {
					interpretation_note = null
				}

				normalized.push({
					excel_column:        item.excel_column || '',
					system_property:     this.normalize_system_property_key(item.system_property),
					confidence:          confidence,
					interpretation_note: interpretation_note,
					excel_column_index:  excel_column_index,
					excel_column_letter: item.excel_column_letter || this.number_to_excel_column(excel_column_index + 1),
				})
			})

			return normalized
		},

		/*
		 * Letra de columna Excel para mostrar en la tabla (A, B, C…).
		 */
		excel_column_letter_label(item, index) {
			if (item && item.excel_column_letter) {
				return item.excel_column_letter
			}

			let column_index = index
			if (item && typeof item.excel_column_index === 'number') {
				column_index = item.excel_column_index
			}

			return this.number_to_excel_column(column_index + 1)
		},

		/*
		 * Texto completo para el tooltip: "A — CODIGO".
		 */
		excel_column_full_label(item, index) {
			let letter = this.excel_column_letter_label(item, index)
			let header = (item && item.excel_column) ? item.excel_column : ''

			return letter + ' — ' + header
		},

		/*
		 * Convierte índice 1-based a letra de columna (mismo criterio que import manual).
		 */
		number_to_excel_column(column_number) {
			let column_letter = ''
			let n = column_number

			while (n > 0) {
				let remainder = (n - 1) % 26
				column_letter = String.fromCharCode(65 + remainder) + column_letter
				n = Math.floor((n - 1) / 26)
			}

			return column_letter
		},

		/*
		 * Porcentaje redondeado para la columna Confianza (0%–100%).
		 */
		format_column_confidence(confidence) {
			let value = parseFloat(confidence)
			if (isNaN(value)) {
				return '—'
			}

			return Math.round(value * 100) + '%'
		},

		/*
		 * Clases de resaltado por fila: ignorada (violeta) tiene prioridad sobre baja confianza (amarillo).
		 */
		mapping_row_highlight_class(item) {
			if (this.column_mapping_is_ignored(item)) {
				return {
					'ai-import-mapping-block--ignored': true,
				}
			}

			if (this.column_has_interpretation_note(item)) {
				return {
					'ai-import-mapping-block--interpretation': true,
				}
			}

			return {
				'ai-import-mapping-block--warning': this.column_confidence_is_low(item.confidence),
			}
		},

		/*
		 * True si la IA dejó una nota para que el usuario valide el mapeo (p. ej. Descripción → nombre).
		 */
		column_has_interpretation_note(item) {
			if (!item || !item.interpretation_note) {
				return false
			}

			return String(item.interpretation_note).trim() !== ''
		},

		/*
		 * True si el usuario eligió "Ignorar columna" (system_property null).
		 */
		column_mapping_is_ignored(item) {
			return item && (item.system_property === null || item.system_property === '')
		},

		/*
		 * Confianza baja: menos del 70% (fila resaltada en amarillo).
		 */
		column_confidence_is_low(confidence) {
			let value = parseFloat(confidence)
			if (isNaN(value)) {
				return true
			}

			return value < 0.7
		},

		/*
		 * Clase de color según el nivel de confianza del mapeo.
		 */
		column_confidence_text_class(confidence) {
			let value = parseFloat(confidence)
			if (isNaN(value)) {
				return 'text-muted'
			}

			if (value >= 0.7) {
				return 'text-success'
			}

			if (value >= 0.4) {
				return 'text-warning'
			}

			return 'text-danger'
		},

		/*
		 * Descripción para el atributo title del porcentaje de confianza.
		 */
		column_confidence_title(confidence) {
			let value = parseFloat(confidence)
			if (isNaN(value)) {
				return 'Sin dato de confianza'
			}

			if (value >= 0.7) {
				return 'Confianza alta'
			}

			if (value >= 0.4) {
				return 'Confianza media — conviene revisar'
			}

			return 'Confianza baja — revisar el mapeo'
		},

		/*
		 * Resetea el estado del modal al cerrarlo para que la próxima vez
		 * empiece desde el paso 1 limpio.
		 */
		reset() {
			this.step          = 1
			this.file          = null
			this.file_processing = false
			this.start_row     = 2
			this.finish_row    = ''
			this.finish_row_original = ''
			this.excel_rows_read_error = ''
			this.loading       = false
			this.error_message = ''
			this.excel_path    = null
			this.column_mapping = []
			this.selected_provider_id = null
			this.provider_confidence  = 'bajo'
			this.create_and_edit      = null
			this.actualizar_articulos_de_otro_proveedor = 1
			this.permitir_provider_code_repetido = 0
			this.permitir_provider_code_repetido_en_multi_providers = 0
			this.actualizar_por_provider_code = 0
			this.actualizar_proveedor = 0
			this.has_header_row = true
			this.header_row_manually_overridden = false
			this.duplicate_stats             = null
			this.provider_code_column_index  = null
			this.recomendacion_configuracion = null
			this.loading_recomendacion       = false
			this.clave_identidad             = null
			this.politica_colision           = null
			this.politica_otro_proveedor     = null
			this.preview_rows                = []
			this.assistant_notes             = []
		},

	},

	/*
	 * Al montar el modal aseguramos que los depósitos y listas de precio estén
	 * cargados en el store, ya que el dropdown de mapeo genera sus opciones a
	 * partir de ellos. Solo se despachan si aún no hay datos, para evitar
	 * peticiones redundantes cuando el padre ya los cargó.
	 */
	created() {
		if (this.addresses.length === 0) {
			this.$store.dispatch('address/getModels')
		}

		if (this.price_types.length === 0) {
			this.$store.dispatch('price_type/getModels')
		}
	},

}
</script>

<style lang="sass">
/* Indicador visual de pasos del flujo */
.ai-import-steps
	display: flex
	align-items: center
	gap: 8px
	margin-bottom: 20px

.ai-import-step-dot
	display: inline-flex
	align-items: center
	justify-content: center
	width: 28px
	height: 28px
	border-radius: 50%
	background: #e9ecef
	color: #6c757d
	font-weight: 600
	font-size: 13px
	transition: background 0.2s, color 0.2s

	&--active
		background: #007bff
		color: #fff

/* Contenedor de notas de asistencia globales de Claude (paso 2) */
.assistant-notes-container
	display: flex
	flex-direction: column
	gap: 6px

/* Nota individual de asistencia: fondo ámbar suave con ícono de bombilla */
.assistant-note
	display: flex
	align-items: flex-start
	gap: 8px
	padding: 8px 12px
	border-radius: 6px
	background: rgba(255, 193, 7, 0.12)
	border-left: 4px solid #ffc107
	font-size: 13px
	color: #6c5200

.assistant-note-icon
	flex-shrink: 0
	line-height: 1.4

.assistant-note-text
	line-height: 1.4

/* Tabla de mapeo de columnas */
.ai-import-mapping-table
	border: 1px solid rgba(0,0,0,.1)
	border-radius: 8px
	overflow: hidden

.ai-import-mapping-block
	border-bottom: 1px solid rgba(0,0,0,.06)

	&:last-child
		border-bottom: none

	&--warning
		background: rgba(255, 193, 7, 0.14)

	&--interpretation
		background: rgba(0, 123, 255, 0.1)
		border-left: 4px solid #17a2b8
		padding-left: 8px

	&--ignored
		background: rgba(111, 66, 193, 0.16)
		border-left: 4px solid #6f42c1
		padding-left: 8px

		.ai-import-mapping-excel-header
			color: #5a32a3
			font-style: italic

		.ai-import-mapping-confidence-value
			opacity: 0.75

.ai-import-mapping-row
	display: grid
	grid-template-columns: 1fr 1.4fr 100px
	align-items: center
	gap: 10px
	padding: 8px 12px

	&--header
		background: #f8f9fa
		font-weight: 600
		font-size: 13px
		color: #495057
		border-bottom: 1px solid rgba(0,0,0,.06)

.ai-import-mapping-interpretation-note
	padding: 0 12px 8px 12px
	color: #0c5460

.ai-import-mapping-legend-interpretation
	color: #17a2b8
	font-weight: 600

.ai-import-mapping-legend-ignored
	color: #6f42c1
	font-weight: 600

.ai-import-mapping-excel-col
	display: flex
	align-items: baseline
	gap: 8px
	min-width: 0
	font-size: 13px
	color: #343a40

.ai-import-mapping-excel-letter
	flex-shrink: 0
	font-weight: 700
	color: #007bff
	font-size: 12px
	min-width: 1.5em

.ai-import-mapping-excel-header
	font-weight: 500
	white-space: nowrap
	overflow: hidden
	text-overflow: ellipsis

.ai-import-mapping-confidence
	display: flex
	flex-direction: column
	align-items: center
	gap: 2px

.ai-import-mapping-confidence-value
	font-weight: 600
	font-size: 13px
	line-height: 1.2

.ai-import-mapping-confidence-hint
	font-size: 11px
	line-height: 1

/* Bloque informativo de archivo cargado en el paso 1 */
.ai-import-file-info
	background: rgba(0, 123, 255, 0.05)
	border-left: 3px solid rgba(0, 123, 255, 0.3)
	padding: 10px 14px
	border-radius: 4px

/* Contenedor del toggle de cabecera */
.ai-import-header-detection
	margin-top: 6px

/* Etiqueta de detección automática junto al checkbox */
.ai-import-header-auto-label
	font-size: 11px
	font-style: italic

/* Chips de resumen del archivo en el paso 3 */
.ai-import-summary-chips
	display: flex
	flex-wrap: wrap
	gap: 8px

/* Chip individual: borde redondeado, fondo suave */
.ai-import-summary-chip
	display: inline-flex
	align-items: center
	gap: 4px
	padding: 4px 10px
	border-radius: 20px
	font-size: 12px
	font-weight: 500
	background: rgba(0, 123, 255, 0.08)
	border: 1px solid rgba(0, 123, 255, 0.2)
	color: #004085

	/* Variante de advertencia: fondo naranja suave */
	&--warning
		background: rgba(255, 193, 7, 0.14)
		border-color: rgba(255, 193, 7, 0.5)
		color: #856404

	/* Variante informativa: fondo verde suave */
	&--info
		background: rgba(40, 167, 69, 0.08)
		border-color: rgba(40, 167, 69, 0.25)
		color: #155724

/* Card de recomendación de Claude en el paso 3 */
.ai-import-recomendacion-card
	background: #f8f9fa
	border: 1px solid rgba(0, 123, 255, 0.2)
	border-left: 4px solid #007bff
	border-radius: 6px
	padding: 14px 16px

/* Línea resumen de la decisión recomendada dentro de la card */
.ai-import-recomendacion-decision
	display: inline-flex
	align-items: center
	gap: 4px
	font-size: 13px
	color: #155724
	background: rgba(40, 167, 69, 0.1)
	border: 1px solid rgba(40, 167, 69, 0.25)
	border-radius: 4px
	padding: 4px 10px

	i
		color: #28a745

/* Tabla de duplicados del paso 3 */
.ai-import-duplicates-table
	border: 1px solid rgba(0, 0, 0, 0.1)
	border-radius: 6px
	overflow: hidden
	font-size: 12px

/* Fila de cabecera de la tabla de duplicados */
.ai-import-duplicates-table__header
	display: grid
	grid-template-columns: 1fr 100px 1fr
	gap: 8px
	padding: 7px 12px
	background: #f8f9fa
	font-weight: 600
	color: #495057
	border-bottom: 1px solid rgba(0, 0, 0, 0.08)

/* Fila de dato de la tabla de duplicados */
.ai-import-duplicates-table__row
	display: grid
	grid-template-columns: 1fr 100px 1fr
	gap: 8px
	padding: 7px 12px
	border-bottom: 1px solid rgba(0, 0, 0, 0.05)

	&:last-child
		border-bottom: none

	&:hover
		background: rgba(255, 193, 7, 0.06)

/* Badge con el número de repeticiones en la tabla de duplicados */
.ai-import-duplicates-badge
	display: inline-flex
	align-items: center
	justify-content: center
	min-width: 24px
	height: 20px
	padding: 0 6px
	border-radius: 10px
	font-size: 11px
	font-weight: 700
	background: rgba(255, 193, 7, 0.25)
	color: #856404
	border: 1px solid rgba(255, 193, 7, 0.4)

/* Títulos de las preguntas de decisión en el paso 3 */
.ai-import-decision-title
	font-size: 14px
	font-weight: 700
	color: #343a40
	margin-bottom: 10px
	display: block

/* Wrapper con scroll horizontal para la tabla de preview */
.ai-import-preview-table-wrapper
	overflow-x: auto
	border: 1px solid rgba(0, 0, 0, 0.1)
	border-radius: 6px

/* Tabla de preview de artículos en el paso 2 */
.ai-import-preview-table
	width: 100%
	border-collapse: collapse
	font-size: 12px
	white-space: nowrap

	thead tr
		background: #f8f9fa
		border-bottom: 2px solid rgba(0, 0, 0, 0.08)

	th
		padding: 7px 12px
		font-weight: 600
		color: #495057
		text-align: left

	td
		padding: 6px 12px
		border-bottom: 1px solid rgba(0, 0, 0, 0.05)
		color: #343a40
		max-width: 200px
		overflow: hidden
		text-overflow: ellipsis

	tbody tr:last-child td
		border-bottom: none

	tbody tr:hover
		background: rgba(0, 123, 255, 0.03)
</style>
