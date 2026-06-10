<template>
	<!-- Contenedor externo: centra la barra sin forzar ancho completo en escritorio -->
	<div
	v-if="mostrar_barra_paginacion"
	class="table-filter-pagination-wrap m-b-15 m-t-15">

		<div
		class="table-filter-pagination-bar">

			<span
			class="pagination-bar-meta">
				{{ total_results }} resultados
			</span>

			<span
			class="pagination-bar-separator"
			aria-hidden="true"></span>

			<b-pagination
			class="pagination-bar-pages m-0"
			pills
			v-model="current_page"
			:total-rows="total_results"
			:per-page="per_page_desde_store"
			></b-pagination>

			<span
			class="pagination-bar-separator"
			aria-hidden="true"></span>

			<div
			class="pagination-bar-per-page">
				<label
				class="lbl-per-page"
				:for="'per-page-'+model_name">
					Por página
				</label>
				<b-form-input
				:id="'per-page-'+model_name"
				v-model="per_page_input"
				class="input-per-page"
				type="number"
				min="1"
				max="200"
				size="sm"
				@keyup.enter="aplicarPerPageYFiltrar"
				/>
			</div>
		</div>
	</div>
</template>
<script>
export default {
	props: {
		model_name: String,
		/**
		 * Paginación de búsqueda acotada al submódulo papelera cuando la tabla es papelera.
		 */
		papelera: {
			type: Boolean,
			default: false,
		},
	},
	data() {
		return {
			currentPage: 1,
			se_inicio_nueva_busqueda: false,
			// Valor editable hasta confirmar con Enter (sync inicial en created).
			per_page_input: '25',
		}
	},
	created() {
		this.syncPerPageInputDesdeStore()
	},
	computed: {
		/**
		 * Muestra la barra si hay filtro activo y al menos un resultado (permite cambiar por página aunque last_page sea 1).
		 */
		mostrar_barra_paginacion() {
			if (!this.model_name) {
				return false
			}
			let filtrado = false

			if (this.papelera) {
				filtrado = this.$store.state.papelera[this.model_name].is_filtered
			} else {
				filtrado = this.$store.state[this.model_name].is_filtered
			}

			if (filtrado) {
				return this.total_results > 0
			} 
			
			/*
				Pregunto si es article porque article tiene use_per_page=true porque se descargan los articulos al iniciar para el modo offline
				La idea es que use_per_page sea true solo en los modelos que se manejan por fechas
			*/
			if (
				this.model_name != 'article'
				&& this.model_name != 'client'
			) {
				return this.$store.state[this.model_name].use_per_page
			}

		},
		total_results() {
			if (this.papelera) {
				return this.$store.state.papelera[this.model_name].total_filter_results
			}
			return this.$store.state[this.model_name].total_filter_results
		},
		per_page_desde_store() {
			let st = this.$store.state[this.model_name]
			if (!st || typeof st.filter_per_page === 'undefined' || st.filter_per_page === null) {
				return 5
			}
			return st.filter_per_page
		},
		current_page: {
			get() {
				if (this.papelera) {
					return this.$store.state.papelera[this.model_name].filter_page
				}
				return this.$store.state[this.model_name].filter_page
			},
			set(value) {
				let path = this.papelera
					? ('papelera/' + this.model_name + '/setFilterPage')
					: (this.model_name + '/setFilterPage')
				this.$store.commit(path, value)
			}
		},
	},
	methods: {
		/**
		 * Alinea el input con el valor persistido en el store del modelo (article/sale).
		 */
		syncPerPageInputDesdeStore() {
			let n = this.per_page_desde_store
			if (n) {
				this.per_page_input = String(n)
			}
		},
		/**
		 * Valida rango, guarda en store, vuelve a página 1 y repite la búsqueda filtrada.
		 */
		aplicarPerPageYFiltrar() {
			let n = parseInt(this.per_page_input, 10)
			if (isNaN(n) || n < 1) {
				n = 5
			}
			if (n > 200) {
				n = 200
			}
			this.$store.commit(this.model_name + '/setFilterPerPage', n)
			this.per_page_input = String(n)
			let path = this.papelera
				? ('papelera/' + this.model_name + '/setFilterPage')
				: (this.model_name + '/setFilterPage')
			this.$store.commit(path, 1)
			let that = this
			this.$nextTick(function () {
				that.$emit('filtrar')
			})
		},
	},
	watch: {
		model_name() {
			this.syncPerPageInputDesdeStore()
		},
		per_page_desde_store() {
			this.syncPerPageInputDesdeStore()
		},
		current_page() {
			this.$emit('filtrar')
			return
		},
		currentPage() {
			if (!this.se_inicio_nueva_busqueda) {
				this.$emit('setCurrentPage', this.currentPage)
			}
		},
	},
}
</script>
<style lang="sass">
@import '@/sass/_custom.scss'

