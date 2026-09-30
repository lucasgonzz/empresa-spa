<template>
	<!--
		Elemento `precios_con_iva` del diseño de Vender (mision diseno-vender-configurable,
		28/9/2026). La condicion para mostrarlo la calculaba stage-3/IvaYStock.vue, que agrupaba
		este interruptor con el de stock y las observaciones; con los diseños cada uno es un campo
		suelto que se puede ubicar en cualquier etapa, asi que la condicion vive aca.
	-->
	<vender-toggle
	v-if="puede_usar_iva_aplicado"
	v-model="iva_aplicado">
		Precios con IVA
	</vender-toggle>
</template>
<script>
import VenderToggle from '@/components/vender/components/VenderToggle'
import vender_set_total from '@/mixins/vender_set_total'

export default {
	components: {
		VenderToggle,
	},
	mixins: [vender_set_total],
	computed: {
		/**
		 * Si este usuario puede usar el interruptor "Precios con IVA": la extension
		 * hide_iva_and_discount_stock_in_vender lo oculta para todo el negocio, y ademas hace
		 * falta el permiso vender.iva_aplicado. Es la regla que tenia can_use_iva_aplicado en el
		 * difunto stage-3/IvaYStock.vue, y la misma que el `disponible` de `precios_con_iva` en
		 * layout/elementos.js: si se cambia una, se cambia la otra.
		 *
		 * @returns {boolean}
		 */
		puede_usar_iva_aplicado() {
			return !this.hasExtencion('hide_iva_and_discount_stock_in_vender')
				&& this.can('vender.iva_aplicado')
		},

		/*
		 * Computed con getter/setter para enlazar el toggle con el store.
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
