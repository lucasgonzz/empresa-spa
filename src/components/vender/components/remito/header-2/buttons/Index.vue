<template>
	<div
	class="vender-buttons">

		<!-- <vuelto-efectivo></vuelto-efectivo> -->

		<sale-status></sale-status>
		<fecha-entrega></fecha-entrega>

		<div
		v-if="show_iva_or_discount_stock_controls"
		class="j-start m-b-10">
			<iva-aplicado v-if="can_use_iva_aplicado"></iva-aplicado>
			<discount-stock v-if="can_use_discount_stock"></discount-stock>
		</div>


		<observations></observations>


		<numero-orden-de-compra></numero-orden-de-compra>

		<div class="j-end w-100 m-b-10">
			<print></print>
			<limpiar-vender></limpiar-vender>
		</div>
		<!-- <pago></pago> -->
	</div>
</template>
<script>
export default {
	computed: {
		/*
		 * La extensión puede ocultar ambos checkboxes; los permisos controlan cada uno por separado.
		 */
		hide_iva_and_discount_stock_in_vender() {
			return this.hasExtencion('hide_iva_and_discount_stock_in_vender')
		},

		/*
		 * Permiso para usar el checkbox "Precios con IVA".
		 */
		can_use_iva_aplicado() {
			return !this.hide_iva_and_discount_stock_in_vender
				&& this.can('vender.iva_aplicado')
		},

		/*
		 * Permiso para usar el checkbox "Descontar stock".
		 */
		can_use_discount_stock() {
			return !this.hide_iva_and_discount_stock_in_vender
				&& this.can('vender.discount_stock')
		},

		/*
		 * Muestra el contenedor si al menos uno de los checkboxes está habilitado.
		 */
		show_iva_or_discount_stock_controls() {
			return this.can_use_iva_aplicado || this.can_use_discount_stock
		},
	},
	components: {
		Observations: () => import('@/components/vender/components/remito/header-2/buttons/Observations'),
		FechaEntrega: () => import('@/components/vender/components/remito/header-2/buttons/FechaEntrega'),
		SaleStatus: () => import('@/components/vender/components/remito/header-2/buttons/SaleStatus'),
		IvaAplicado: () => import('@/components/vender/components/remito/header-2/buttons/IvaAplicado'),
		DiscountStock: () => import('@/components/vender/components/remito/header-2/buttons/DiscountStock'),
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