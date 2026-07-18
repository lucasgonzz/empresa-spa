<template>
	<div class="pdf-column-profile-editor m-t-10">
		<b-alert
		v-if="!model.model_name"
		show
		variant="warning">
			Seleccioná el tipo de modelo (Venta o Artículo) para configurar las columnas.
		</b-alert>

		<template v-else>
			<div
			v-if="loading_catalog"
			class="text-center text-muted p-3">
				Cargando columnas...
			</div>

			<b-alert
			v-else-if="!pdf_config_rows.length"
			show
			variant="secondary">
				No se encontraron columnas para el catálogo "{{ model.model_name }}".
			</b-alert>

			<template v-else>
				<!-- Botón de acceso al diseñador visual del header (prompt 441). Solo tiene
				     sentido para perfiles de venta (comprobantes): los perfiles de artículo
				     no tienen header configurable por este diseñador. -->
				<div
				v-if="model.model_name === 'sale'"
				class="m-b-10">
					<b-button
					size="sm"
					variant="outline-primary"
					@click="open_header_designer">
						<i class="icon-configuration"></i>
						Diseñar header
					</b-button>
				</div>

				<pdf-columns-preferences-config-modal
				:config_rows="pdf_config_rows"
				:paper_width_mm="local_paper_width_mm"
				:printable_width_mm="local_printable_width_mm"
				:margin_mm="local_margin_mm"
				:show_size_controls="false"
				:show_typography_columns="model.model_name === 'article'"
				:layout_table="true"></pdf-columns-preferences-config-modal>

				<b-alert
				v-if="remaining_width_mm < 0"
				show
				variant="danger"
				class="m-t-10">
					La suma de anchos visibles supera el ancho disponible ({{ available_width_mm }}mm, imprimible menos márgenes) por {{ Math.abs(remaining_width_mm) }}mm.
				</b-alert>

				<!-- Diseñador visual del header (modal aparte): recibe el mismo model
				     que edita este ABM y persiste header_layout + logo_size_mm -->
				<header-designer
				v-if="model.model_name === 'sale'"
				ref="header_designer"
				:model="model"></header-designer>
			</template>
		</template>
	</div>
</template>

<script>
import PdfColumnsPreferencesConfigModal from '@/common-vue/components/pdf/PdfColumnsPreferencesConfigModal.vue'
import HeaderDesigner from '@/common-vue/components/pdf/header-designer/Index.vue'

/**
 * Editor de columnas PDF para ABM de pdf_column_profile (ventas o artículos).
 *
 * Recibe el modelo del perfil como prop y muestra todas las columnas del catálogo,
 * mezclando el estado visible/ancho/orden de los pivots ya guardados.
 */
