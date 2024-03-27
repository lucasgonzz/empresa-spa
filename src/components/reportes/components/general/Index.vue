<template>
	<div
	v-if="view == 'generales'">

		<div
		v-if="!loading">
			<rango-temporal></rango-temporal>
	 
			<icon-cards></icon-cards>

			<!-- Se vendieron 1.000, de los cuales 700 fueron a cuenta corriente -->

			<!-- Ingresaron 700 por pagos de cuentas corrientes -->
			
			<graficos></graficos>

		</div>

		<div 
		v-else
		class="all-center">
			<b-spinner
			variant="primary"></b-spinner>
		</div>


	</div>
</template>
<script>
export default {
	components: {
		RangoTemporal: () => import('@/components/reportes/components/general/RangoTemporal'),
		IconCards: () => import('@/components/reportes/components/general/IconCards'),
		Graficos: () => import('@/components/reportes/components/general/graficos/Index'),
	},
	computed: {
		loading() {
			return this.$store.state.reportes.loading
		},
	},
	created() {
		this.$store.dispatch('reportes/getReportes')
	},
}
</script>