<template>
<div id="vender">
	<new-article></new-article>

	<loading-afip-ticket></loading-afip-ticket>

	<articles-loading-advise></articles-loading-advise>

	<current-acounts></current-acounts>

	<select-payment-methods></select-payment-methods>

	<payment-methods-with-discounts></payment-methods-with-discounts>

	<nav-component></nav-component>
 
	<client></client>	
	<remito></remito>	
	<btn-save></btn-save>	

</div> 
</template>
<script>
import vender from '@/mixins/vender'
export default {
	mixins: [vender],
	components: {  
		SelectPaymentMethods: () => import('@/components/vender/modals/payment-methods/select-payment-methods/Index'),
		PaymentMethodsWithDiscounts: () => import('@/components/vender/modals/payment-methods/payment-methods-with-discounts/Index'),
		NewArticle: () => import('@/components/vender/modals/NewArticle'),
		LoadingAfipTicket: () => import('@/components/vender/modals/LoadingAfipTicket'),
		
		// Componentes
		CurrentAcounts: () => import('@/components/common/current-acounts/Index'),
		ArticlesLoadingAdvise: () => import('@/components/common/ArticlesLoadingAdvise'),
		NavComponent: () => import('@/components/vender/components/NavComponent'),
		Client: () => import('@/components/vender/components/client/Index'),
		Remito: () => import('@/components/vender/components/remito/Index'),
		BtnSave: () => import('@/components/vender/components/BtnSave'),
	},
	created() {
		this.setDefaultArticles()

		this.setPriceType()

		this.setDefaultPaymentMethod()

		this.set_omitir_en_cuenta_corriente()
	},
	watch: {
		price_types() {
			console.log('cambiaron los tipos de precios, llamando a setPriceType')
			this.setPriceType()
		}
	}
}
</script>
<style scoped lang="sass">

// .list 
// 	width: 98%
// 	position: absolute
// 	z-index: 500
// 	max-height: 200px
// 	overflow-y: scroll

// .article-name 
// 	font-size: 1rem
// 	padding: 10px

// .list-group-border 
// 	border: 1px solid rgba(51, 51,51, .6)
// 	border-radius: 0.25rem 0.25rem 0 0

// .p-price-mobile 
// 	font-size: 1.5rem

// .btn-movil 
// 	padding: 8px 16px


// .col-relative 
// 	position: relative
// 	padding: 0px


// .col-total
// 	display: flex
// 	flex-direction: column
// 	justify-content: flex-start
// 	@media screen and (min-width: 768px)
// 		p 
// 			text-align: left
</style>