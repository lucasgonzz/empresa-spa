<template>
<div>
	<b-button
	v-if="order.tienda_nube_order_status_id == 1"
	@click="confirmar"
	variant="primary">
		Confirmar
	</b-button>
</div>
</template>
<script>
export default {
	computed: {
		order() {
			return this.$store.state.tienda_nube_order.model 
		},
	},
	methods: {
		confirmar() {
			this.$store.commit('auth/setMessage', 'Confirmando pedido')
			this.$store.commit('auth/setLoading', true)

			this.$api.put('tienda-nube-order/'+this.order.id, {
				...this.order,
				tienda_nube_order_status_id: 2
			})
			.then(res => {
				this.$store.commit('tienda_nube_order/add', res.data.model)
				this.$store.commit('auth/setLoading', false)
			})
			.catch(err => {
				this.$toast.error('Error al confirmar pedido')
				this.$store.commit('auth/setLoading', false)
			})
		}
	}
}
</script>