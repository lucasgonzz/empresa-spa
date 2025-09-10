<template>
	<b-button
	v-if="model.current_acount_payment_methods.length"
	@click="showPaymentMethods"
	class="m-r-15"
	variant="primary">
		Met Pago
		<b-badge
		v-if="model.is_provisorio">
			(Provisorio)
		</b-badge>
	</b-button>
</template>
<script>
export default {
	props: {
		model: Object,
	},
	methods: {
		showPaymentMethods() {
			this.$store.commit('current_acount/setToShowPaymentMethods', this.model)
			this.$bvModal.show('payment-methods-details')
		}
	}
}
</script>