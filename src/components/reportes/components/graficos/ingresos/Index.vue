<template>
	<b-row
	v-if="view == 'ingresos'"
	class="j-start">
		<b-col
		lg="6"
		cols="12">
			<ingresos-mostrador-metodos-de-pago></ingresos-mostrador-metodos-de-pago>
		</b-col>

		<b-col
		lg="6"
		cols="12">
			<ingresos-cuenta-corriente-metodos-de-pago></ingresos-cuenta-corriente-metodos-de-pago>
		</b-col>

		<b-col
		lg="6"
		cols="12">
			<ventas-por-mes></ventas-por-mes>
		</b-col>
	</b-row>
</template>
<script>
export default {
	components: {
		VentasPorMes: () => import('@/components/reportes/components/graficos/ingresos/ventas-por-mes/Index'),
		IngresosMostradorMetodosDePago: () => import('@/components/reportes/components/graficos/ingresos/ingresos-mostrador-metodos-de-pago/Index'),
		IngresosCuentaCorrienteMetodosDePago: () => import('@/components/reportes/components/graficos/ingresos/ingresos-cuenta-corriente-metodos-de-pago/Index'),
	},
}
</script>