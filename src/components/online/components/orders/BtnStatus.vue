<template>
	<div
	class="m-t-15"
	v-if="model.order_status.name != 'Cancelado' && model.order_status.name != 'Entregado'">
		<btn-loader
		:loader="loading"
		:text="text"
		@clicked="updateStatus">
		</btn-loader>
		<hr>
	</div>
</template>
<script>
export default { 
	components: {
		BtnLoader: () => import('@/common-vue/components/BtnLoader'),
	},
	data() {
		return {
			loading: false,
		}
	},
	computed: {
		model() {
			return this.$store.state.order.model
		},
		text() {
			if (this.model.order_status.name == 'Sin confirmar') {
				return 'Confirmar pedido'
			} 
			if (this.model.order_status.name == 'Confirmado') {
				if (this.model.deliver) {
					return 'Listo para enviar'
				}
				return 'Listo para retirar'
			} 
			if (this.model.order_status.name == 'Terminado') {
				if (this.model.deliver) {
					return 'Pedido enviado'
				}
				return 'Pedido retirado'
			} 
		},
		order_statuses() {
			return this.$store.state.order_status.models 
		},
	},
	methods: {
		updateStatus() {
			this.loading = true
			this.$api.put(`/order/update-status/${this.model.id}`, {
				order_status_id: this.getStatusId()
			})
			.then(res => {
				this.loading = false
				// this.$store.dispatch('online/messages/getMessages', this.model.buyer_id)
				this.$store.commit('order/add', res.data.model)
				// this.$store.commit('order/setToShow')
				this.$bvModal.hide('order')
			})
			.catch(err => {
				this.loading = false
				console.log(err)
			})
		},
		getStatusId() {
			let name 
			if (this.model.order_status.name == 'Sin confirmar') {
				name = 'Confirmado'
			}
			if (this.model.order_status.name == 'Confirmado') {
				name = 'Terminado'
			}
			if (this.model.order_status.name == 'Terminado') {
				name = 'Entregado'
			}
			return this.order_statuses.find(model => {
				return model.name == name 
			}).id 
		}
	}
}
</script>
