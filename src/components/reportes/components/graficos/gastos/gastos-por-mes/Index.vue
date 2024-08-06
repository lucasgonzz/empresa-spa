<template>
	<div 
	v-if="rango_temporal == 'rango-de-fechas'"
	class="chart-card">
		<div class="header">
			<h4>Gastos por mes</h4>
		</div>

		<chart></chart>
	</div> 
</template>
<script>
export default {
	components: { 
		Chart: () => import('@/components/reportes/components/graficos/gastos/gastos-por-mes/Chart'),
	},
	computed: {
		rango_temporal() {
			return this.$store.state.reportes.rango_temporal
		},
	},
}
</script>