<template>
	<b-modal
	id="catalog-header-designer-modal"
	size="xl"
	title="Diseñar encabezado del catálogo"
	:visible="visible"
	@hide="on_hide">
		<div class="catalog-header-designer">
			<p class="small text-muted m-b-15">
				Arrastrá los datos del negocio a la hoja y ordenalos como quieras. Cada renglón tiene un título y un valor.
			</p>

			<!-- Mientras se piden los datos del negocio no se muestra la hoja: el estado de trabajo
			se arma una sola vez, cuando la respuesta (o su falla) ya está. -->
			<div
			v-if="loading_sources"
			class="small text-muted font-italic">
				Cargando los datos del negocio...
			</div>

			<b-row v-else>
				<!-- Las columnas se parten en lg y no en md: el modal xl mide el 90% de la pantalla, y en
				tablet (768-991) un md=8 dejaba ~400px para una hoja A4 de 525px, o sea arrastrar
				sobre una hoja con scroll horizontal. Apiladas, la hoja entra entera. -->
				<b-col
				cols="12"
				lg="8"
				class="m-b-15">
					<div class="catalog-header-designer__page-toggle m-b-10">
						<span class="small text-muted m-r-10">Ver:</span>
						<b-form-radio-group
						v-model="page_preview"
						:options="page_preview_options"
						buttons
						button-variant="outline-primary"
						size="sm"></b-form-radio-group>
					</div>

					<catalog-header-preview
					:layout="layout"
					:logo_url="logo_url"
					:company_name="company_name"
					:header_image_url="header_image_url"
					:page_preview="page_preview"
					:paper_width_mm="paper_width_mm"
					:margin_mm="margin_mm"
					@update:logo_size_mm="on_logo_size_change"></catalog-header-preview>
				</b-col>

				<b-col
				cols="12"
				lg="4">
					<div class="catalog-header-designer__controls m-b-15">
						<b-form-checkbox
						v-model="layout.logo.show"
						class="m-b-10">
							Mostrar logo
						</b-form-checkbox>

						<b-form-group
						label="Logo e imagen de cabecera"
						label-class="catalog-header-designer__label">
							<b-form-select
							v-model="layout.logo.pages"
							:options="pages_options"
							size="sm"></b-form-select>
						</b-form-group>

						<b-form-group
						label="Tamaño del logo (mm)"
						label-class="catalog-header-designer__label">
							<b-form-input
							v-model.number="layout.logo.size_mm"
							type="number"
							:min="logo_size_mm_min"
							:max="logo_size_mm_max"
							size="sm"
							class="catalog-header-designer__logo-size"
							@change="normalize_logo_size"></b-form-input>
						</b-form-group>

						<b-form-checkbox
						v-model="layout.company_name.show"
						class="m-b-10">
							Mostrar nombre del negocio
						</b-form-checkbox>

						<b-form-group
						label="Datos del negocio"
						label-class="catalog-header-designer__label"
						class="m-b-0">
							<b-form-select
							v-model="layout.rows_pages"
							:options="pages_options"
							size="sm"></b-form-select>
						</b-form-group>
					</div>

					<source-palette
					:available_sources="available_sources"
					:total_sources="sources_with_value.length"
					:disabled="page_preview !== 1"
					@add-source="add_source_row"
					@add-free-row="add_free_row"></source-palette>
				</b-col>
			</b-row>
		</div>

		<template #modal-footer>
			<div class="catalog-header-designer__footer">
				<b-button
				variant="outline-secondary"
				size="sm"
				@click="restore_default">
					Restaurar diseño por defecto
				</b-button>

				<div class="catalog-header-designer__footer-actions">
					<b-button
					variant="secondary"
					@click="close">
						Cancelar
					</b-button>
					<b-button
					variant="primary"
					:disabled="saving"
					@click="save">
						Guardar diseño
					</b-button>
				</div>
			</div>
		</template>
	</b-modal>
</template>

<script>
import CatalogHeaderPreview from '@/common-vue/components/pdf/catalog-header-designer/CatalogHeaderPreview.vue'
import SourcePalette from '@/common-vue/components/pdf/catalog-header-designer/SourcePalette.vue'
import {
	PAGES_OPTIONS,
	LOGO_SIZE_MM_MIN,
	LOGO_SIZE_MM_MAX,
	MAX_ROWS_PER_COLUMN,
	new_row,
	build_layout_from_saved,
	strip_for_save,
	clamp_logo_size_mm,
	default_layout_local,
} from '@/common-vue/components/pdf/catalog-header-designer/catalog_header_designer_catalog'

