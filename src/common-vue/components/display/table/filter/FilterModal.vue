<template>
	<b-modal
	:id="modal_id"
	size="md"
	:title="'Filtrar por '+field_label"
	:no-close-on-backdrop="false"
	@shown="on_modal_shown"
	@hidden="on_modal_hidden">

		<!-- Título con la columna que se está filtrando -->
		<!-- <p
		v-if="field"
		class="filter-modal-title text-center m-b-15">
			Filtros — {{ field_label }}
		</p> -->

		<div class="filter-modal-body">
			<filter-component
			v-if="field"
			:field="field"
			:in_modal="true"
			:model_name="model_name"
			@filtrar="filtrar"></filter-component>
		</div>

		<template #modal-footer>
			<button
			type="button"
			class="filter-modal-btn filter-modal-btn--secondary"
			@click="agregar_filtro">
				Agregar filtro
			</button>
			<button
			type="button"
			class="filter-modal-btn filter-modal-btn--primary"
			@click="filtrar">
				Filtrar
			</button>
		</template>
	</b-modal>
</template>
<script>
export default {
	props: {
		// Columna activa en el modal; null cuando está cerrado.
		field: {
			type: Object,
			default: null,
		},
		model_name: String,
		modal_id: String,
	},
	components: {
		FilterComponent: () => import('@/common-vue/components/display/table/filter/Index'),
	},
	computed: {
		/**
		 * Etiqueta legible de la columna sin HTML del header.
		 *
		 * @returns {string}
		 */
		field_label() {
			if (!this.field || !this.field.label) {
				return ''
			}
			let label = String(this.field.label)
			return label.replace(/<[^>]*>/g, '').trim()
		},
	},
	methods: {
		/**
		 * Al mostrarse el modal, enfoca el primer input del formulario de filtro.
		 */
		on_modal_shown() {
			this.$nextTick(() => {
				if (!this.field) {
					return
				}
				let cont_filters = document.getElementById('cont-filters-' + this.field.key)
				if (!cont_filters) {
					return
				}
				let input = cont_filters.querySelector('input, select, textarea')
				if (input) {
					input.focus()
				}
			})
		},
		/**
		 * Limpia referencias al cerrar el modal (backdrop, ESC, etc.).
		 */
		on_modal_hidden() {
			this.$emit('closed')
		},
		/**
		 * Guarda el filtro en store (ya persistido por los inputs) y cierra sin ejecutar búsqueda.
		 */
		agregar_filtro() {
			this.persist_current_filter()
			this.$bvModal.hide(this.modal_id)
			this.$emit('agregar_filtro')
		},
		/**
		 * Ejecuta la búsqueda con los filtros actuales y cierra el modal.
		 */
		filtrar() {
			this.persist_current_filter()
			this.$bvModal.hide(this.modal_id)
			this.$emit('filtrar')
		},
		/**
		 * Confirma en store el estado del filtro de la columna abierta.
		 */
		persist_current_filter() {
			if (!this.field || !this.model_name) {
				return
			}
			let filters = this.$store.state[this.model_name].filters || []
			let filter = filters.find(_filter => _filter.key == this.field.key)
			if (!filter) {
				return
			}
			let patch = { ...filter }
			if (filter.type === 'date') {
				patch = this.read_date_filter_values_from_dom(patch)
			}
			this.$store.commit(this.model_name + '/addFilter', patch)
		},
		/**
		 * Toma menor/igual/mayor desde los inputs del modal (el valor puede no estar aún en Vuex al pulsar Filtrar).
		 *
		 * @param {Object} filter Filtro de la columna activa.
		 * @returns {Object}
		 */
		read_date_filter_values_from_dom(filter) {
			let cont = document.getElementById('cont-filters-' + filter.key)
			if (!cont) {
				return filter
			}
			let include_time = !(this.field && this.field.filter_date_only)
			let criteria_keys = ['menor_que', 'igual_que', 'mayor_que']
			let patch = { ...filter }
			criteria_keys.forEach(criterion_key => {
				let row = cont.querySelector('[data-date-filter-criterion="' + criterion_key + '"]')
				if (!row) {
					return
				}
				patch[criterion_key] = this.read_combined_date_from_dom_row(row, include_time)
			})
			return patch
		},
		/**
		 * Lee fecha y hora opcional de una fila del filtro date (misma lógica que Date.vue).
		 *
		 * @param {HTMLElement} row
		 * @param {boolean} include_time
		 * @returns {string}
		 */
		read_combined_date_from_dom_row(row, include_time) {
			let date_input = row.querySelector('input.date-filter-date, input[type="date"]')
			let date_val = date_input && date_input.value ? date_input.value : ''
			if (date_val === '') {
				return ''
			}
			if (!include_time) {
				return date_val
			}
			let time_input = row.querySelector('input.date-filter-time, input[type="time"]')
			let time_val = time_input && time_input.value ? time_input.value : ''
			if (time_val === '') {
				return date_val
			}
			if (time_val.length > 5) {
				time_val = time_val.substring(0, 5)
			}
			return date_val + 'T' + time_val
		},
	},
}
</script>
<style lang="sass">
.filter-modal-title
	font-weight: bold
	color: #000

