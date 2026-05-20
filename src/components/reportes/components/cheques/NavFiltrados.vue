<template>
	<b-col
	class="j-start align-center">
		
		<b-button
		@click="limpiar_filtro">
			Limpiar filtros
		</b-button>

		<b-button
		class="m-l-10"
		variant="outline-success"
		@click="export_excel">
			<i class="icon-download"></i>
			Excel
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
		/**
		 * Abre en una pestaña nueva la ruta web que genera y descarga el Excel de forma síncrona.
		 * Envía los IDs de `cheque.filtered` (mismas filas visibles en la tabla).
		 */
		export_excel() {
			let ids = []
			this.filtered.forEach(function (cheque) {
				ids.push(cheque.id)
			})

			if (!ids.length) {
				this.$toast.error('No hay cheques para exportar')
				return
			}

			let link = process.env.VUE_APP_API_URL + '/cheque/excel/export?cheque_ids=' + ids.join('-')
			window.open(link)
		},
		limpiar_filtro() {
			this.$store.commit('cheque/setIsFiltered', false)
			this.$store.commit('cheque/setFiltered', [])
			this.$store.commit('cheque/setFilterPage', 1)
			this.$store.commit('cheque/setTotalFilterPages', null)
			this.$store.commit('cheque/setTotalFilterResults', 0)
			this.$store.commit('cheque/setFiltered', [])
		},
	}
}
</script>