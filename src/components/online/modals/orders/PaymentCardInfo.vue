<template>
<b-modal
hide-footer
v-if="order && order.payment_card_info"
title="Detalle del Pago"
id="payment-card-info">
	<p>
		<strong>ID del pago:</strong> {{ order.payment_card_info.payment_id }} 
	</p>
	<p>
		<strong>Tarjeta:</strong> {{ order.payment_card_info.card_brand }} 
	</p>
	<p>
		<strong>Estado:</strong> {{ order.payment_card_info.status }} 
	</p>
	<p>
		<strong>Numero ticket:</strong> {{ order.payment_card_info.num_ticket }} 
	</p>
</b-modal>
</template>
<script>
export default {
	computed: {
		order() {
			return this.$store.state.order.model 
		},
	},
}
</script>