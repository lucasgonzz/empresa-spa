<template>
	<b-button
	v-if="is_filtered && !papelera"
	v-b-tooltip.hover
	:title="tooltip_text"
	:aria-label="tooltip_text"
	@click="restartSearch"
	class="btn-header-action m-l-10"
	id="btn_restart_filter"
	size="sm"
	variant="outline-secondary">
		<i class="bi bi-arrow-counterclockwise" aria-hidden="true"></i>
	</b-button>
</template>
<script>
export default {
	props: {
		model_name: String,
		/** Si true, limpia solo el estado de resultados en papelera/{model} (no el is_filtered del listado). */
		papelera: {
			type: Boolean,
			default: false,
		},
	},
	computed: {
		/**
		 * Indica si hay filtros activos en el listado o en papelera según el modo.
		 *
		 * @returns {boolean}
		 */
		is_filtered() {
			if (this.papelera) {
				return this.$store.state.papelera[this.model_name].is_filtered
			}
			return this.$store.state[this.model_name].is_filtered
		},
		/** Texto visible del botón. */
		button_label() {
			return 'Limpiar filtros'
		},
		/** Texto ampliado al pasar el mouse (accesibilidad y UX). */
		tooltip_text() {
			return 'Quitar todos los filtros y volver al listado completo'
		},
	},
	methods: {
		/**
		 * Reinicia el estado de filtrado en el store y vacía los valores de cada filtro.
		 */
		restartSearch() {
			this.limpiar_filtros()
			let prefix = this.papelera ? ('papelera/' + this.model_name + '/') : (this.model_name + '/')
			this.$store.commit(prefix + 'setIsFiltered', false)
			this.$store.commit(prefix + 'setFiltered', [])
			this.$store.commit(prefix + 'setFilterPage', 1)
			this.$store.commit(prefix + 'setTotalFilterPages', null)
			this.$store.commit(prefix + 'setTotalFilterResults', 0)
		},
		/**
		 * Restablece los campos de cada filtro del modelo a su valor inicial.
		 */
		limpiar_filtros() {
			this.$store.state[this.model_name].filters.forEach(filter => {
				filter.igual_que = filter.type == 'select' ? 0 : ''
				filter.mayor_que = ''
				filter.menor_que = ''
				filter.que_contenga = ''
				filter.checkbox = -1
				filter.ordenar_de = ''
			})
		},
	},
}
</script>
<style scoped>
/* Alineación con otros controles del header (icono + texto en una línea). */
.btn-header-action {
	display: inline-flex;
	align-items: center;
	white-space: nowrap;
}
</style>
