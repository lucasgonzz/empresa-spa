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

				<!--
					Envío por correo (Zipnova): el botón se dibuja solo si el pedido trae una opción
					de envío elegida en la tienda o un envío ya generado. Abre el modal con el
					destinatario, la opción y el estado, y desde ahí se genera, se sincroniza, se
					imprime la etiqueta y se cancela.
				-->
				<envio-btn
				:order="slotProps.model"></envio-btn>
			</template>

			<!--
				Columna "Cliente": el nombre del comprador y, al lado, el badge "Sin vincular" si ese
				comprador todavía no está asociado a ningún cliente del sistema (misión
				vincular-comprador-desde-pedidos, 24/9/2026). El badge abre el modal de
				vincular/crear cliente, que está montado UNA sola vez en views/Online.vue.

				El texto es `buyer.name` tal cual: es exactamente lo que hasta ahora dibujaba la celda
				por defecto (`propertyText` de una relación `buyer_id`), así que un comprador ya
				vinculado se ve igual que siempre. Un pedido de invitado no tiene comprador
				(`slotProps.model.buyer` en null): sin el v-if el slot devolvería un nodo vacío y la
				celda queda vacía, como hoy.

				Mismo mecanismo que `#table-prop-client_id` de views/Ventas.vue: la tabla genérica
				reenvía cada `#table-prop-<key>` hasta la celda de esa columna.
			-->
			<template #table-prop-buyer_id="slotProps">
				<div
				v-if="slotProps.model.buyer"
				class="pedido-comprador"
				:class="{ 'pedido-comprador--pendiente': comprador_sin_vincular(slotProps.model.buyer) }">
					<span
					class="pedido-comprador__nombre"
					:title="slotProps.model.buyer.name">
						{{ slotProps.model.buyer.name }}
					</span>
					<badge-sin-vincular
					:buyer="slotProps.model.buyer"></badge-sin-vincular>
				</div>
			</template>
		</view-component>
	</div>
</template>
<script>
// El badge va con import estático y no lazy como el resto: es una píldora de unas pocas líneas, y
// con un import diferido cada fila dibujaría primero el nombre y después "empujaría" la columna
// cuando llegara el chunk del badge.
import BadgeSinVincular from '@/components/online/components/vincular-comprador/BadgeSinVincular'
import sin_vincular from '@/components/online/components/vincular-comprador/sin_vincular'

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
		EnvioBtn: () => import('@/components/online/components/orders/envio/EnvioBtn'),
		BadgeSinVincular,
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
		/**
		 * true si el comprador del pedido todavía no está vinculado a ningún cliente del sistema
		 * (regla única de vincular-comprador/sin_vincular.js). La celda de "Cliente" la usa para
		 * reservarle lugar al badge; el badge decide por su cuenta si se dibuja, con la misma regla.
		 *
		 * @param {Object|null} buyer Comprador embebido en el pedido (`order.buyer`).
		 * @returns {Boolean}
		 */
		comprador_sin_vincular(buyer) {
			return sin_vincular(buyer)
		},
	}
}
</script>
<style lang="sass">
// Celda "Cliente" de la tabla de Pedidos: el nombre del comprador y, si corresponde, el badge
// "Sin vincular" a su lado. Sin `scoped`: el contenido del slot se dibuja adentro de la tabla
// genérica, y el prefijo `pedido-comprador` es propio de esta pantalla.
.pedido-comprador
	display: flex
	align-items: center
	gap: 8px
	// Sin `min-width: 0` el nombre no puede achicarse por debajo de su ancho natural, y un
	// nombre largo empujaría al badge fuera de la celda en vez de recortarse con puntos.
	min-width: 0
	max-width: 100%

// El nombre es el ÚNICO que se recorta; el badge (flex-shrink: 0) siempre se ve entero.
.pedido-comprador__nombre
	min-width: 0
	overflow: hidden
	text-overflow: ellipsis
	white-space: nowrap

// 🔴 El respiro de la derecha es de 26 px a propósito. Toda celda de esta tabla difumina sus últimos
// 26 px con una máscara (`.cell-nowrap` de display/table/Tr.vue, para avisar que el texto se
// cortó). Si la columna tiene el ancho justo del contenido, esa máscara se comería el borde
// derecho del badge; con este respiro el badge queda siempre fuera de la zona difuminada. Solo
// se agrega cuando hay badge: un comprador ya vinculado no cambia en nada respecto de hoy.
.pedido-comprador--pendiente
	padding-right: 26px
</style>
