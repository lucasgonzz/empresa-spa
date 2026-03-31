<template>
	<b-button
	v-if="is_filtered && !papelera"
	@click="restartSearch"
	class="m-l-10"
	id="btn_restart_filter"
	variant="outline-success">
		<i class="icon-history"></i>
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
		is_filtered() {
			if (this.papelera) {
				return this.$store.state.papelera[this.model_name].is_filtered
			}
			return this.$store.state[this.model_name].is_filtered
		},
	},
	methods: {
		restartSearch() {
			this.limpiar_filtros()
			let prefix = this.papelera ? ('papelera/' + this.model_name + '/') : (this.model_name + '/')
			this.$store.commit(prefix + 'setIsFiltered', false)
			this.$store.commit(prefix + 'setFiltered', [])
			this.$store.commit(prefix + 'setFilterPage', 1)
			this.$store.commit(prefix + 'setTotalFilterPages', null)
			this.$store.commit(prefix + 'setTotalFilterResults', 0)
		},
		limpiar_filtros() {
			this.$store.state[this.model_name].filters.forEach(filter => {
				filter.igual_que = filter.type == 'select' ? 0 : ''
				filter.mayor_que = ''
				filter.menor_que = ''
				filter.que_contenga = ''
				filter.checkbox = -1
				filter.ordenar_de = '' 
			})
		}
	}
}
</script>