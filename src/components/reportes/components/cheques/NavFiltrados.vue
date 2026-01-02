<template>
	<b-col
	class="j-start align-center">
		
		<b-button
		@click="limpiar_filtro">
			Limpiar filtros
		</b-button>	

		<h4
		class="title m-l-15">
			Total: {{ total }}
		</h4>

		<h4
		class="title m-l-15">
			| Filtrados: {{ filtered.length }}
		</h4>
	</b-col>
</template>
<script>
export default {
	computed: {
		total() {
			let total = 0
			this.filtered.forEach(cheque => {
				total += Number(cheque.amount)
			})
			return this.price(total)
		},
		filtered() {
			return this.$store.state.cheque.filtered
		},
	},
	methods: {
		limpiar_filtro() {
			this.$store.commit('cheque/setFilters', [])
			this.$store.commit('cheque/setFiltered', [])
		},
	}
}
</script>