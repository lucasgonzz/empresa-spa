<template>
	<div v-if="should_show" :class="{ 'asistente-ia-guia-activa': guia_activa }">
		<asistente-ia-panel v-if="panel_abierto" :modo="modo" @cambiar-modo="modo = $event">
			<template #guia>
				<guia-de-venta v-if="en_vender" @vista-lateral="modo = 'lateral'" @activa="guia_activa = $event"></guia-de-venta>
			</template>
		</asistente-ia-panel>

		<!-- 🔴 Lo que abren las menciones del chat (misión agente-ia-mano-derecha,
		16/9/2026) va acá y NO adentro del panel, por dos motivos:

		1. La conversación se dibuja en DOS contenedores —el panel del asistente y el sidebar
		   del informe del mostrador (`ia/SidebarConversacion.vue`)—, que montan el mismo
		   `mensaje/Index.vue`. Este componente es el único que está montado siempre que la
		   extensión esté prendida, así que cubre los dos de una vez sin duplicar nada.
		2. El panel tiene `overflow: hidden` (Panel.vue:367) y el informe también
		   (InformeAbierto.vue:256 y :308): una tarjeta flotante hija de cualquiera de los
		   dos queda recortada contra su borde.

		Los dos son livianos mientras no se usan: la tarjeta es un `b-popover` que no
		existe hasta el primer hover, y el modal de cuenta corriente no baja su chunk
		hasta el primer clic. -->
		<ficha-articulo-popover></ficha-articulo-popover>
		<cuenta-corriente-de-mencion></cuenta-corriente-de-mencion>

		<!-- El modal de configuración del agente (S3), montado UNA sola vez acá por el mismo
		motivo que el de cuenta corriente: los dos accesos (el engranaje de la sidebar y el
		botón del mostrador) lo abren por id, y con una sola instancia no hay dos <b-modal>
		con el mismo id peleándose. -->
		<configuracion-agente></configuracion-agente>
	</div>
</template>

<script>
import AsistenteIaPanel from '@/components/asistente-ia/Panel'
import FichaArticuloPopover from '@/components/asistente-ia/FichaArticuloPopover'
import CuentaCorrienteDeMencion from '@/components/asistente-ia/CuentaCorrienteDeMencion'
import GuiaDeVenta from '@/components/asistente-ia/GuiaDeVenta'
import mostrador_acceso from '@/mixins/mostrador_acceso'

