<template>
	<div>
		
		<div
		v-if="!loading">

			<selected-article-info></selected-article-info>

			<chart-card
			v-if="selected_article"></chart-card>

			<div 
			v-else
			class="text-with-icon m-t-50 m-b-50">
				<i class="icon-search"></i>
				Seleccione un articulo para ver sus rendimientos			
			</div>
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
		SelectedArticleInfo: () => import('@/components/reportes/components/graficos/articulos/article-performances/SelectedArticleInfo'),
		ChartCard: () => import('@/components/reportes/components/graficos/articulos/article-performances/ChartCard'),
	},
	computed: {
		selected_article() {
			return this.$store.state.reportes.article_performance.selected_article
		},
		loading() {
			return this.$store.state.reportes.article_performance.loading
		},
	},
}
</script>