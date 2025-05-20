<template>
	<div>
		<b-button
		@click="search_sales"
		variant="outline-primary">
			<i class="icon-search"></i>
			Agregar ventas
		</b-button>

		<table-sales></table-sales>
	</div>
</template>
<script>
export default {
	components: {
		TableSales: () => import('@/components/por-entregar/components/road-maps/sales/TableSales'),
	},
	computed: {
		model() {
			return this.$store.state.road_map.model
		},
	},
	methods: {
		get_fecha_entrega() {
			let input = document.getElementById('road_map_fecha_entrega')
			if (input) {
				return input.value
			}
		},
		search_sales() {
			
			let fecha_entrega = this.get_fecha_entrega()

			console.log('buscando fecha_entrega: '+fecha_entrega)

			this.$store.commit('auth/setMessage', 'Cargando ventas')
			this.$store.commit('auth/setLoading', true)

			this.$store.dispatch('road_map/search_sale/getModels', fecha_entrega)
			.then(() => {

				this.$store.commit('auth/setLoading', false)
				this.$bvModal.show('select-sales')
			})
		}
	}
}
</script>