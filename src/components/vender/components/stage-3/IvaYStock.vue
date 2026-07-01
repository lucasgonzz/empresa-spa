<template>
	<!--
		Fila de cierre: toggles de IVA/stock y observaciones de la venta.
		Los textareas se muestran siempre; los toggles dependen de permisos/extensión.
	-->
	<div class="vender-stage__iva-stock-observations-row">

		<!-- Toggles de IVA aplicado y descuento de stock -->
		<div
		v-if="show_iva_or_discount_stock_controls"
		class="vender-stage__iva-stock-toggles j-start">
			<iva-aplicado v-if="can_use_iva_aplicado"></iva-aplicado>
			<discount-stock v-if="can_use_discount_stock"></discount-stock>
		</div>

		<!-- Observaciones normales y ocultas (siempre visibles) -->
		<observations :stage_open="stage_open"></observations>

	</div>
</template>

<script>
import Observations from './Observations'

export default {
	name: 'IvaYStock',
	props: {
		/**
		 * Indica si la etapa 3 está expandida (para recalcular altura de textareas al mostrarse).
		 */
		stage_open: {
			type: Boolean,
			default: false,
		},
	},
	components: {
		Observations,
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
