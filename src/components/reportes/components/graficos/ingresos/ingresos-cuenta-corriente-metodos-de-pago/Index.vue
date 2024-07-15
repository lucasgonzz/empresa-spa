<template>
	<div 
	class="chart-card">
		<div class="header">
			<h4>Ingresos Cuenta Corriente</h4>
		</div>

		<chart></chart>
	</div> 
</template>
<script>
export default {
	components: { 
		Chart: () => import('@/components/reportes/components/graficos/ingresos/ingresos-cuenta-corriente-metodos-de-pago/Chart'),
	},
}
</script>