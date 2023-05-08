<template>
	<div
	class="payment-method-afip-information">
		<payment-method></payment-method>
		<afip-information></afip-information>
		<employee></employee>
		<select-address></select-address>
		<sale-type></sale-type>
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
	select
		margin-bottom: 10px
		@media screen and (max-width: 768px)
			width: 100%
		@media screen and (min-width: 768px)
			width: 200px
			margin-right: 15px
</style>