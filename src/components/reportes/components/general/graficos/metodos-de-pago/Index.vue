<template>
	<div 
	class="chart-card">
		<div class="header">
			<h4>Metodos de Pago | Ventas mostrador y pagos de clientes</h4>
		</div>

		<chart></chart>
	</div> 
</template>
<script>
export default {
	components: { 
		Chart: () => import('@/components/reportes/components/general/graficos/metodos-de-pago/Chart'),
	},
}
</script>