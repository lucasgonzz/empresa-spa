<template>
<div id="listado">	
	<!-- <article-charts></article-charts>

	<stock-min></stock-min>
	<stock-0></stock-0>


	<update-props></update-props>

	
	<images-copy></images-copy> -->

	<import></import>
	<charts></charts>
	<article-used-in-recipes></article-used-in-recipes>
	<article-variants></article-variants>
	<providers-history></providers-history>

	<view-component
	show_filter_modal
	ask_selectable
	show_excel_drop_down
	model_name="article">
		<template v-slot:default="props">
			<buttons :model="props.model" />	
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
// Modals
// import ArticleCharts from '@/components/listado/modals/article-charts/Index'
// import StockMin from '@/components/listado/modals/StockMin'
// import Stock0 from '@/components/listado/modals/Stock0'
// import ImportArticles from '@/components/listado/modals/import/Index'
// // import ImportArticles from '@/components/listado/modals/ImportArticles.vue'
// import ImagesCopy from '@/components/listado/modals/images/ImagesCopy.vue'
// import ArticleImages from '@/components/listado/modals/images/Index.vue'
// import ArticleImagesColors from '@/components/listado/modals/images/Colors.vue'
// import EditArticle from '../components/common/EditArticle.vue'
// import UpdateProps from '../components/listado/modals/UpdateProps.vue'
// import Confirm from '../components/common/Confirm.vue'
// import ProvidersHistory from '../components/listado/modals/ProvidersHistory.vue'
// import ArticlesPdf from '../components/listado/modals/ArticlesPdf.vue'
// import PricesLists from '../components/listado/modals/prices-lists/Index.vue'
// import CreatePricesList from '../components/listado/modals/prices-lists/Create.vue'
// import Combos from '../components/listado/modals/combos/Index.vue'
// import StockInfo from '@/components/listado/modals/stock-info/Index.vue'

// // Components
// import HeaderListado from '../components/listado/components/header/Index'
// import ArticlesLoadingAdvise from '@/components/common/ArticlesLoadingAdvise'
// import List from '@/components/listado/components/list/Index'
// import FilteredSelected from '@/components/listado/components/filtered-selected/Index' 
export default {
	name: 'Lisado',
	components: {
		ViewComponent: () => import('@/common-vue/components/view/Index'),
		Import: () => import('@/components/listado/modals/import/Index'),
		Buttons: () => import('@/components/listado/components/Buttons'),
		Charts: () => import('@/components/listado/modals/article-charts/Index'),
		ArticleUsedInRecipes: () => import('@/components/listado/modals/article-used-in-recipes/Index'),
		ArticleVariants: () => import('@/components/listado/modals/article-variants/Index'),
		ProvidersHistory: () => import('@/components/listado/modals/providers-history/Index'),
		// ArticleCharts: () => import('@/components/listado/modals/article-charts/Index'),
		// StockMin,
		// Stock0,
		// ImportArticles,
		// ArticlesPdf,
		// PricesLists,
		// CreatePricesList,
		// Combos,
		// StockInfo,
		// ImagesCopy,
		// ArticleImages,
		// ArticleImagesColors,
		// EditArticle,
		// UpdateProps,
		// Confirm,
		// // PrintTickets,
		// ProvidersHistory,

		// // Components
		// HeaderListado,
		// ArticlesLoadingAdvise,
		// List,
		// FilteredSelected, 
	},
	beforeRouteLeave(to, from, next) {
		this.$store.commit('article/setSelected', [])
		next()
	},
}
</script>