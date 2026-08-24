<template>
	<div>
		<payment-card-info></payment-card-info>
		<payment-details></payment-details>

		<!--
			El aviso salteable del límite de crédito (prompt 610) vivía adentro de `BtnStatus`.
			Como el botón se sacó del modal, el modal del límite se monta acá, al lado del
			view-component, y esta pantalla es la que escucha el 422 del guardado.
		-->
		<limite-credito-pedido
		:info="limite_credito_info"
		@confirmar_igual="confirmar_igual"></limite-credito-pedido>

		<!--
			🔴 `skip_global_error_event` está prendido por el 422 del límite de crédito, que NO
			trae la clave `errors` de Laravel: sin esto el interceptor de `main.js` lo toma por
			error genérico y saca un toast con el mismo texto que ya muestra el modal. El alert
			del propio formulario sigue funcionando para todos los demás errores.
		-->
		<view-component
		v-if="view == 'pedidos'"
		change_from_dates_option
		show_btn_pdf
		:show_btn_delete="false"
		:show_btn_create="false"
		skip_global_error_event
		save_check_function="check_pedido_puede_avanzar_de_estado"
		order_list_by="order_status"
		model_name="order">
			<!--
				El comprador viene EMBEBIDO en el pedido: Order::scopeWithAll de empresa-api ya
				trae 'buyer' en el eager loading, así que el teléfono está en memoria y no hay
				que pedir nada.

				🔴 La guarda del buyer es obligatoria: un pedido de invitado tiene buyer_id nulo
				y `slotProps.model.buyer` viene en null. Se usa un ternario y no un `&&` para que
				a la prop (que es String) le llegue siempre un String y nunca el null. Igual el
				botón se auto-protege: sin dígitos no se dibuja.
			-->
			<template v-slot:table_left_options="slotProps">
				<btn-whatsapp-chat
				:phone="slotProps.model.buyer ? slotProps.model.buyer.phone : ''"
				:display_name="slotProps.model.buyer ? slotProps.model.buyer.name : ''"></btn-whatsapp-chat>
			</template>
		</view-component>
	</div>
</template>
<script>
/*
	Pedidos online.

	🔴 El estado del pedido se maneja ÚNICAMENTE desde el select "Estado" del formulario (decisión
	de Lucas, 22/8/2026). Hasta esta misión había además dos botones en el encabezado del modal
	—"Confirmar pedido" (`BtnStatus`) y "Cancelar pedido" (`BtnCancel` + `CancelOrder`)— que hacían
	lo mismo por otros dos endpoints. Los tres componentes se borraron y sus rutas también
	(`order/update-status` ya se había ido; `order/cancel` se fue con esto).

	Las reglas de qué transición vale viven en el backend (`OrderStatusHelper`), no acá: el select
	es genérico y ofrece todas las filas de `order_statuses`.
*/
export default {
	components: {
		ViewComponent: () => import('@/common-vue/components/view/Index'),
		PaymentCardInfo: () => import('@/components/online/modals/orders/PaymentCardInfo'),
		PaymentDetails: () => import('@/components/online/modals/orders/payment-details/Index'),
		LimiteCreditoPedido: () => import('@/components/online/modals/orders/LimiteCreditoPedido'),
		BtnWhatsappChat: () => import('@/components/common/BtnWhatsappChat'),
	},
	data() {
		return {
			/**
			 * Contenido de `limite_credito` del último 422 del backend, para el modal salteable.
			 * Ver LimiteCreditoHelper::validar_pedido_confirmado() en empresa-api.
			 */
			limite_credito_info: {},
		}
	},
	created() {
		this.$store.dispatch('order/getModels')
	},
	mounted() {
		/*
			Hook del formulario genérico: cuando un guardado de `order` falla, esta pantalla mira
			primero si es el 422 del límite de crédito y, si lo es, se lo queda.
		*/
		this.$root.$on('order:save-error', this.manejar_error_de_guardado)
	},
	beforeDestroy() {
		// `$root` vive toda la sesión: sin el $off queda un listener por cada montaje.
		this.$root.$off('order:save-error', this.manejar_error_de_guardado)
	},
	methods: {
		/**
		 * Se queda con el 422 del límite de crédito y abre el modal salteable en vez de dejar que
		 * el formulario muestre su alert genérico.
		 *
		 * @param {Object} err Error de axios del guardado.
		 * @param {Object} manejado Objeto compartido con el formulario: marcarle `valor` en true
		 *                          es lo que le dice que no muestre su alert.
		 * @returns {void}
		 */
		manejar_error_de_guardado(err, manejado) {
			if (!this.es_error_de_limite_credito(err)) {
				return
			}

			this.limite_credito_info = err.response.data.limite_credito
			this.$bvModal.show('limite-credito-pedido')
			manejado.valor = true
		},
		/**
		 * El 422 del límite de crédito, y no cualquier otro.
		 *
		 * Se piden las dos claves —el discriminador y los números— porque el modal renderiza los
		 * números: sin ellos abriría vacío.
		 *
		 * @param {Object} err Error de axios.
		 * @returns {Boolean}
		 */
		es_error_de_limite_credito(err) {
			return Boolean(err.response
							&& err.response.status == 422
							&& err.response.data
							&& err.response.data.error_limite_credito
							&& err.response.data.limite_credito)
		},
		/**
		 * El dueño decidió confirmar igual: se le pide al formulario que vuelva a guardar el mismo
		 * modelo con la bandera que saltea el chequeo.
		 *
		 * @returns {void}
		 */
		confirmar_igual() {
			this.$root.$emit('order:save-retry', { ignorar_limite_credito: true })
		},
	}
}
</script>
