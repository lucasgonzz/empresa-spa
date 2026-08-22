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
		@clicked="updateStatus()">
		</btn-loader>
		<hr>

		<limite-credito-pedido
		:info="limite_credito_info"
		@confirmar_igual="confirmar_igual"></limite-credito-pedido>
	</div>
</template>
<script>
export default {
	components: {
		BtnLoader: () => import('@/common-vue/components/BtnLoader'),
		LimiteCreditoPedido: () => import('@/components/online/modals/orders/LimiteCreditoPedido'),
	},
	data() {
		return {
			loading: false,
			status_message: 'Indique el deposito para poder continuar',
			/**
			 * Contenido de `limite_credito` del ultimo 422 del backend, para el modal salteable.
			 * Ver LimiteCreditoHelper::validar_pedido_confirmado() en empresa-api.
			 */
			limite_credito_info: {},
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
		/**
		 * Avanza el pedido al estado siguiente.
		 *
		 * @param {Boolean} ignorar_limite_credito true cuando el dueno ya vio el aviso del limite
		 *                                         de credito y eligio confirmar igual.
		 * @returns {void}
		 */
		updateStatus(ignorar_limite_credito = false) {
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
				order_status_id: this.getStatusId(),
				ignorar_limite_credito: ignorar_limite_credito,
			}, {
				/*
					El 422 del limite de credito no trae `errors`, asi que el interceptor de
					main.js lo tomaria por error generico y despacharia `errorEvent`, que termina
					en un toast con el mismo texto que ya muestra el modal. Con esto, para ese caso
					sale solo el modal; para el resto de los errores el toast local de mas abajo
					sigue avisando igual.
				*/
				skip_global_error_event: true,
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

				/*
					Limite de credito excedido (prompt 610): no es un fallo, es una decision que
					tiene que tomar el dueño. Se abre el modal salteable en vez del toast de error.
				*/
				if (self.es_error_de_limite_credito(err)) {

					self.limite_credito_info = err.response.data.limite_credito
					self.$bvModal.show('limite-credito-pedido')
					return
				}

				self.$toast.error('No se pudo actualizar el estado del pedido')
				console.log(err)
			})
		},
		/**
		 * El dueño acepto pasar el limite: se repite el mismo PUT con la bandera puesta.
		 *
		 * @returns {void}
		 */
		confirmar_igual() {
			this.updateStatus(true)
		},
		/**
		 * @param {Object} err Error de axios.
		 * @returns {Boolean} true si el backend rechazo por limite de credito.
		 */
		es_error_de_limite_credito(err) {
			return Boolean(err.response
							&& err.response.status == 422
							&& err.response.data
							&& err.response.data.error_limite_credito
							&& err.response.data.limite_credito)
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
