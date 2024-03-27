<template>
	<div 
	class="chart-card">
		<div class="header">
			<h4>Deudas de Clientes</h4>
		</div>
		
		<chart></chart>
	</div> 
</template>
<script>
export default {
	components: { 
		Chart: () => import('@/components/reportes/components/clientes/grafico-deudas-de-clientes/Chart'),
	},
	computed: {
		rango_temporal() {
			return this.$store.state.reportes.rango_temporal
		},
	},
}
</script>