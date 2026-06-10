<template>
	<!--
		Controles de IVA aplicado y descuento de stock.
		Encapsula la lógica de permisos para mostrar/ocultar cada opción.
	-->
	<div
	v-if="show_iva_or_discount_stock_controls"
	class="vender-stage__iva-stock-toggles j-start">
		<iva-aplicado v-if="can_use_iva_aplicado"></iva-aplicado>
		<discount-stock v-if="can_use_discount_stock"></discount-stock>
	</div>
</template>

<script>
export default {
	name: 'IvaYStock',
	components: {
		IvaAplicado: () => import('@/components/vender/components/remito/header-2/buttons/IvaAplicado'),
		DiscountStock: () => import('@/components/vender/components/remito/header-2/buttons/DiscountStock'),
	},
	computed: {
		/**
		 * Indica si la extensión oculta ambos controles de IVA y stock.
		 *
		 * @returns {boolean}
		 */
		hide_iva_and_discount_stock_in_vender() {
			return this.hasExtencion('hide_iva_and_discount_stock_in_vender')
		},

		/**
		 * Permiso para usar el checkbox "Precios con IVA".
		 *
		 * @returns {boolean}
		 */
		can_use_iva_aplicado() {
			return !this.hide_iva_and_discount_stock_in_vender
				&& this.can('vender.iva_aplicado')
		},

		/**
		 * Permiso para usar el checkbox "Descontar stock".
		 *
		 * @returns {boolean}
		 */
		can_use_discount_stock() {
			return !this.hide_iva_and_discount_stock_in_vender
				&& this.can('vender.discount_stock')
		},

		/**
		 * Muestra el contenedor si al menos uno de los controles está habilitado.
		 *
		 * @returns {boolean}
		 */
		show_iva_or_discount_stock_controls() {
			return this.can_use_iva_aplicado || this.can_use_discount_stock
		},
	},
}
</script>
