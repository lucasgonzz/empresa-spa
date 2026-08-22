<template>
	<div
	class="m-t-15"
	v-if="model.order_status.name != 'Cancelado' && model.order_status.name != 'Entregado'">
		<p
		class="text-center m-t-10 text-danger"
		v-if="disabled">
			Indique el deposito para poder continuar
		</p>
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
			status_message: 'Indique el deposito para poder continuar',
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
		disabled() {
			if (this.$store.state.address.models.length && !this.model.address_id) {
				return true
			}
			return false
		}
	},
	methods: {
		updateStatus() {
			if (this.disabled) {
				this.$toast.error(this.status_message)
				return
			}
			this.loading = true
			let self = this
			/*
				Pega contra el update() del recurso, no contra /order/update-status.
				Esa ruta apuntaba a OrderController@updateStatus, que quedo comentado entero el
				14/5/2026 cuando la logica de confirmar (crear la venta, descontar stock, generar
				el movimiento de cuenta corriente) se mudo a update() sin tocar esta SPA. La
				llamada caia en el __call de Laravel y volvia 500: el pedido nunca se confirmaba.
				La ruta muerta se borro de routes/api.php en el mismo cambio.

				Se manda SOLO order_status_id a proposito: update() ya toma los renglones y el
				deposito unicamente si vienen en la request, justamente para que este boton no los
				pise.
			*/
			this.$api.put(`/order/${this.model.id}`, {
				order_status_id: this.getStatusId()
			})
			.then(res => {
				self.loading = false
				// self.$store.dispatch('online/messages/getMessages', self.model.buyer_id)
				self.$store.commit('order/add', res.data.model)
				// self.$store.commit('order/setToShow')
				/*
					El id del modal del pedido es 'order': el modal generico de
					common-vue/components/model/Index.vue se declara con :id="model_name".
				*/
				self.$bvModal.hide('order')
			})
			.catch(err => {
				self.loading = false
				self.$toast.error('No se pudo actualizar el estado del pedido')
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
