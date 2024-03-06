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
	<stock-movement></stock-movement>
	<address-movement></address-movement>
	<stock-movement-modal-info></stock-movement-modal-info>
	<confirm-reset-stock></confirm-reset-stock>
	
	<create-article-addresses></create-article-addresses>

	<price-changes></price-changes>

	<stock-info></stock-info>

	<articles-pre-import-modal></articles-pre-import-modal>

	<view-component
	show_filter_modal
	ask_selectable
	show_excel_drop_down
	@addressMovement="addressMovement"
	model_name="article">
		<template #excel_drop_down_options>
			<excel-para-clientes></excel-para-clientes>
			<articles-pre-imports></articles-pre-imports>
		</template>
		<template #horizontal_nav_center>
			<stock-info-buttons></stock-info-buttons>
			<bar-code-search></bar-code-search>
		</template>
		<template #options_drop_down>
			<article-ticket-option-drop-down></article-ticket-option-drop-down>
			<articles-pdf-option-drop-down></articles-pdf-option-drop-down>
			<reset-stock-option-drop-down></reset-stock-option-drop-down>
			<seleccion-especial></seleccion-especial>
		</template>

		<template v-slot:table_right_options="props">
			<buttons :model="props.model" />	
		</template>
		<template #name>
			<name-input></name-input> 
		</template>
		<template #stock>
			<stock-input></stock-input> 
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
		ExcelParaClientes: () => import('@/components/listado/components/excel-dropdown-options/ExcelParaClientes'),
		ArticlesPreImports: () => import('@/components/listado/components/excel-dropdown-options/ArticlesPreImports'),

		ArticlesPreImportModal: () => import('@/components/listado/modals/articles-pre-import/Index'),

		StockInfoButtons: () => import('@/components/listado/components/StockInfoButtons'),
		BarCodeSearch: () => import('@/components/listado/components/BarCodeSearch'),
		Buttons: () => import('@/components/listado/components/Buttons'),
		Charts: () => import('@/components/listado/modals/article-charts/Index'),
		ArticleSales: () => import('@/components/listado/modals/article-sales/Index'),
		ArticleUsedInRecipes: () => import('@/components/listado/modals/article-used-in-recipes/Index'),
		ArticleVariants: () => import('@/components/listado/modals/article-variants/Index'),
		ProvidersHistory: () => import('@/components/listado/modals/providers-history/Index'),
		StockMovement: () => import('@/components/listado/modals/stock-movement/Index'),
		AddressMovement: () => import('@/components/listado/modals/address-movement/Index'),
		StockMovementModalInfo: () => import('@/components/listado/modals/stock-movement-modal-info/Index'),
		CreateArticleAddresses: () => import('@/components/listado/modals/create-article-addresses/Index'),
		PriceChanges: () => import('@/components/listado/modals/price-changes/Index'),
		NameInput: () => import('@/components/listado/components/NameInput'),
		StockInput: () => import('@/components/listado/components/StockInput'),
		StockInfo: () => import('@/components/listado/modals/stock-info/Index'),
		ArticleTicketOptionDropDown: () => import('@/components/listado/components/ArticleTicketOptionDropDown'),
		ArticlesPdfOptionDropDown: () => import('@/components/listado/components/ArticlesPdfOptionDropDown'),
		ResetStockOptionDropDown: () => import('@/components/listado/components/ResetStockOptionDropDown'),
		ConfirmResetStock: () => import('@/components/listado/modals/ConfirmResetStock'),
		SeleccionEspecial: () => import('@/components/listado/components/SeleccionEspecial'),
	}, 
	beforeRouteLeave(to, from, next) {
		this.$store.commit('article/setSelected', [])
		next()
	},
	methods: {
		addressMovement() {
			console.log('addressMovement')
		}
	}
}
</script>