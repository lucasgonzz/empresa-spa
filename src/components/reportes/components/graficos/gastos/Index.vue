<template>
	<b-row
	v-if="sub_view == 'gastos'"
	class="j-start">

		<b-col
		cols="12">
			<gastos-por-mes></gastos-por-mes>
		</b-col>
		
		<b-col
		cols="12">
			<gastos-por-concepto></gastos-por-concepto>
		</b-col>
	</b-row>
</template>
<script>
export default {
	components: {
		GastosPorConcepto: () => import('@/components/reportes/components/graficos/gastos/gastos-por-concepto/Index'),
		GastosPorMes: () => import('@/components/reportes/components/graficos/gastos/gastos-por-mes/Index'),
	},
}
</script>