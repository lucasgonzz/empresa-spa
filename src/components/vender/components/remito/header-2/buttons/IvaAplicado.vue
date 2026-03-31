<template>
	<b-form-checkbox
	v-model="iva_aplicado">
		Precios con IVA
	</b-form-checkbox>
</template>
<script>
import vender_set_total from '@/mixins/vender_set_total'

export default {
	mixins: [vender_set_total],
	computed: {
		/*
		 * Computed con getter/setter para enlazar el checkbox con el store.
		 * Lee y escribe vender/iva_aplicado como boolean y recalcula el total.
		 */
		iva_aplicado: {
			/*
			 * Getter del estado actual de iva_aplicado en store.
			 */
			get() {
				return this.$store.state.vender.iva_aplicado == 1
			},
			/*
			 * Setter del estado de iva_aplicado.
			 * Al cambiar el flag, recalcula precios/totales del remito.
			 */
			set(value) {
				// Valor normalizado en formato 1/0 para persistencia consistente.
				let iva_aplicado_value = value ? 1 : 0
				this.$store.commit('vender/set_iva_aplicado', iva_aplicado_value)
				this.setTotal()
			},
		},
	},
}
</script>
