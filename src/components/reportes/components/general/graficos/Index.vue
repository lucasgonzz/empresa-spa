<template>
	<b-row
	class="j-start">
		<b-col
		lg="6"
		cols="12">
			<ventas-por-mes></ventas-por-mes>
		</b-col>

		<b-col
		lg="6"
		cols="12">
			<gastos-por-mes></gastos-por-mes>
		</b-col>

		<b-col
		lg="6"
		cols="12">
			<metodos-de-pago></metodos-de-pago>
		</b-col>
	</b-row>
</template>
<script>
export default {
	components: {
		VentasPorMes: () => import('@/components/reportes/components/general/graficos/ventas-por-mes/Index'),
		GastosPorMes: () => import('@/components/reportes/components/general/graficos/gastos-por-mes/Index'),
		MetodosDePago: () => import('@/components/reportes/components/general/graficos/metodos-de-pago/Index'),
	},
}
</script>