export default {
	mixins: [mostrador_acceso],
	components: {
		AsistenteIaPanel,
		FichaArticuloPopover,
		CuentaCorrienteDeMencion,
		GuiaDeVenta,
		ConfiguracionAgente: () => import('@/components/asistente-ia/ConfiguracionAgente'),
	},
	data() {
		return {
			modo: 'lateral',
			guia_activa: false,
			ai_chat_echo_channel: null,
			reconexion_del_chat_enganchada: false,
			echo_del_chat_ya_estuvo_conectado: false,
		}
	},
	computed: {
		should_show() {
			return this.authenticated && this.puede_entrar_al_mostrador
		},
		panel_abierto() {
			return this.$store.state.ai_chat.panel_abierto
		},
		en_vender() {
			return !this.$store.getters['demo/activa'] && this.$route.name === 'vender'
				&& (!this.$route.params.view || this.$route.params.view === 'remito')
		},
	},
	mounted() {
		this.suscribir_canal_del_chat()
		document.addEventListener('keydown', this.atajo_del_asistente)
	},
	beforeDestroy() {
		document.removeEventListener('keydown', this.atajo_del_asistente)
		if (this.ai_chat_echo_channel && this.Echo) {
			this.Echo.leave(this.ai_chat_echo_channel)
		}
	},
	watch: {
		'user.id'() { this.suscribir_canal_del_chat() },
		should_show() { this.suscribir_canal_del_chat() },
	},
	methods: {
		atajo_del_asistente(evento) {
			if (!this.should_show || !this.$el || evento.defaultPrevented || evento.repeat || evento.isComposing || !evento.altKey || !evento.shiftKey || evento.ctrlKey || evento.metaKey || evento.code !== 'KeyA') return
			if (evento.target.closest && evento.target.closest('input, textarea, select, [contenteditable=true]')) return
			if (document.querySelector('.modal.show, .driver-popover')) return
			evento.preventDefault()
			this.$store.commit('ai_chat/setPanelAbierto', !this.panel_abierto)
		},
		/**
		 * Se suscribe al canal PRIVADO por persona `chat.user.{auth_user_id}` (D8/D45).
		 * Vive acá y no en el panel porque el anfitrión está montado siempre que la
		 * extensión esté activa: una respuesta puede llegar con el panel cerrado y
		 * hay que registrarla igual. El authorizer custom de canales privados ya
		 * está resuelto en main.js.
		 *
		 * 🔴 El Echo.leave va ANTES de cortar por "no hay canal nuevo": si en la
		 * misma pestaña entra otra persona (o se pierde la extensión), el canal
		 * anterior no puede quedar vivo escuchando conversaciones ajenas.
		 */
		suscribir_canal_del_chat() {
			if (!this.Echo) {
				return
			}
			const canal = (this.should_show && this.user && this.user.id)
				? 'chat.user.' + this.user.id
				: null
			// Guarda de doble suscripción: watch de user.id y de should_show pueden
			// dispararse varias veces en la misma sesión.
			if (this.ai_chat_echo_channel === canal) {
				return
			}
			if (this.ai_chat_echo_channel) {
				this.Echo.leave(this.ai_chat_echo_channel)
			}
			this.ai_chat_echo_channel = canal
			if (!canal) {
				return
			}
			/*
				🔴 Tiene que ser .listen('.ChatIaMensajeActualizado'), CON el punto
				inicial: es un Event con broadcastAs, NO una notificación de Laravel.
				Un .notification() acá no recibiría NADA NUNCA y sin ningún error a la
				vista (la trampa está documentada en src/mixins/broadcast.js:80-91).
			*/
			this.Echo.private(canal)
				.listen('.ChatIaMensajeActualizado', (payload) => {
					this.on_chat_ia_mensaje_actualizado(payload)
				})

			this.escuchar_reconexion_de_echo_del_chat()
		},
		/**
		 * El evento es liviano a propósito (tres ids y un estado, jamás el texto:
		 * puede traer saldos de clientes y no viaja por Pusher, D8/R4). Con la
		 * conversación abierta se busca el mensaje por REST; si es de otra, alcanza
		 * con refrescar la bandeja cuando el panel está a la vista.
		 */
		on_chat_ia_mensaje_actualizado(payload) {
			if (!payload || !payload.ai_conversation_id || !payload.ai_message_id) {
				return
			}
			const chat_state = this.$store.state.ai_chat
			if (chat_state.selected_conversation_id == payload.ai_conversation_id) {
				this.$store.dispatch('ai_chat/fetchMessage', {
					conversation_id: payload.ai_conversation_id,
					message_id: payload.ai_message_id,
				})
					.catch(err => {
						// Si el REST falla, el polling de respaldo sigue en carrera.
						console.log(err)
					})
			} else if (chat_state.panel_abierto) {
				this.$store.dispatch('ai_chat/getConversations')
			}
		},
		/**
		 * Vuelve a pedir los mensajes de la conversación abierta cada vez que Echo
		 * se reconecta. Réplica LOCAL de escuchar_reconexion_de_echo del mixin
		 * compartido (src/mixins/broadcast.js:106-145), que no se toca porque al
		 * reconectar dispara order/getUnconfirmedModels y no tiene nada que ver:
		 * los eventos que ocurrieron con la conexión caída no se reenvían solos.
		 */
		escuchar_reconexion_de_echo_del_chat() {
			if (this.reconexion_del_chat_enganchada) {
				return
			}
			// El conector de Pusher lo expone Echo (config de main.js). Se chequea en
			// vez de asumirlo: si cambia el broadcaster solo se pierde este refresco.
			if (!this.Echo.connector || !this.Echo.connector.pusher || !this.Echo.connector.pusher.connection) {
				return
			}
			const connection = this.Echo.connector.pusher.connection
			// Si ya está conectado cuando nos enganchamos (lo normal: Echo conecta en
			// main.js mucho antes de resolver la sesión), cualquier 'connected'
			// posterior ES una reconexión.
			this.echo_del_chat_ya_estuvo_conectado = connection.state == 'connected'
			this.reconexion_del_chat_enganchada = true
			connection.bind('connected', () => {
				if (!this.echo_del_chat_ya_estuvo_conectado) {
					this.echo_del_chat_ya_estuvo_conectado = true
					return
				}
				const chat_state = this.$store.state.ai_chat
				if (chat_state.selected_conversation_id) {
					// getMessages re-arma la espera si el último quedó pendiente.
					this.$store.dispatch('ai_chat/getMessages', {
						conversation_id: chat_state.selected_conversation_id,
						page: 1,
					})
				}
			})
		},

	},
}
</script>

<style lang="sass">
// Los tokens `--ia-*` de la ventana del agente (misión agente-mejoras-uso-real, 29/10/2026), los de
// ia.comerciocity.com, en :root y html.dark-mode.
//
// 🔴 SE EMITEN UNA SOLA VEZ Y ACÁ, y no es casualidad: App.vue importa el anfitrión de forma
// estática, así que esta hoja viaja en el CSS principal y está cargada siempre. Cubre el panel y
// también el sidebar del informe del mostrador (ia/SidebarConversacion.vue), que vive en otro chunk.
// Este bloque NO puede ser `scoped` (las reglas saldrían con `[data-v-…]` y no aplicarían) ni
// mudarse a un componente que se carga a demanda. Ver `_tokens.sass`.
@import '@/components/asistente-ia/_tokens'
</style>