export default {
	components: {
		PdfColumnsPreferencesConfigModal,
		HeaderDesigner,
	},
	props: {
		/**
		 * Modelo del formulario ABM (pdf_column_profile).
		 */
		model: {
			type: Object,
			required: true,
		},
	},
	data() {
		return {
			/**
			 * Catálogo completo de opciones disponibles para el model_name del perfil.
			 */
			pdf_column_options_catalog: [],
			/**
			 * Filas que se muestran y editan en el componente visual de columnas.
			 */
			pdf_config_rows: [],
			/**
			 * Estado de carga del catálogo remoto.
			 */
			loading_catalog: false,
			/**
			 * Valor local del ancho de hoja, sincronizado con el modelo.
			 */
			local_paper_width_mm: 297,
			/**
			 * Valor local del ancho imprimible, sincronizado con el modelo.
			 */
			local_printable_width_mm: 277,
			/**
			 * Cuando es true, los cambios en pdf_config_rows no se sincronizan al modelo.
			 * Evita ciclos al cargar filas programáticamente.
			 */
			_syncing: false,
		}
	},
	computed: {
		/**
		 * Suma de anchos de columnas visibles (mm).
		 *
		 * @returns {number}
		 */
		used_width_mm() {
			let sum = 0
			this.pdf_config_rows.forEach(function (row) {
				if (row && row.visible) {
					sum += Number(row.width || 0)
				}
			})
			return sum
		},
		/**
		 * Margen lateral por lado tomado del perfil en edición.
		 *
		 * @returns {number}
		 */
		local_margin_mm() {
			if (!this.model || this.model.margin_mm == null || this.model.margin_mm === '') {
				return 5
			}
			return Number(this.model.margin_mm || 0)
		},
		/**
		 * Ancho útil para columnas visibles (imprimible − márgenes izquierdo y derecho).
		 *
		 * @returns {number}
		 */
		available_width_mm() {
			const printable_width_mm = Number(this.local_printable_width_mm || 0)
			const margin_mm = this.local_margin_mm
			const available_width_mm = printable_width_mm - (margin_mm * 2)
			return available_width_mm > 0 ? available_width_mm : 0
		},
		/**
		 * Ancho disponible restante (mm).
		 *
		 * @returns {number}
		 */
		remaining_width_mm() {
			return this.available_width_mm - this.used_width_mm
		},
	},
	watch: {
		/**
		 * Al cambiar el perfil abierto, recargar catálogo y filas.
		 */
		'model.id'() {
			this.init()
		},
		/**
		 * Al cambiar el tipo de modelo del perfil, recargar catálogo.
		 */
		'model.model_name'() {
			this.apply_article_a4_defaults()
			this.init()
		},
		/**
		 * Sincronizar ancho de hoja local con el modelo.
		 */
		'model.paper_width_mm'(value) {
			this.local_paper_width_mm = Number(value || 297)
		},
		/**
		 * Sincronizar ancho imprimible local con el modelo.
		 */
		'model.printable_width_mm'(value) {
			this.local_printable_width_mm = Number(value || 277)
		},
		/**
		 * Cuando el usuario modifica filas en el editor, persistir en el modelo para el guardado.
		 */
		pdf_config_rows: {
			deep: true,
			handler() {
				if (this._syncing) {
					return
				}
				this.sync_rows_to_model()
			},
		},
	},
	created() {
		if (this.model) {
			this.local_paper_width_mm = Number(this.model.paper_width_mm || 297)
			this.local_printable_width_mm = Number(this.model.printable_width_mm || 277)
		}
		this.init()
	},
	methods: {
		/**
		 * Inicializa el editor: descarga el catálogo y construye las filas.
		 *
		 * @return {void}
		 */
		init() {
			this.apply_article_a4_defaults()

			const model_name = this.model && this.model.model_name
			if (!model_name) {
				this.pdf_column_options_catalog = []
				this.pdf_config_rows = []
				return
			}

			this.loading_catalog = true

			this.$api.get('pdf-column-options', {
				params: { model_name: model_name },
			})
				.then((res) => {
					const models = res && res.data && Array.isArray(res.data.models)
						? res.data.models
						: []

					/* Filtrar solo las opciones del model_name correcto, ordenadas por order */
					this.pdf_column_options_catalog = models
						.filter((item) => item && item.id != null && item.model_name === model_name)
						.sort((a, b) => Number(a.order || 0) - Number(b.order || 0))

					this.build_rows()
				})
				.catch(() => {
					this.pdf_column_options_catalog = []
					this.pdf_config_rows = []
				})
				.finally(() => {
					this.loading_catalog = false
				})
		},
		/**
		 * Alinea perfiles de artículo A4: imprimible 210 mm y margen 5 mm por lado (200 mm para columnas).
		 * Corrige el valor legacy printable_width_mm=200 que el validador trataba como bruto.
		 *
		 * @return {void}
		 */
		apply_article_a4_defaults() {
			if (!this.model || this.model.model_name !== 'article') {
				return
			}

			const paper_width_mm = Number(this.model.paper_width_mm || 0)
			const printable_width_mm = Number(this.model.printable_width_mm || 0)
			const margin_mm = Number(this.model.margin_mm == null || this.model.margin_mm === '' ? 5 : this.model.margin_mm)
			const is_legacy_net_printable = paper_width_mm === 210 && printable_width_mm === 200 && margin_mm === 5
			const is_new_profile = !this.model.id

			if (!is_new_profile && !is_legacy_net_printable) {
				return
			}

			this.$set(this.model, 'paper_width_mm', 210)
			this.$set(this.model, 'printable_width_mm', 210)
			this.$set(this.model, 'margin_mm', 5)
			this.local_paper_width_mm = 210
			this.local_printable_width_mm = 210
		},
		/**
		 * Construye pdf_config_rows mezclando el catálogo con los pivots guardados en el perfil.
		 * Incluye TODAS las opciones del catálogo, no solo las ya configuradas.
		 *
		 * @return {void}
		 */
		build_rows() {
			const catalog = this.pdf_column_options_catalog
			if (!catalog.length) {
				this._syncing = true
				this.pdf_config_rows = []
				this._syncing = false
				return
			}

			/* Índice de pivots guardados en el perfil, por option id */
			const saved_by_id = {}
			const saved_options = this.model && Array.isArray(this.model.pdf_column_options)
				? this.model.pdf_column_options
				: []

			saved_options.forEach((opt) => {
				if (!opt || opt.id == null) {
					return
				}
				const pivot = opt.pivot || {}
				saved_by_id[opt.id] = {
					visible: this.as_bool(pivot.visible),
					order: Number(pivot.order || 0),
					width: Number(pivot.width || opt.default_width || 0),
					wrap_content: this.as_bool(pivot.wrap_content),
					font_size: pivot.font_size != null && pivot.font_size !== ''
						? Number(pivot.font_size)
						: 8,
					text_align: pivot.text_align || '',
					has_pivot: true,
				}
			})

			const rows = catalog.map((option, catalog_index) => {
				const saved = saved_by_id[option.id]
				return {
					key: option.id,
					name: option.name || option.label || '',
					label: option.label || option.name || '',
					value_resolver: option.value_resolver || '',
					visible: saved ? saved.visible : false,
					order: saved ? saved.order : catalog_index,
					width: saved ? saved.width : Number(option.default_width || 0),
					wrap_content: saved ? saved.wrap_content : false,
					font_size: saved ? saved.font_size : 8,
					text_align: saved ? saved.text_align : '',
				}
			})

			/* Ordenar por el order guardado en el pivot; las nuevas van al final en orden del catálogo */
			rows.sort((a, b) => Number(a.order) - Number(b.order))

			/* Asignar sin disparar sync al modelo */
			this._syncing = true
			this.pdf_config_rows = rows
			this._syncing = false
		},
		/**
		 * Normaliza un valor a boolean (1/'1'/true → true, todo lo demás → false).
		 *
		 * @param {*} value
		 * @return {boolean}
		 */
		as_bool(value) {
			return value === true || value === 1 || value === '1'
		},
		/**
		 * Normaliza tamaño de letra al rango permitido por la API (4–24 pt).
		 *
		 * @param {*} value
		 * @return {number|null}
		 */
		normalize_font_size(value) {
			const font_size = Number(value || 0)
			if (font_size >= 4 && font_size <= 24) {
				return font_size
			}
			return null
		},
		/**
		 * Normaliza alineación horizontal; cadena vacía → null (automática en backend).
		 *
		 * @param {*} value
		 * @return {string|null}
		 */
		normalize_text_align(value) {
			if (value === 'left' || value === 'center' || value === 'right') {
				return value
			}
			return null
		},
		/**
		 * Copia el estado actual de pdf_config_rows a model.pdf_column_options
		 * con la estructura de pivots que espera el backend.
		 *
		 * @return {void}
		 */
		sync_rows_to_model() {
			if (!this.model || !this.model.model_name) {
				return
			}
			if (!this.pdf_column_options_catalog.length) {
				return
			}

			const catalog_by_id = {}
			this.pdf_column_options_catalog.forEach((opt) => {
				catalog_by_id[opt.id] = opt
			})

			const payload = []
			this.pdf_config_rows.forEach((row, index) => {
				if (!row || row.key == null) {
					return
				}
				const catalog_opt = catalog_by_id[row.key]
				if (!catalog_opt) {
					return
				}
				payload.push({
					id: catalog_opt.id,
					name: catalog_opt.name,
					label: catalog_opt.label,
					value_resolver: catalog_opt.value_resolver,
					default_width: catalog_opt.default_width,
					pivot: {
						visible: this.as_bool(row.visible),
						order: index,
						width: Number(row.width || 0),
						wrap_content: this.as_bool(row.wrap_content),
						font_size: this.normalize_font_size(row.font_size),
						text_align: this.normalize_text_align(row.text_align),
					},
				})
			})

			this.$set(this.model, 'pdf_column_options', payload)
		},
		/**
		 * Abre el diseñador visual del header (prompt 441) para el perfil actual.
		 *
		 * @return {void}
		 */
		open_header_designer() {
			if (this.$refs.header_designer) {
				this.$refs.header_designer.open()
			}
		},
	},
}
</script>

<style lang="sass" scoped>
.pdf-column-profile-editor
	width: 100%
	max-width: 100%
</style>
