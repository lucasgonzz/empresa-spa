<template>
	<div
	class="payment-method-afip-information">
		<payment-method></payment-method>
		<afip-information></afip-information>
		<employee></employee>
		<select-address></select-address>
		<sale-type></sale-type>
		<seller></seller>
		<cuotas></cuotas>
		<caja></caja>
		<total-info></total-info>
	</div>
</template>
<script>
export default { 
	components: {
		PaymentMethod: () => import('@/components/vender/components/remito/header-2/payment-method-afip-information/PaymentMethod'),
		AfipInformation: () => import('@/components/vender/components/remito/header-2/payment-method-afip-information/AfipInformation'),
		Employee: () => import('@/components/vender/components/remito/header-2/payment-method-afip-information/Employee'),
		SelectAddress: () => import('@/components/vender/components/remito/header-2/payment-method-afip-information/Address'),
		SaleType: () => import('@/components/vender/components/remito/header-2/payment-method-afip-information/SaleType'),
		Seller: () => import('@/components/vender/components/remito/header-2/payment-method-afip-information/Seller'),
		Cuotas: () => import('@/components/vender/components/remito/header-2/payment-method-afip-information/Cuotas'),
		TotalInfo: () => import('@/components/vender/components/remito/header-2/payment-method-afip-information/total-info/Index'),
		Caja: () => import('@/components/vender/components/remito/header-2/payment-method-afip-information/Caja'),
	}
}
</script>
<style lang="sass">
.payment-method-afip-information
	display: flex
	flex-wrap: wrap
	@media screen and (max-width: 768px)
		flex-direction: column 
	@media screen and (min-width: 768px)
		flex-direction: row 
	select, .cont-select
		margin-bottom: 10px
		@media screen and (max-width: 768px)
			width: 100%
		@media screen and (min-width: 768px)
			width: 200px
			margin-right: 15px

	.cont-select 
		display: flex
		flex-direction: row 
		justify-content: space-between
		align-items: center 


		& > select 
			width: 75%
			

			
</style>