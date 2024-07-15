<template>
	<b-row
	v-if="view == 'gastos'"
	class="j-start">
		<b-col
		lg="6"
		cols="12">
			<gastos-por-concepto></gastos-por-concepto>
		</b-col>

		<!-- <b-col
		lg="6"
		cols="12">
			<ventas-por-mes></ventas-por-mes>
		</b-col> -->
	</b-row>
</template>
<script>
export default {
	components: {
		GastosPorConcepto: () => import('@/components/reportes/components/graficos/gastos/gastos-por-concepto/Index'),
		// IngresosCuentaCorrienteMetodosDePago: () => import('@/components/reportes/components/graficos/ingresos/ingresos-cuenta-corriente-metodos-de-pago/Index'),
	},
}
</script>