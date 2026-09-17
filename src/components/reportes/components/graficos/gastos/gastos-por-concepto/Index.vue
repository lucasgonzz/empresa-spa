<template>
	<div 
	class="chart-card">
		<div class="header">
			<h4>Gastos por sub categoría</h4>
		</div>

		<chart></chart>
	</div> 
</template>
<script>
export default {
	components: { 
		Chart: () => import('@/components/reportes/components/graficos/gastos/gastos-por-concepto/Chart'),
	},
}
</script>