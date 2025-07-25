<template>
	<b-card
	v-if="hasExtencion('ask_save_current_acount') 
	&& client
	&& !guardar_como_presupuesto"
	class="m-b-25 m-t-25 b-r-1 shadow">

		<b-form-checkbox
		:value="1"
		size="lg"
		:disabled="disabled"
		:unchecked-value="0"
		v-model="omitir_en_cuenta_corriente">
			<span
			id="omitir_en_cuenta_corriente">
				{{ text }}
			</span>
		</b-form-checkbox>

	</b-card>
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
			return 'OMITIR en cuenta corriente'
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
		disabled() {
			if (this.budget !== null) {
			// if (this.previus_sale.id || this.budget !== null) {
				return true
			}
			return false
		}
	},
}
</script>