/**
 * Diseñador visual del encabezado del catálogo de artículos (misión
 * catalogo-pdf-encabezado, 18/9/2026): modal con la hoja simulada, drag & drop de
 * renglones (título + valor) entre la columna izquierda y la derecha, paleta con los
 * datos del negocio, logo redimensionable y la elección de qué sale en todas las hojas
 * y qué solo en la primera.
 *
 * Recibe el `pdf_column_profile` en edición (el mismo objeto que maneja el ABM,
 * PdfColumnProfileEditor.vue) y persiste `catalog_header_layout`:
 * - Si el perfil ya tiene id: guarda al toque vía PUT.
 * - Si el perfil todavía no fue creado (sin id): solo actualiza el modelo en memoria;
 *   se persiste cuando el usuario guarde el ABM completo.
 *
 * Mismo patrón que el diseñador de header de ventas (header-designer/Index.vue). Se
 * abre desde el padre vía `this.$refs.catalog_header_designer.open()`.
 */
export default {
	name: 'CatalogHeaderDesignerIndex',
	components: {
		CatalogHeaderPreview,
		SourcePalette,
	},
	props: {
		/**
		 * Modelo del perfil de PDF en edición (pdf_column_profile, model_name 'article').
		 */
		model: {
			type: Object,
			required: true,
		},
	},
	data() {
		return {
			/**
			 * Controla la visibilidad del modal (open()/close()).
			 */
			visible: false,
			/**
			 * Estado de trabajo del layout: copia de model.catalog_header_layout (o del
			 * default) con uids en las filas. Se serializa con strip_for_save() al guardar.
			 */
			layout: default_layout_local(),
			/**
			 * Fuentes de datos del negocio que devolvió la API: [{ key, label, value }].
			 */
			sources: [],
			/**
			 * URL del logo del negocio según la API (null si no tiene).
			 */
			logo_url: null,
			/**
			 * Nombre del negocio según la API.
			 */
			company_name: '',
			/**
			 * Diseño por defecto que devolvió la API (null si el GET falló: se usa el local).
			 */
			default_layout: null,
			/**
			 * true mientras se piden las fuentes al abrir.
			 */
			loading_sources: false,
			/**
			 * Hoja que se previsualiza: 1 (primera) o 2 (segunda en adelante).
			 */
			page_preview: 1,
			/**
			 * true mientras se persiste el diseño vía API (deshabilita "Guardar diseño").
			 */
			saving: false,
			/** Opciones de los selects de hojas */
			pages_options: PAGES_OPTIONS,
			/** Opciones del selector de hoja a previsualizar */
			page_preview_options: [
				{ value: 1, text: 'Hoja 1' },
				{ value: 2, text: 'Hoja 2' },
			],
			/** Topes del tamaño del logo (mm) */
			logo_size_mm_min: LOGO_SIZE_MM_MIN,
			logo_size_mm_max: LOGO_SIZE_MM_MAX,
		}
	},
	computed: {
		/**
		 * Fuentes con valor: las vacías no se ofrecen (el PDF tampoco las imprime).
		 *
		 * @return {Array}
		 */
		sources_with_value() {
			return this.sources.filter(function (source) {
				return source && source.key && source.value !== null && String(source.value).trim() !== ''
			})
		},
		/**
		 * Fuentes con valor que todavía no están en ninguna columna. Al soltar un chip en la
		 * hoja, la fila nueva lleva su `source` y el chip desaparece solo de la paleta.
		 *
		 * @return {Array}
		 */
		available_sources() {
			const placed = {}
			this.layout.izquierda.concat(this.layout.derecha).forEach(function (row) {
				if (row && row.source) {
					placed[row.source] = true
				}
			})
			return this.sources_with_value.filter(function (source) {
				return !placed[source.key]
			})
		},
		/**
		 * Imagen de cabecera del perfil en edición (banner), o null.
		 *
		 * @return {string|null}
		 */
		header_image_url() {
			return (this.model && this.model.header_image_url) ? String(this.model.header_image_url) : null
		},
		/**
		 * @return {number}
		 */
		paper_width_mm() {
			return Number((this.model && this.model.paper_width_mm) || 210)
		},
		/**
		 * @return {number}
		 */
		margin_mm() {
			if (!this.model || this.model.margin_mm == null || this.model.margin_mm === '') {
				return 5
			}
			return Number(this.model.margin_mm || 0)
		},
	},
	methods: {
		/**
		 * Abre el diseñador: muestra el modal y pide las fuentes del negocio (una vez por
		 * apertura); el estado de trabajo se arma cuando esa respuesta llega (load_sources).
		 * Se llama desde el padre (PdfColumnProfileEditor.vue) vía $refs.
		 *
		 * @return {void}
		 */
		open() {
			this.page_preview = 1
			this.visible = true
			this.load_sources()
		},
		/**
		 * Cierra el modal sin persistir nada más.
		 *
		 * @return {void}
		 */
		close() {
			this.visible = false
		},
		/**
		 * Handler del evento `hide` del b-modal (click afuera, ESC, botón cerrar).
		 *
		 * @return {void}
		 */
		on_hide() {
			this.visible = false
		},
		/**
		 * GET de las fuentes del negocio, el logo, el nombre y el diseño por defecto. Si
		 * falla (API vieja sin el endpoint, o error), toast corto y el diseñador sigue con la
		 * paleta vacía y el default local. El estado de trabajo se arma recién al terminar,
		 * así un perfil sin diseño guardado arranca con el default de la API (teléfono y
		 * email si tienen valor) y las filas con fuente muestran el dato actual.
		 *
		 * @return {void}
		 */
		load_sources() {
			let self = this
			self.loading_sources = true
			self.$api.get('pdf-column-profiles/catalog-header-sources')
				.then(function (res) {
					const data = res && res.data ? res.data : {}
					self.sources = Array.isArray(data.sources) ? data.sources : []
					self.logo_url = data.logo_url ? String(data.logo_url) : null
					self.company_name = data.company_name ? String(data.company_name) : ''
					self.default_layout = (data.default_layout && typeof data.default_layout === 'object')
						? data.default_layout
						: null
				})
				.catch(function () {
					self.sources = []
					self.default_layout = null
					self.$toast.error('No se pudieron cargar los datos del negocio')
				})
				.finally(function () {
					self.loading_sources = false
					self.build_state_from_model()
				})
		},
		/**
		 * Diseño por defecto a usar: el de la API si llegó, si no el local.
		 *
		 * @return {Object}
		 */
		resolve_default_layout() {
			return this.default_layout ? this.default_layout : default_layout_local()
		},
		/**
		 * Rearma el estado de trabajo desde el modelo: usa model.catalog_header_layout si
		 * existe, o el default si no. Siempre es una copia: el modelo no se toca hasta guardar.
		 * Si el logo o el nombre no vinieron de la API, se toman del dueño logueado.
		 *
		 * @return {void}
		 */
		build_state_from_model() {
			const saved = this.model ? this.model.catalog_header_layout : null
			this.layout = build_layout_from_saved(saved, this.resolve_default_layout())
			this.refresh_source_values()

			if (!this.logo_url && this.owner && this.owner.image_url) {
				this.logo_url = String(this.owner.image_url)
			}
			if (!this.company_name && this.owner && this.owner.company_name) {
				this.company_name = String(this.owner.company_name)
			}
		},
		/**
		 * Las filas con fuente muestran el dato ACTUAL del negocio (que es lo que imprime la
		 * API), no el valor que quedó guardado en el perfil.
		 *
		 * @return {void}
		 */
		refresh_source_values() {
			const value_by_key = {}
			this.sources.forEach(function (source) {
				if (source && source.key) {
					value_by_key[source.key] = source.value == null ? '' : String(source.value)
				}
			})
			this.layout.izquierda.concat(this.layout.derecha).forEach(function (row) {
				if (row.source && typeof value_by_key[row.source] !== 'undefined') {
					row.value = value_by_key[row.source]
				}
			})
		},
		/**
		 * Restaura el diseño por defecto (el de la API, o el local) sin cerrar el modal.
		 *
		 * @return {void}
		 */
		restore_default() {
			this.layout = build_layout_from_saved(null, this.resolve_default_layout())
			this.refresh_source_values()
		},
		/**
		 * Manija del logo: refleja el tamaño en el estado (y en el input de mm, que lo lee de ahí).
		 *
		 * @param {number} new_size_mm
		 * @return {void}
		 */
		on_logo_size_change(new_size_mm) {
			this.layout.logo.size_mm = clamp_logo_size_mm(new_size_mm)
		},
		/**
		 * Al salir del input de mm, deja el valor acotado al rango (10-60).
		 *
		 * @return {void}
		 */
		normalize_logo_size() {
			this.layout.logo.size_mm = clamp_logo_size_mm(this.layout.logo.size_mm)
		},
		/**
		 * Agrega una fuente al final de la columna izquierda (alternativa al arrastre).
		 *
		 * @param {Object} source { key, label, value }
		 * @return {void}
		 */
		add_source_row(source) {
			if (!source || !source.key) {
				return
			}
			this.layout.izquierda.push(new_row(source.label, source.value, source.key))
		},
		/**
		 * Agrega un renglón libre (sin fuente) al final de la columna izquierda.
		 *
		 * @return {void}
		 */
		add_free_row() {
			this.layout.izquierda.push(new_row('', '', null))
		},
		/**
		 * Persiste el diseño. Si el perfil ya tiene id, guarda vía API y actualiza el modelo
		 * y el store con lo que devolvió; si es un perfil nuevo (sin id), solo actualiza el
		 * modelo en memoria para que viaje con el guardado del ABM.
		 *
		 * @return {void}
		 */
		save() {
			let self = this

			/* La API se queda con 15 filas por columna y descarta el resto en silencio: mejor avisar acá */
			if (self.layout.izquierda.length > MAX_ROWS_PER_COLUMN || self.layout.derecha.length > MAX_ROWS_PER_COLUMN) {
				self.$toast.error('Cada columna admite hasta ' + MAX_ROWS_PER_COLUMN + ' renglones')
				return
			}

			const catalog_header_layout = strip_for_save(self.layout)

			if (!self.model.id) {
				/* Perfil todavía no creado: solo en memoria, se persiste con el guardado del ABM */
				self.$set(self.model, 'catalog_header_layout', catalog_header_layout)
				self.$toast.success('Diseño aplicado. Guardá el perfil para persistirlo.')
				self.close()
				return
			}

			self.saving = true
			self.$store.commit('auth/setMessage', 'Guardando diseño del encabezado')
			self.$store.commit('auth/setLoading', true)

			self.$api.put('pdf-column-profiles/' + self.model.id, {
				catalog_header_layout: catalog_header_layout,
			})
				.then(function (res) {
					const saved_model = res.data && res.data.model
					if (saved_model) {
						self.$set(self.model, 'catalog_header_layout', saved_model.catalog_header_layout)
						self.$store.commit('pdf_column_profile/add', saved_model)
					}
					self.$toast.success('Diseño del encabezado guardado')
					self.close()
				})
				.catch(function (err) {
					const message = (err.response && err.response.data && err.response.data.message)
						? err.response.data.message
						: 'No se pudo guardar el diseño del encabezado'
					self.$toast.error(message)
				})
				.finally(function () {
					self.saving = false
					self.$store.commit('auth/setLoading', false)
					self.$store.commit('auth/setMessage', '')
				})
		},
	},
}
</script>