// Centra la barra compacta sobre la tabla sin ocupar todo el ancho en escritorio.
.table-filter-pagination-wrap
	display: flex
	justify-content: center
	width: 100%
	box-sizing: border-box
	padding: 0 0.5rem

// Chip flotante: ancho según contenido en desktop; card compacta en mobile.
.table-filter-pagination-bar
	display: inline-flex
	align-items: center
	justify-content: center
	flex-wrap: nowrap
	gap: 0.65rem
	width: auto
	max-width: 100%
	box-sizing: border-box
	padding: 0.4rem 0.85rem
	border-radius: 999px
	border: 1px solid transparent
	@if ($theme == 'dark')
		background-color: rgba(42, 42, 42, 0.96)
		border-color: rgba(255, 255, 255, 0.08)
		box-shadow: 0 4px 18px rgba(0, 0, 0, 0.28)
	@else
		background-color: rgba(255, 255, 255, 0.98)
		border-color: rgba(0, 0, 0, 0.06)
		box-shadow: 0 4px 16px rgba(15, 23, 42, 0.08)

// Contador de resultados: tipografía secundaria, sin dominar la barra.
.pagination-bar-meta
	font-size: 0.8125rem
	font-weight: 500
	line-height: 1.2
	white-space: nowrap
	@if ($theme == 'dark')
		color: rgba(255, 255, 255, 0.72)
	@else
		color: rgba(33, 37, 41, 0.72)

// Separadores verticales entre bloques (solo escritorio).
.pagination-bar-separator
	display: inline-block
	width: 1px
	height: 1.35rem
	flex-shrink: 0
	@if ($theme == 'dark')
		background-color: rgba(255, 255, 255, 0.12)
	@else
		background-color: rgba(0, 0, 0, 0.08)

// Paginación bootstrap-vue: pills compactos y sin bordes duros.
.pagination-bar-pages
	flex-shrink: 0

	::v-deep .pagination
		margin: 0
		gap: 0.15rem

	::v-deep .page-item
		margin: 0

	::v-deep .page-link
		min-width: 2rem
		padding: 0.28rem 0.55rem
		border: none
		border-radius: 999px
		font-size: 0.8125rem
		line-height: 1.2
		box-shadow: none
		transition: background-color 0.15s ease, color 0.15s ease
		@if ($theme == 'dark')
			background-color: rgba(255, 255, 255, 0.06)
			color: rgba(255, 255, 255, 0.82)
		@else
			background-color: rgba(0, 0, 0, 0.04)
			color: rgba(33, 37, 41, 0.82)

	::v-deep .page-item.active .page-link
		font-weight: 600

	::v-deep .page-item.disabled .page-link
		opacity: 0.45

// Selector "por página": label + input alineados en una sola fila.
.pagination-bar-per-page
	display: inline-flex
	align-items: center
	flex-wrap: nowrap
	gap: 0.4rem
	flex-shrink: 0

.lbl-per-page
	margin: 0
	font-size: 0.75rem
	font-weight: 500
	line-height: 1.2
	white-space: nowrap
	@if ($theme == 'dark')
		color: rgba(255, 255, 255, 0.72)
	@else
		color: rgba(33, 37, 41, 0.62)

.input-per-page
	width: 3.5rem
	min-width: 3.25rem
	padding: 0.2rem 0.35rem
	border-radius: 999px
	text-align: center
	font-size: 0.8125rem
	line-height: 1.2
	@if ($theme == 'dark')
		background-color: rgba(255, 255, 255, 0.06)
		border-color: rgba(255, 255, 255, 0.12)
		color: rgba(255, 255, 255, 0.9)
	@else
		background-color: rgba(0, 0, 0, 0.03)
		border-color: rgba(0, 0, 0, 0.1)
		color: rgba(33, 37, 41, 0.9)

	&:focus
		box-shadow: 0 0 0 0.15rem rgba($blue, 0.18)

// Mobile: card apilada, legible y sin overflow horizontal.
@media (max-width: 575px)
	.table-filter-pagination-bar
		flex-direction: column
		align-items: stretch
		width: 100%
		max-width: 20rem
		padding: 0.65rem 0.75rem
		border-radius: 0.85rem
		gap: 0.55rem

	.pagination-bar-meta
		text-align: center

	.pagination-bar-separator
		display: none

	.pagination-bar-pages
		display: flex
		justify-content: center
		width: 100%

	.pagination-bar-per-page
		justify-content: center
		width: 100%
		padding-top: 0.15rem
		border-top: 1px solid rgba(0, 0, 0, 0.06)

		@if ($theme == 'dark')
			border-top-color: rgba(255, 255, 255, 0.1)
</style>
