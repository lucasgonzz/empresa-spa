<template>
	<div class="chart-wrapper">
		<div 
		class="chart-card">
			<div class="header">
				<h4>Ingresos mostrador</h4>
			</div>

			<chart></chart>
		</div> 
	</div>
</template>
<script>
export default {
	components: { 
		Chart: () => import('@/components/reportes/components/graficos/ingresos/ingresos-mostrador-metodos-de-pago/Chart'),
	},
}
</script>