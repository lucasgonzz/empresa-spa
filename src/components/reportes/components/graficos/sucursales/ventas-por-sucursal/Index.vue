<template>
	<div 
	class="chart-card">
		<div class="header">
			<h4>Vendido por sucursal</h4>
		</div>

		<chart></chart>
	</div>
</template>
<script>
export default {
	components: { 
		Chart: () => import('@/components/reportes/components/graficos/sucursales/ventas-por-sucursal/Chart'),
	},
}
</script>