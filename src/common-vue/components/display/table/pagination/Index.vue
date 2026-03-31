<template>
	<div
	v-if="mostrar_barra_paginacion"
	class="table-filter-pagination-bar j-center align-center m-b-15">

		<span
		class="total-resultados">
			{{ total_results }} resultados
		</span>

		<b-pagination
		class="m-0"
		v-model="current_page"
		:total-rows="total_results"
		:per-page="per_page_desde_store"
		></b-pagination>

		<div
		class="cont-per-page d-flex align-items-center flex-nowrap m-l-10">
			<label
			class="mb-0 text-nowrap m-r-5 small lbl-per-page"
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
			let filtrado = this.papelera
				? this.$store.state.papelera[this.model_name].is_filtered
				: this.$store.state[this.model_name].is_filtered
			let total = this.total_results
			return filtrado && total > 0
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

// Barra sobre el .cont-table (sin sticky): no comparte scroll con thead (th top: 0).
.table-filter-pagination-bar
	display: flex
	justify-content: center
	align-items: center
	position: relative
	width: 100%
	max-width: 100%
	box-sizing: border-box
	flex-wrap: wrap
	gap: 0.5rem 0.75rem
	padding: 0.45rem 0.5rem
	@if ($theme == 'dark')
		background-color: rgba(42, 42, 42, 0.98)
		box-shadow: 0 2px 10px rgba(0, 0, 0, 0.35)
		.lbl-per-page
			color: rgba(255, 255, 255, 0.85)
	@else
		background-color: rgba(255, 255, 255, 0.98)
		box-shadow: 0 2px 8px rgba(0, 0, 0, 0.08)

.input-per-page
	width: 4.75rem
	min-width: 4rem

.total-resultados
	font-size: 18px
	padding-right: 15px
</style>
