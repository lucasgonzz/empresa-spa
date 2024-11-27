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

	<inventory-performance></inventory-performance>


	<!-- <stock-info></stock-info> -->

	<articles-pre-import-modal></articles-pre-import-modal>
	<view-component
	show_view_header
	show_filter_modal
	ask_selectable
	show_excel_drop_down
	:has_permission_create_dropdown="has_permission_create_dropdown"
	:properties_to_show="properties_to_show"
	@addressMovement="addressMovement"
	:show_empty_text="show_empty_text"
	model_name="article">

		<template #excel_drop_down_options>
			<excel-para-clientes></excel-para-clientes>
			<articles-pre-imports></articles-pre-imports>
		</template>

		<template #horizontal_nav_center>
			<div class="j-end">

				<btn-inventory-performance></btn-inventory-performance>
				
				<buscador-header></buscador-header>

				<deposit-movements></deposit-movements>

			</div>

		</template>
		
		<template #options_drop_down>
			
			<drop-down-options></drop-down-options>

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

		
		<template
		v-for="price_type in price_types"
		v-slot:[get_model_form_price_type_slot(price_type)]="props">
			<price-type-input
			:article="props.model"
			:price_type="price_type"></price-type-input>
		</template>


		<template #table-prop-price="props">
			<article-price
			:article="props.model"></article-price> 
		</template>

		<template #table-prop-stock="props">
			<stock-btn
			:article="props.model"></stock-btn>
		</template> 


		<template
		v-for="price_type in price_types"
		v-slot:[get_table_price_type_prop(price_type)]="props">
			{{ get_price_type_price(props.model, price_type) }}
		</template>

		<template
		v-for="address in addresses"
		v-slot:[get_table_address_prop(address)]="props">
			<address-stock
			:article="props.model"
			:address="address"></address-stock>
		</template>
		
		<template
		v-for="payment_method_discount in current_acount_payment_method_discounts"
		v-slot:[get_table_paymen_discount_prop(payment_method_discount)]="props">
			{{ get_payment_discount(props.model, payment_method_discount) }}
		</template>

	</view-component>
	
</div>
</template>

<script>
import payment_method_discounts_addresses_columns from '@/mixins/listado/payment_method_discounts_addresses_columns'
export default {
	mixins: [payment_method_discounts_addresses_columns],
	name: 'Lisado',
	components: {
		ViewComponent: () => import('@/common-vue/components/view/Index'),
		Import: () => import('@/components/listado/modals/import/Index'),
		ExcelParaClientes: () => import('@/components/listado/components/excel-dropdown-options/ExcelParaClientes'),
		ArticlesPreImports: () => import('@/components/listado/components/excel-dropdown-options/ArticlesPreImports'),

		ArticlesPreImportModal: () => import('@/components/listado/modals/articles-pre-import/Index'),

		// StockInfoButtons: () => import('@/components/listado/components/StockInfoButtons'),
		
		BtnInventoryPerformance: () => import('@/components/listado/components/BtnInventoryPerformance'),
		BuscadorHeader: () => import('@/components/listado/components/buscador-header/Index'),
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
		// StockInfo: () => import('@/components/listado/modals/stock-info/Index'),
		StockBtn: () => import('@/components/listado/components/table-props/stock-btn/Index'),
		ArticlePrice: () => import('@/components/listado/components/ArticlePrice'),

		// Dropdown options
		DropDownOptions: () => import('@/components/listado/components/selected-filtered-options/Index'),
		ConfirmResetStock: () => import('@/components/listado/modals/ConfirmResetStock'),
		PriceTypeInput: () => import('@/components/listado/components/PriceTypeInput'),

		InventoryPerformance: () => import('@/components/listado/modals/inventory-performance/Index'),

		DepositMovements: () => import('@/components/listado/components/deposit-movements/Index'),

		AddressStock: () => import('@/components/listado/components/table-props/address-stock/Index'),
	}, 
	beforeRouteLeave(to, from, next) {
		this.$store.commit('article/setSelected', [])
		next()
	},
	computed: {
		has_permission_create_dropdown() {
			return this.authenticated && this.can('article.export_excel_clients')
		},
		show_empty_text() {
			return this.$store.state.article.is_filtered
		},
	},
	methods: {
		addressMovement() {
			console.log('addressMovement')
		}
	}
}
</script>