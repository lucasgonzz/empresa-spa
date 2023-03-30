<template>
<b-modal
title="Metodos de pago"
hide-footer
id="payment-methods-details">
	<payment-method
	v-for="(payment_method, index) in model.current_acount_payment_methods"
	:key="index"
	:model="payment_method"></payment-method>
</b-modal>
</template>
<script>
import PaymentMethod from '@/components/common/current-acounts/payment-methods-details/PaymentMethod'
export default {
	components: {
		PaymentMethod,
	},
	computed: {
		model() {
			return this.$store.state.current_acount.to_show_payment_methods
		},
	},
}
</script>