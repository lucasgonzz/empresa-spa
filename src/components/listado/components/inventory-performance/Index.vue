<template>
	<b-row
	v-if="!is_filtered && is_admin"
	class="m-t-15">

		<b-col
		class="m-b-25 m-b-xl-0"
		md="6"
		xl="3">
			
			<inventario-stockeado></inventario-stockeado>
		</b-col>

		<b-col
		class="m-b-25 m-b-xl-0"
		md="6"
		xl="3">
			
			<valor-del-inventario></valor-del-inventario>
		</b-col>

		<b-col
		class="m-b-25 m-b-xl-0"
		md="6"
		xl="3">
			
			<costos-articulos></costos-articulos>
		</b-col>

		<b-col
		class="m-b-25 m-b-xl-0"
		md="6"
		xl="3">
			
			<estado-del-stock></estado-del-stock>
		</b-col>
		
	</b-row>
</template>
<script>
export default {
	components: {
		InventarioStockeado: () => import('@/components/listado/components/inventory-performance/InventarioStockeado'),
		ValorDelInventario: () => import('@/components/listado/components/inventory-performance/ValorDelInventario'),
		CostosArticulos: () => import('@/components/listado/components/inventory-performance/CostosArticulos'),
		EstadoDelStock: () => import('@/components/listado/components/inventory-performance/EstadoDelStock'),
	},
	created() {
		this.$store.dispatch('inventory_performance/getModels')
	},
	computed: {
		is_filtered() {
			return this.$store.state.article.is_filtered
		},
	},
}
</script>