<template>
	<div
	class="vender-buttons">

		<!-- <vuelto-efectivo></vuelto-efectivo> -->

		<div class="j-end w-100 m-b-10">
			<print></print>
			<limpiar-vender></limpiar-vender>
		</div>

		<sale-status></sale-status>
		<fecha-entrega></fecha-entrega>
		<observations></observations>


		<numero-orden-de-compra></numero-orden-de-compra>
		<!-- <pago></pago> -->
	</div>
</template>
<script>
export default {
	components: {
		Observations: () => import('@/components/vender/components/remito/header-2/buttons/Observations'),
		FechaEntrega: () => import('@/components/vender/components/remito/header-2/buttons/FechaEntrega'),
		SaleStatus: () => import('@/components/vender/components/remito/header-2/buttons/SaleStatus'),
		NumeroOrdenDeCompra: () => import('@/components/vender/components/remito/header-2/buttons/NumeroOrdenDeCompra'),
		Pago: () => import('@/components/vender/components/remito/header-2/buttons/Pago'),
		Print: () => import('@/components/vender/components/remito/header-2/buttons/Print'),
		LimpiarVender: () => import('@/components/vender/components/remito/header-2/buttons/LimpiarVender'),
		// VueltoEfectivo: () => import('@/components/vender/components/remito/VueltoEfectivo'),
	},
}
</script>
<style lang="sass">
.vender-buttons
	display: flex
	flex-direction: column 
	align-items: flex-start
	height: 100%
	flex-wrap: wrap
	justify-content: flex-start
	@media screen and (max-width: 576px)
		flex-direction: column
		align-items: flex-end
		.btn-pago 
			margin-bottom: 15px 
	@media screen and (min-width: 576px)
		.btn-pago 
			margin-right: 15px 
</style>