<style lang="sass">
.catalog-header-designer
	width: 100%

.catalog-header-designer__page-toggle
	display: flex
	align-items: center
	flex-wrap: wrap

.catalog-header-designer__controls
	padding: 12px
	border-radius: 10px
	background: var(--bg-section)
	border: 1px solid var(--color-border)

.catalog-header-designer__label
	font-size: 12px
	color: var(--color-text-secondary)
	padding-bottom: 2px

.catalog-header-designer__logo-size
	max-width: 120px

.catalog-header-designer__footer
	display: flex
	align-items: center
	justify-content: space-between
	gap: 8px
	flex-wrap: wrap
	width: 100%

.catalog-header-designer__footer-actions
	display: flex
	gap: 8px
	flex-wrap: wrap

// Teléfono: botones a lo ancho, "Guardar diseño" arriba de todo y "Restaurar" al final.
@media (max-width: 575px)
	.catalog-header-designer__footer
		flex-direction: column-reverse
		align-items: stretch

		.btn
			width: 100%

	.catalog-header-designer__footer-actions
		flex-direction: column-reverse

// Inputs con el trato de los modales nuevos (contexto/estilo_interfaz_empresa.md §3): radio
// de 8px y foco suave en vez del default global de _inputs.sass. Scopeado por el id del
// modal, que alcanza para ganarle a los selectores de etiqueta pelada.
#catalog-header-designer-modal
	.form-control,
	.custom-select,
	textarea.form-control
		border-radius: var(--metodo-pago-input-radius)
		border-width: 1px

		&:focus
			border-width: 1px
			border-color: var(--color-primary)
			box-shadow: 0 0 0 3px var(--metodo-pago-focus-ring)
</style>
