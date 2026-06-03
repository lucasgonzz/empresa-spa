<template>
	<b-modal
	id="ai-excel-import-modal"
	size="lg"
	hide-footer
	:title="modal_title"
	@hide="reset">

		<!-- Indicador de pasos -->
		<div class="ai-import-steps m-b-20">
			<span
			v-for="n in 3"
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
				browse-text="Explorar">
				</b-form-file>
			</b-form-group>

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
			:disabled="!file || loading"
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

			<!-- Sección de proveedor inferido -->
			<div class="m-b-20">

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

			</div>

			<hr>

			<!-- Tabla de mapeo de columnas -->
			<p class="font-weight-bold m-b-10">Mapeo de columnas</p>

			<p class="text-muted small m-b-15">
				Revisá que cada columna del Excel esté asignada a la propiedad correcta.
				<span class="text-warning">Las columnas marcadas en amarillo tienen baja confianza y deben revisarse.</span>
			</p>

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
				class="ai-import-mapping-row"
				:class="{ 'ai-import-mapping-row--warning': item.confidence < 0.7 }">

					<!-- Nombre de la columna en el Excel -->
					<span class="ai-import-mapping-excel-col">
						{{ item.excel_column }}
					</span>

					<!-- Select de propiedad del sistema -->
					<b-form-select
					v-model="item.system_property"
					:options="system_property_options"
					size="sm">
					</b-form-select>

					<!-- Indicador visual de confianza -->
					<span class="text-center">
						<span
						v-if="item.confidence >= 0.7"
						class="text-success"
						title="Confianza alta">
							<i class="icon-check-circle"></i>
						</span>
						<span
						v-else
						class="text-warning"
						title="Confianza baja — revisar">
							<i class="icon-alert-triangle"></i>
							<small class="m-l-3">Revisar</small>
						</span>
					</span>

				</div>

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
				@click="step = 3">
					Confirmar y configurar importación
				</b-button>
			</div>

		</div>

		<!-- ========================================================== -->
		<!-- PASO 3: Opciones de importación                             -->
		<!-- ========================================================== -->
		<div v-if="step === 3">

			<p class="font-weight-bold m-b-15">Opciones de importación</p>

			<!-- Operación a realizar -->
			<b-form-group label="Operaciones a realizar">
				<b-form-radio
				class="radio-option m-b-5"
				:value="0"
				size="lg"
				v-model="create_and_edit">
					Solo editar artículos existentes
				</b-form-radio>
				<b-form-radio
				class="radio-option"
				:value="1"
				size="lg"
				v-model="create_and_edit">
					Cargar nuevos artículos y editar existentes
				</b-form-radio>
			</b-form-group>

			<hr>

			<!-- Opciones avanzadas de proveedor -->
			<div class="checkbox-group m-b-15">

				<b-form-checkbox
				class="radio-option m-b-10"
				:value="1"
				:unchecked-value="0"
				size="lg"
				v-model="permitir_provider_code_repetido">
					Permitir códigos de proveedor repetidos
				</b-form-checkbox>

				<b-form-checkbox
				v-if="permitir_provider_code_repetido"
				class="radio-option m-b-10"
				:value="1"
				:unchecked-value="0"
				size="lg"
				v-model="permitir_provider_code_repetido_en_multi_providers">
					Permitir códigos repetidos en múltiples proveedores
				</b-form-checkbox>

				<b-form-checkbox
				class="radio-option m-b-10"
				:value="1"
				:unchecked-value="0"
				size="lg"
				v-model="actualizar_articulos_de_otro_proveedor">
					Actualizar artículos de otro proveedor
				</b-form-checkbox>

				<b-form-checkbox
				class="radio-option m-b-10"
				:value="1"
				:unchecked-value="0"
				size="lg"
				v-model="actualizar_por_provider_code">
					Actualizar por código de proveedor
				</b-form-checkbox>

				<b-form-checkbox
				v-if="actualizar_articulos_de_otro_proveedor"
				class="radio-option m-b-10"
				:value="1"
				:unchecked-value="0"
				size="lg"
				v-model="actualizar_proveedor">
					Actualizar proveedor del artículo
				</b-form-checkbox>

			</div>

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
				@click="step = 2">
					Volver
				</b-button>
				<b-button
				variant="success"
				:disabled="loading || create_and_edit === null"
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
export default {

	/* Propiedades del sistema que Claude puede mapear a columnas del Excel. */
	data() {
		return {
			/* Paso actual del flujo (1, 2 o 3). */
			step: 1,

			/* Archivo Excel seleccionado por el usuario en el paso 1. */
			file: null,

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
		}
	},

	computed: {

		/*
		 * Título dinámico del modal según el paso actual.
		 */
		modal_title() {
			const titles = {
				1: 'Importar con IA — Subir archivo',
				2: 'Importar con IA — Confirmar mapeo',
				3: 'Importar con IA — Opciones de importación',
			}
			return titles[this.step] || 'Importar con IA'
		},

		/*
		 * Proveedores disponibles del usuario, cargados desde el store.
		 * Se transforman en opciones para b-form-select.
		 */
		providers() {
			return this.$store.state.provider.models
		},

		provider_options() {
			/* Opción vacía como primera opción del select. */
			let options = [{ value: null, text: 'Sin proveedor' }]

			this.providers.forEach(provider => {
				options.push({ value: provider.id, text: provider.name })
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
		 * Opciones para el select de propiedades del sistema en la tabla de mapeo.
		 * El valor null corresponde a "Ignorar columna".
		 */
		system_property_options() {
			return [
				{ value: null,                text: 'Ignorar columna' },
				{ value: 'nombre',            text: 'Nombre' },
				{ value: 'codigo_barras',     text: 'Código de barras' },
				{ value: 'sku',               text: 'SKU' },
				{ value: 'codigo_proveedor',  text: 'Código de proveedor' },
				{ value: 'costo',             text: 'Costo' },
				{ value: 'precio',            text: 'Precio' },
				{ value: 'iva',               text: 'IVA' },
				{ value: 'margen_de_ganancia',text: 'Margen de ganancia' },
				{ value: 'categoria',         text: 'Categoría' },
				{ value: 'sub_categoria',     text: 'Sub categoría' },
				{ value: 'marca',             text: 'Marca' },
				{ value: 'descripcion',       text: 'Descripción' },
				{ value: 'stock_actual',      text: 'Stock actual' },
				{ value: 'descuentos',        text: 'Descuentos' },
				{ value: 'recargos',          text: 'Recargos' },
			]
		},

	},

	watch: {
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
	},

	methods: {

		/*
		 * Llama al endpoint /ai-excel-import/analyze con el archivo Excel seleccionado.
		 * Al recibir respuesta de Claude, avanza al paso 2 con el mapeo sugerido.
		 */
		analyze() {
			this.error_message = ''
			this.loading = true

			/* Enviamos el archivo como multipart/form-data. */
			let form_data = new FormData()
			form_data.append('excel_file', this.file)

			let config = { headers: { 'content-type': 'multipart/form-data' } }

			this.$store.commit('auth/setMessage', 'Analizando archivo con IA...')
			this.$store.commit('auth/setLoading', true)

			this.$api.post('ai-excel-import/analyze', form_data, config)
			.then(res => {
				this.loading = false
				this.$store.commit('auth/setLoading', false)
				this.$store.commit('auth/setMessage', '')

				/* Guardamos la ruta del archivo para reutilizarla en /import. */
				this.excel_path        = res.data.excel_path
				this.column_mapping    = res.data.column_mapping
				this.selected_provider_id = res.data.provider_id
				this.provider_confidence  = res.data.provider_confidence

				/* Avanzamos al paso de confirmación del mapeo. */
				this.step = 2
			})
			.catch(err => {
				this.loading = false
				this.$store.commit('auth/setLoading', false)
				this.$store.commit('auth/setMessage', '')

				let message = 'Error al analizar el archivo.'

				if (err.response && err.response.data && err.response.data.message) {
					message = err.response.data.message
				}

				this.error_message = message
			})
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

			this.error_message = ''
			this.loading = true

			this.$store.commit('auth/setMessage', 'Iniciando importación...')
			this.$store.commit('auth/setLoading', true)

			this.$api.post('ai-excel-import/import', {
				excel_path:     this.excel_path,
				columns:        this.build_columns(),
				provider_id:    this.selected_provider_id,
				create_and_edit: this.create_and_edit,
				start_row:      2,
				finish_row:     99999,
				registrar_art_cre: true,
				registrar_art_act: true,
				permitir_provider_code_repetido:                    this.permitir_provider_code_repetido,
				permitir_provider_code_repetido_en_multi_providers: this.permitir_provider_code_repetido_en_multi_providers,
				actualizar_articulos_de_otro_proveedor:             this.actualizar_articulos_de_otro_proveedor,
				actualizar_por_provider_code:                       this.actualizar_por_provider_code,
				actualizar_proveedor:                               this.actualizar_proveedor,
			})
			.then(() => {
				this.loading = false
				this.$store.commit('auth/setLoading', false)
				this.$store.commit('auth/setMessage', '')

				this.$bvModal.hide('ai-excel-import-modal')

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
		 * Transforma el column_mapping al formato que espera InitExcelImport.
		 * Genera un objeto { system_property: 0-indexed-position } descartando
		 * las columnas marcadas como "Ignorar columna" (system_property === null).
		 */
		build_columns() {
			let columns = {}

			this.column_mapping.forEach((item, index) => {
				if (item.system_property !== null) {
					columns[item.system_property] = index
				}
			})

			return columns
		},

		/*
		 * Resetea el estado del modal al cerrarlo para que la próxima vez
		 * empiece desde el paso 1 limpio.
		 */
		reset() {
			this.step          = 1
			this.file          = null
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
		},

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

/* Tabla de mapeo de columnas */
.ai-import-mapping-table
	border: 1px solid rgba(0,0,0,.1)
	border-radius: 8px
	overflow: hidden

.ai-import-mapping-row
	display: grid
	grid-template-columns: 1fr 1.4fr 90px
	align-items: center
	gap: 10px
	padding: 8px 12px
	border-bottom: 1px solid rgba(0,0,0,.06)

	&:last-child
		border-bottom: none

	&--header
		background: #f8f9fa
		font-weight: 600
		font-size: 13px
		color: #495057

	&--warning
		background: rgba(255, 193, 7, 0.08)

.ai-import-mapping-excel-col
	font-size: 13px
	font-weight: 500
	color: #343a40
	white-space: nowrap
	overflow: hidden
	text-overflow: ellipsis
</style>
