<template>
	<div>
		<div
		v-if="!loading">
			<p>
				<strong>ID:</strong> {{ payment.id }} 
			</p>
			<p>
				<strong>Tarjeta:</strong> {{ payment.payment_method_id }} 
			</p>
			<p>
				<strong>Primeros 6 digistos:</strong> {{ payment.card.first_six_digits }} 
			</p>
			<p>
				<strong>Estado:</strong> {{ payment.status }} 
			</p>
			<p>
				<strong>Detalle:</strong> {{ payment.status_detail }} 
			</p>
		</div>
		<skeleton
		v-else></skeleton>	
	</div>
</template>
<script>
import Skeleton from '@/components/online/modals/orders/payment-details/Skeleton'
export default {
	components: {
		Skeleton,
	},
	computed: {
		payment() {
			return this.$store.state.order_payment_method_detail.model
		},
		loading() {
			return this.$store.state.order_payment_method_detail.loading
		},
	}
}
</script>