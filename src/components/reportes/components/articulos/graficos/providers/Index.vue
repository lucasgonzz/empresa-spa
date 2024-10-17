<template>
	<div 
	v-if="providers.length"
	class="chart-wrapper">
		<div 
		class="chart-card">
			<div class="header">
				<h4>Proveedores</h4>
			</div>

			<chart></chart>
		</div> 
	</div>
</template>
<script>
export default {
	components: { 
		Chart: () => import('@/components/reportes/components/articulos/graficos/providers/Chart'),
	},
	computed: {
		providers() {
			return this.$store.state.reportes.article_purchase.providers
		},
	},
}
</script>