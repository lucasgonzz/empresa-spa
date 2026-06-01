<template>
	<b-modal
	:id="modal_id"
	size="sm"
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

		<filter-component
		v-if="field"
		:field="field"
		:in_modal="true"
		:model_name="model_name"
		@filtrar="filtrar"></filter-component>

		<template #modal-footer>
			<b-button
			variant="outline-primary"
			@click="agregar_filtro">
				Agregar filtro
			</b-button>
			<b-button
			variant="primary"
			@click="filtrar">
				Filtrar
			</b-button>
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
</style>
