<template>
	<b-button
	v-if="is_filtered"
	@click="restartSearch"
	class="m-l-10"
	variant="outline-success">
		<i class="icon-history"></i>
	</b-button>
</template>
<script>
export default {
	props: {
		model_name: String,
	},
	computed: {
		is_filtered() {
			return this.$store.state[this.model_name].is_filtered
		},
	},
	methods: {
		restartSearch() {
			this.limpiar_filtros()
			this.$store.commit(this.model_name+'/setIsFiltered', false)
			this.$store.commit(this.model_name+'/setFiltered', [])
			this.$store.commit(this.model_name+'/setFilterPage', 1)
			this.$store.commit(this.model_name+'/setTotalFilterPages', 1)
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