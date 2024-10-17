<template>
	<div 
	v-if="categories.length"
	class="chart-wrapper">
		<div 
		class="chart-card">
			<div class="header">
				<h4>Categorias</h4>
			</div>

			<chart></chart>
		</div> 
	</div>
</template>
<script>
export default {
	components: { 
		Chart: () => import('@/components/reportes/components/articulos/graficos/categories/Chart'),
	},
	computed: {
		categories() {
			return this.$store.state.reportes.article_purchase.categories
		},
	},
}
</script>