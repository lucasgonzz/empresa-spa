<template>
	<b-form-checkbox
	class="m-l-10"
	v-model="discount_stock"
	:disabled="is_disabled">
		Descontar stock
	</b-form-checkbox>
</template>
<script>
export default {
	computed: {
		/*
		 * Venta previa que se está actualizando (si existe).
		 * Se usa para determinar si discount_stock ya fue activado y guardado,
		 * en cuyo caso no se puede desactivar.
		 */
		previus_sale() {
			return this.$store.state.vender.previus_sales.previus_sale
		},

		/*
		 * El checkbox se deshabilita cuando se está actualizando una venta
		 * que ya tenía discount_stock activado (ya descontó stock en algún momento).
		 * Una vez que se activó y se guardó, no puede desactivarse.
		 */
		is_disabled() {
			return this.previus_sale
				&& this.previus_sale.id
				&& this.previus_sale.discount_stock == 1
		},

		/*
		 * Computed con getter/setter para enlazar el checkbox con el store.
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
