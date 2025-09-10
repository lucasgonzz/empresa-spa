<template>
	<div
	class="vender-buttons">

		<!-- <vuelto-efectivo></vuelto-efectivo> -->

		<observations></observations>

		<fecha-entrega></fecha-entrega>
		<numero-orden-de-compra></numero-orden-de-compra>
		<pago></pago>
		<print></print>
	</div>
</template>
<script>
export default {
	components: {
		Observations: () => import('@/components/vender/components/remito/header-2/buttons/Observations'),
		FechaEntrega: () => import('@/components/vender/components/remito/header-2/buttons/FechaEntrega'),
		NumeroOrdenDeCompra: () => import('@/components/vender/components/remito/header-2/buttons/NumeroOrdenDeCompra'),
		Pago: () => import('@/components/vender/components/remito/header-2/buttons/Pago'),
		Print: () => import('@/components/vender/components/remito/header-2/buttons/Print'),
		// VueltoEfectivo: () => import('@/components/vender/components/remito/VueltoEfectivo'),
	},
}
</script>
<style lang="sass">
.vender-buttons
	display: flex
	flex-direction: row 
	align-items: flex-start
	height: 100%
	flex-wrap: wrap
	justify-content: flex-end
	@media screen and (max-width: 576px)
		flex-direction: column
		align-items: flex-end
		.btn-pago 
			margin-bottom: 15px 
	@media screen and (min-width: 576px)
		.btn-pago 
			margin-right: 15px 
</style>