// ────────────────────────────────────────────────────────────────────────
// Rediseño del modal de filtro por columna (Grupo 273, Prompt 06). Único
// lugar de estilos para los 7 subcomponentes que renderizan adentro
// (EnBlanco/Text/Number/Date/Select/Checkbox/Index): ellos solo aportan
// markup y clases, así en 3 meses no hay dos que se vean distinto sin que
// nadie sepa cuál es el bueno. NO scoped a propósito: filter-component se
// re-renderiza vía teleport/slot del b-modal, y estas reglas tienen que
// alcanzarlo igual.
// ────────────────────────────────────────────────────────────────────────

.filter-modal-body
	// Inputs y selects (b-form-input / b-form-select renderizan
	// .form-control / .custom-select): mismo lenguaje visual que el resto
	// del sistema (redondeado, borde suave, anillo azul al enfocar), en vez
	// del borde grueso + glow azul que pone _inputs.sass por defecto.
	.form-control,
	.custom-select
		height: 38px
		border-radius: 10px
		border: 1px solid #e2e4e7
		background: #fff
		box-shadow: none
		font-size: 0.9rem

		&:focus
			border: 1px solid #007bff
			box-shadow: 0 0 0 3px rgba(0, 123, 255, 0.15)
			outline: none
			background: #fff

	// Cada criterio (b-form-group) es su propia fila, con el label chico
	// arriba del input (b-form-group sin label-for renderiza un <legend>,
	// ver Date.vue: ya lo usaba y esto lo alcanza sin tocarle una línea).
	.form-group
		margin-bottom: 14px

		&:last-child
			margin-bottom: 0

	legend
		font-size: 0.75rem
		color: #6e6e73
		font-weight: normal
		margin-bottom: 4px

	// ─── Toggles "En blanco" / "Que no esté en blanco" (EnBlanco.vue) ─────
	// Reemplaza el <hr> de antes: borde superior suave + espaciado.
	.filter-toggles
		border-top: 1px solid #e5e7eb
		margin-top: 14px
		padding-top: 14px

	.filter-toggle-row
		display: flex
		align-items: center
		justify-content: space-between
		gap: 10px

		& + .filter-toggle-row
			margin-top: 10px

	.filter-toggle-row__label
		font-size: 0.9rem
		color: #1d1d1f

	// Toggle tipo iPhone: mismos valores exactos que .model-form__toggle
	// (common-vue/components/model/ModelForm.vue) y su copia bg-toggle del
	// buscador general. No se inventa un tercero.
	.filter-toggle
		position: relative
		display: inline-block
		width: 44px
		height: 26px
		cursor: pointer
		vertical-align: middle
		margin-bottom: 0
		flex: 0 0 auto

		input
			opacity: 0
			width: 0
			height: 0
			position: absolute

		.filter-toggle-track
			position: absolute
			inset: 0
			background: #d1d5db
			border-radius: 9999px
			transition: background 0.2s ease

		.filter-toggle-thumb
			position: absolute
			height: 20px
			width: 20px
			left: 3px
			bottom: 3px
			background: #fff
			border-radius: 50%
			transition: transform 0.2s ease
			box-shadow: 0 1px 4px rgba(0, 0, 0, 0.25)

		input:checked ~ .filter-toggle-track
			background: #22c55e

		input:checked ~ .filter-toggle-track .filter-toggle-thumb
			transform: translateX(18px)

// ─── Botones del footer ("Agregar filtro" / "Filtrar") ──────────────────
// Viven fuera de .filter-modal-body (el footer del b-modal es otro slot),
// por eso quedan a nivel de archivo en vez de anidados debajo, pero
// definidos en este mismo bloque para no repartir el sass entre archivos.
.filter-modal-btn
	height: 38px
	padding: 0 16px
	border-radius: 10px
	font-size: 0.9rem
	border: 1px solid transparent
	cursor: pointer
	box-shadow: none
	transition: background 0.15s ease, border-color 0.15s ease

.filter-modal-btn--primary
	background: #007bff
	border-color: #007bff
	color: #fff

	&:hover
		background: #006fe6
		border-color: #006fe6

	&:focus-visible
		background: #006fe6
		border-color: #0056b3
		box-shadow: none

.filter-modal-btn--secondary
	background: #fff
	border-color: #e2e4e7
	color: #1d1d1f

	&:hover
		background: #f2f3f4

	&:focus-visible
		border-color: #007bff
		background: #f2f8ff
		box-shadow: none
</style>
