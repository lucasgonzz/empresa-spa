<template>
	<b-button
	:disabled="model.id ? true : false"
	v-b-modal="'payment-method-modal'">
		Indicar Metodos de pago
	</b-button>
</template>
<script>
export default {
	computed: {
		model() {
			return this.$store.state.expense.model
		}
	}
}
</script>