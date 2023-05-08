<template>
	<div>
		<b-button
		class="m-r-15"
		v-if="model.seller_commissions_count == 0"
		v-b-modal="'seller-commission-saldo-inicial'"
		variant="outline-primary">
			Saldo Inicial
		</b-button>
		<b-button
		v-b-modal="'seller-commission-pago'"
		variant="primary">
			Hacer Pago
		</b-button>
	</div>
</template>
<script>
export default {
	computed: {
		model() {
			return this.$store.state.seller_commission.selected_model
		},
	},
}
</script>