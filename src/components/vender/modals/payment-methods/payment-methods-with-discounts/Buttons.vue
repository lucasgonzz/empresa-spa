<template>
	<div
	class="m-b-10">

		<b-button
		@click="save_payment_methods_with_discounts"
		block
		variant="primary">
			Guardar
		</b-button>

		<b-button
		@click="cancelar"
		block
		variant="danger">
			Cancelar
		</b-button>
	</div>
</template>
<script>
import payment_methods_with_discounts from '@/mixins/vender/payment_methods_with_discounts'
import vender from '@/mixins/vender'

export default {
	mixins: [payment_methods_with_discounts, vender],
	methods: {

		cancelar() {

			this.setDefaultPaymentMethod()

			this.$store.commit('vender/setSelectedPaymentMethods', [])
			// this.$store.commit('vender/current_acount_payment_methods/setPaymentMethods', [])
			this.$bvModal.hide('payment-method-modal')
			this.$bvModal.hide('payment-methods-with-discounts-modal')
			this.setTotal()
		}
	}
}
</script>