<template>
	<div 
	class="chart-card">
		<div class="header">
			<h4>Vendido por mes</h4>
		</div>

		<chart-ventas></chart-ventas>
	</div>
</template>
<script>
export default {
	components: { 
		ChartVentas: () => import('@/components/reportes/components/graficos/ingresos/ventas-por-mes/ChartVentas'),
	},
}
</script>