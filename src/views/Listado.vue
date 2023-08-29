<template>
<div id="listado">	
	<!-- <article-charts></article-charts>

	<stock-min></stock-min>
	<stock-0></stock-0>


	<update-props></update-props>

	
	<images-copy></images-copy> -->

	<import></import>
	<charts></charts>
	<article-sales></article-sales>
	<article-used-in-recipes></article-used-in-recipes>
	<article-variants></article-variants>
	<providers-history></providers-history>

	<stock-info></stock-info>

	<view-component
	show_filter_modal
	ask_selectable
	show_excel_drop_down
	model_name="article">
		<template #horizontal_nav_center>
			<stock-info-buttons></stock-info-buttons>
		</template>

		<template v-slot:table_right_options="props">
			<buttons :model="props.model" />	
		</template>
		<template #name>
			<name-input></name-input> 
		</template>
	</view-component>
	
	<!-- <article-images-colors></article-images-colors> -->

	<!-- <articles-pdf></articles-pdf> -->
	<!-- <prices-lists></prices-lists> -->
	<!-- <create-prices-list></create-prices-list> -->
	<!-- <combos></combos> -->

	<!-- <stock-info></stock-info>
	
	<articles-loading-advise></articles-loading-advise> -->

	<!-- <header-listado></header-listado> -->
	<!-- <filtered-selected></filtered-selected> -->

	<!-- <list></list> -->
	
</div>
</template>

<script>
export default {
	name: 'Lisado',
	components: {
		ViewComponent: () => import('@/common-vue/components/view/Index'),
		Import: () => import('@/components/listado/modals/import/Index'),
		StockInfoButtons: () => import('@/components/listado/components/StockInfoButtons'),
		Buttons: () => import('@/components/listado/components/Buttons'),
		Charts: () => import('@/components/listado/modals/article-charts/Index'),
		ArticleSales: () => import('@/components/listado/modals/article-sales/Index'),
		ArticleUsedInRecipes: () => import('@/components/listado/modals/article-used-in-recipes/Index'),
		ArticleVariants: () => import('@/components/listado/modals/article-variants/Index'),
		ProvidersHistory: () => import('@/components/listado/modals/providers-history/Index'),
		NameInput: () => import('@/components/listado/components/NameInput'),
		StockInfo: () => import('@/components/listado/modals/stock-info/Index'),
	},
	beforeRouteLeave(to, from, next) {
		this.$store.commit('article/setSelected', [])
		next()
	},
}
</script>