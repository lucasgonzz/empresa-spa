<template>
	<div
	v-if="client && !guardar_como_presupuesto"
	class="vender-toggle-row">

		<!-- Toggle estilo iPhone enlazado al computed con setter -->
		<label
		class="vender-toggle"
		:class="{ 'vender-toggle--disabled': disabled }"
		for="toggle-omitir-cc">
			<input
			type="checkbox"
			id="toggle-omitir-cc"
			:disabled="disabled"
			:checked="omitir_en_cuenta_corriente == 1"
			@change="omitir_en_cuenta_corriente = $event.target.checked ? 1 : 0">
			<span class="vender-toggle__track">
				<span class="vender-toggle__thumb"></span>
			</span>
		</label>

		<span
		class="vender-toggle__label"
		id="omitir_en_cuenta_corriente">
			{{ text }}
		</span>

	</div>
</template>
<script>
import default_payment_method from '@/mixins/vender/default_payment_method'
export default {
	mixins: [default_payment_method],
	computed: {
		text() {
			if (this.owner.text_omitir_cc) {
				return this.owner.text_omitir_cc
			}
			return 'Omitir cuenta corriente'
		},
		omitir_en_cuenta_corriente: {
			set(value) {
				this.$store.commit('vender/set_omitir_en_cuenta_corriente', value)
				if (value == 1) {
					this.setDefaultPaymentMethod()
				} else {

					this.bloquear_metodo_de_pago()
					this.bloquear_caja()
					
				}
			},
			get() {
				return this.$store.state.vender.omitir_en_cuenta_corriente
			}
		},
		previus_sale() {
			return this.$store.state.vender.previus_sales.previus_sale
		},
		budget() {
			return this.$store.state.vender.budget
		},
		guardar_como_presupuesto() {
			return this.$store.state.vender.guardar_como_presupuesto
		},
		client() {
			return this.$store.state.vender.client
		},
		index_previus_sales() {
			return this.$store.state.vender.previus_sales.index
		},
		disabled() {
			// if (this.budget !== null) {
			// // if (this.previus_sale.id || this.budget !== null) {
			// 	return true
			// }
			if (this.index_previus_sales > 0) {
			// if (this.previus_sale.id || this.budget !== null) {
				return true
			}
			return false
		}
	},
}
</script>
