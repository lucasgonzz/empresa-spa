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
			if (filter) {
				this.$store.commit(this.model_name + '/addFilter', { ...filter })
			}
		},
	},
}
</script>
<style lang="sass">
.filter-modal-title
	font-weight: bold
	color: #000
</style>
