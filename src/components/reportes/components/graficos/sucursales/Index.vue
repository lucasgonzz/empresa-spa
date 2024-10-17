<template>
	<b-row
	v-if="sub_view == 'sucursales'"
	class="j-start">

		<!-- <b-col
		v-if="rango_temporal == 'rango-de-fechas'"
		cols="12">
			<ventas-por-mes></ventas-por-mes>
		</b-col> -->
		
		<b-col
		cols="12">
			<ventas-por-sucursal></ventas-por-sucursal>
		</b-col>

		<!-- <b-col
		lg="6"
		cols="12">
			<sucursales-metodos-de-pago></sucursales-metodos-de-pago>
		</b-col> -->
	</b-row>
</template>
<script>
export default {
	components: {
		VentasPorSucursal: () => import('@/components/reportes/components/graficos/sucursales/ventas-por-sucursal/Index'),
	},
	computed: {
		rango_temporal() {
			return this.$store.state.reportes.rango_temporal
		},
	},
}
</script>