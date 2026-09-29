<template>
	<!--
		Elemento `descontar_stock` del diseño de Vender (mision diseno-vender-configurable,
		28/9/2026). La condicion para mostrarlo la calculaba stage-3/IvaYStock.vue, que agrupaba
		este interruptor con el de IVA y las observaciones; con los diseños cada uno es un campo
		suelto que se puede ubicar en cualquier etapa, asi que la condicion vive aca.
	-->
	<vender-toggle
	v-if="puede_usar_discount_stock"
	v-model="discount_stock"
	:disabled="is_disabled">
		Descontar stock
	</vender-toggle>
</template>
<script>
import VenderToggle from '@/components/vender/components/VenderToggle'
export default {
	components: {
		VenderToggle,
	},
	computed: {
		/**
		 * Si este usuario puede usar el interruptor "Descontar stock": la extension
		 * hide_iva_and_discount_stock_in_vender lo oculta para todo el negocio, y ademas hace
		 * falta el permiso vender.discount_stock. Es la regla que tenia can_use_discount_stock en el
		 * difunto stage-3/IvaYStock.vue, y la misma que el `disponible` de `descontar_stock` en
		 * layout/elementos.js: si se cambia una, se cambia la otra.
		 *
		 * @returns {boolean}
		 */
		puede_usar_discount_stock() {
			return !this.hasExtencion('hide_iva_and_discount_stock_in_vender')
				&& this.can('vender.discount_stock')
		},

		/*
		 * Venta previa que se está actualizando (si existe).
		 * Se usa para determinar si discount_stock ya fue activado y guardado,
		 * en cuyo caso no se puede desactivar.
		 */
		previus_sale() {
			return this.$store.state.vender.previus_sales.previus_sale
		},

		/*
		 * El toggle se deshabilita cuando se está actualizando una venta
		 * que ya tenía discount_stock activado (ya descontó stock en algún momento).
		 * Una vez que se activó y se guardó, no puede desactivarse.
		 */
		is_disabled() {
			return this.previus_sale
				&& this.previus_sale.id
				&& this.previus_sale.discount_stock == 1
		},

		/*
		 * Computed con getter/setter para enlazar el toggle con el store.
		 * Lee y escribe el estado vender/discount_stock como boolean.
		 */
		discount_stock: {
			get() {
				return this.$store.state.vender.discount_stock == 1
			},
			set(value) {
				this.$store.commit('vender/set_discount_stock', value ? 1 : 0)
			},
		},
	},
}
</script>
