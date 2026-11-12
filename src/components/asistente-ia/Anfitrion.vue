<template>
	<div v-if="should_show" :class="{ 'asistente-ia-guia-activa': guia_activa }">
		<asistente-ia-panel
		v-if="abierto"
		:key="identidad_de_sesion"
		:modo="en_modulo ? 'modulo' : 'lateral'"
		:puede_asistente="puede_entrar_al_mostrador"
		:puede_soporte="puede_soporte"
		:puede_guia="puede_guia"
		@expandir="abrir_modulo"
		@cerrar="cerrar">
			<template #guia>
				<guia-de-venta v-if="en_vender" @activa="guia_activa = $event"></guia-de-venta>
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
		<ficha-articulo-popover v-if="puede_entrar_al_mostrador"></ficha-articulo-popover>
		<cuenta-corriente-de-mencion v-if="puede_entrar_al_mostrador"></cuenta-corriente-de-mencion>

		<!-- El modal de configuración del agente (S3), montado UNA sola vez acá por el mismo
		motivo que el de cuenta corriente: los dos accesos (el engranaje de la sidebar y el
		botón del mostrador) lo abren por id, y con una sola instancia no hay dos <b-modal>
		con el mismo id peleándose. -->
		<configuracion-agente v-if="puede_entrar_al_mostrador && (!abierto || agente === 'asistente' || $route.name === 'ia')"></configuracion-agente>
	</div>
	<p v-else-if="en_modulo && mostrador_extensiones_cargadas" class="my-4 text-center">Tu cuenta no tiene acceso a Agentes.</p>
</template>

<script>
import AsistenteIaPanel from '@/components/asistente-ia/Panel'
import FichaArticuloPopover from '@/components/asistente-ia/FichaArticuloPopover'
import CuentaCorrienteDeMencion from '@/components/asistente-ia/CuentaCorrienteDeMencion'
import GuiaDeVenta from '@/components/asistente-ia/GuiaDeVenta'
import mostrador_acceso from '@/mixins/mostrador_acceso'
import { abre_en_soporte } from '@/components/asistente-ia/prueba_en_soporte'

const CONTROLES = 'a, button, label, input, textarea, select, summary, [contenteditable], [tabindex], [role="button"], [role="link"], [draggable=true]'

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
			ultima_ruta: null,
			guia_activa: false,
			ai_chat_echo_channel: null,
			reconexion_del_chat_enganchada: false,
			echo_del_chat_ya_estuvo_conectado: false,
		}
	},
	computed: {
		should_show() {
			return !!(this.authenticated && this.user && (this.puede_entrar_al_mostrador || this.puede_soporte || this.puede_guia))
		},
		puede_soporte() { return !!this.hasExtencion('support_chat') },
		puede_guia() { return !!this.$store.state.ai_chat.guia },
		/**
		 * Con la prueba gratuita vigente, Agentes abre en Soporte: ahí están la bienvenida, los videos y
		 * quien lo acompaña en la prueba (misión prueba-e2e-campana-imperio, 11/11/2026). Vencida la
		 * prueba, o contratado el sistema, vuelve a abrir en el Asistente personal como cualquier cliente.
		 *
		 * @returns {Boolean}
		 */
		abre_en_soporte() { return abre_en_soporte(this.user, this.puede_soporte) },
		identidad_de_sesion() {
			if (!this.authenticated || !this.user) return null
			return [this.user.id, !!this.user.es_sesion_soporte, !!this.user.es_acceso_maestro,
				this.user.asistente_personal_autorizado === true].join(':')
		},
		identidad_de_soporte() { return this.puede_soporte ? this.identidad_de_sesion : null },
		agente() { return this.$store.state.ai_chat.agente },
		en_modulo() { return this.$route.name === 'agentes' },
		abierto() { return this.en_modulo || this.panel_abierto },
		panel_abierto() {
			return this.$store.state.ai_chat.panel_abierto
		},
		en_vender() {
			return this.agente === 'asistente' && !this.$store.getters['demo/activa'] && this.$route.name === 'vender'
				&& (!this.$route.params.view || this.$route.params.view === 'remito')
		},
	},
	mounted() {
		this.suscribir_canal_del_chat()
		this.$root.$on('agentes:abrir', this.abrir_desde_navegacion)
		this.$root.$on('agentes:cerrar', this.cerrar)
		document.addEventListener('keydown', this.atajo_del_asistente)
		document.addEventListener('pointerdown', this.iniciar_pulsacion, true)
		document.addEventListener('pointermove', this.mover_pulsacion, true)
		document.addEventListener('pointerup', this.cancelar_pulsacion, true)
		document.addEventListener('pointercancel', this.cancelar_pulsacion, true)
		document.addEventListener('dragstart', this.cancelar_pulsacion, true)
		window.addEventListener('blur', this.cancelar_pulsacion)
	},
	beforeDestroy() {
		this.cancelar_pulsacion()
		this.$root.$off('agentes:abrir', this.abrir_desde_navegacion)
		this.$root.$off('agentes:cerrar', this.cerrar)
		document.removeEventListener('keydown', this.atajo_del_asistente)
		document.removeEventListener('pointerdown', this.iniciar_pulsacion, true)
		document.removeEventListener('pointermove', this.mover_pulsacion, true)
		document.removeEventListener('pointerup', this.cancelar_pulsacion, true)
		document.removeEventListener('pointercancel', this.cancelar_pulsacion, true)
		document.removeEventListener('dragstart', this.cancelar_pulsacion, true)
		window.removeEventListener('blur', this.cancelar_pulsacion)
		if (this.ai_chat_echo_channel && this.Echo) {
			this.Echo.leave(this.ai_chat_echo_channel)
		}
	},
	watch: {
		identidad_de_sesion(actual, anterior) {
			if (!anterior || actual === anterior) return
			this.$store.dispatch('ai_chat/cancelarEsperaDeRespuesta')
			this.$store.commit('ai_chat/renovarSesion')
			this.$store.commit('ai_chat/setPanelAbierto', false)
			this.$store.commit('ai_chat/setAgente', this.abre_en_soporte ? 'soporte' : 'asistente')
			this.$store.commit('ai_chat/setSelectedConversationId', null)
			this.$store.commit('ai_chat/setConversations', [])
			this.$store.commit('ai_chat/setMessages', [])
			this.$store.commit('ai_chat/setMiConsumo', null)
			this.$store.commit('support_ticket/setModels', [])
			this.$store.commit('support_message/setActiveTicketId', null)
			this.$store.commit('support_message/setModels', [])
			this.$store.commit('support_message/setSending', false)
			this.$store.commit('support_message/setMessagesLoading', false)
			this.$store.commit('mostrador/setReportes', null)
			this.$store.commit('mostrador/setLoading', false)
			this.suscribir_canal_del_chat()
		},
		'user.id'() {
			this.suscribir_canal_del_chat()
		},
		should_show() { this.suscribir_canal_del_chat() },
		puede_entrar_al_mostrador() { this.suscribir_canal_del_chat() },
		/**
		 * El agente con el que arranca la sesión de una prueba vigente. Cubre el ingreso directo a
		 * /agentes (F5, un enlace): ese camino no pasa por abrir_desde_navegacion() y se quedaba con el
		 * 'asistente' por defecto del store.
		 *
		 * Corre UNA vez por sesión, cuando llegan el usuario y sus extensiones (el valor pasa a true): no
		 * vuelve a pisar lo que la persona elija después en el selector, porque un refresco del usuario
		 * deja el valor en true y el watcher no se dispara. Si en ese momento ya está parada en «Tu guía»
		 * (la demo), no se la saca de ahí.
		 */
		abre_en_soporte: {
			immediate: true,
			handler(abre) {
				if (abre && this.$store.state.ai_chat.agente === 'asistente') this.$store.commit('ai_chat/setAgente', 'soporte')
			},
		},
		identidad_de_soporte: {
			immediate: true,
			handler(identidad) {
				if (identidad) this.$store.dispatch('support_ticket/getAgentes')
			},
		},
		$route(destino, origen) {
			this.cancelar_pulsacion()
			if (destino.name === 'agentes' && origen.name && origen.name !== 'login' && origen.name !== 'agentes') {
				this.ultima_ruta = origen.fullPath
			}
		},
	},
	methods: {
		abrir_desde_navegacion(modo) {
			if (!this.should_show) return
			const en_guia_soporte = this.puede_soporte && document.querySelector('.driver-popover.tour-soporte')
			// Con el lateral ya abierto (la prueba lo abre en la guía al entrar), la guía de Robotito
			// para crear un ticket igual necesita llegar a Soporte: si no, su paso queda esperando.
			if (this.abierto && en_guia_soporte) this.$store.commit('ai_chat/setAgente', 'soporte')
			if (!this.abierto) {
				// En la prueba vigente la barra abre en Soporte; fuera de ella, lo de siempre.
				const agente_comun = this.puede_entrar_al_mostrador && !en_guia_soporte && !this.abre_en_soporte ? 'asistente' : 'soporte'
				// En demo y prueba no unificada, la barra cae en la guía que sugiere los videos.
				this.$store.commit('ai_chat/setAgente', this.puede_guia && !en_guia_soporte ? 'guia' : agente_comun)
				this.$store.commit('ai_chat/setSelectedConversationId', null)
				this.$store.commit('ai_chat/setMessages', [])
				this.$store.commit('support_message/setActiveTicketId', null)
				this.$store.commit('support_message/setModels', [])
			}
			if (modo === 'modulo') {
				this.abrir_modulo()
				return
			}
			this.$store.commit('ai_chat/setPanelAbierto', true)
			if (this.en_modulo) this.volver_al_sistema()
		},
		abrir_modulo() {
			if (this.en_modulo) return
			this.$router.push({ name: 'agentes' }).then(() => this.$store.commit('ai_chat/setPanelAbierto', false)).catch(() => {})
		},
		volver_al_sistema() {
			this.$router.push(this.ultima_ruta || { name: 'reportes', params: { view: 'estado-de-resultados' } }).catch(() => {})
		},
		cerrar() {
			this.$store.commit('ai_chat/setPanelAbierto', false)
			if (this.en_modulo) this.volver_al_sistema()
		},
		iniciar_pulsacion(evento) {
			this.cancelar_pulsacion()
			if (!this.should_show || this.abierto || evento.pointerType !== 'mouse' || evento.button !== 0 || evento.altKey || evento.metaKey || evento.ctrlKey || evento.shiftKey) return
			if (!evento.target.closest || !evento.target.closest('#app') || evento.target.closest(CONTROLES + ', .modal, .driver-popover')) return
			this._pulsacion = { x: evento.clientX, y: evento.clientY }
			this._pulsacion_temporizador = setTimeout(() => {
				this.cancelar_pulsacion()
				if (!this.should_show || this.abierto || window.getSelection().toString() || document.querySelector('.modal.show, .driver-active')) return
				this.abrir_desde_navegacion('lateral')
			}, 1000)
		},
		mover_pulsacion(evento) {
			const inicio = this._pulsacion
			if (inicio && (evento.buttons !== 1 || Math.hypot(evento.clientX - inicio.x, evento.clientY - inicio.y) > 6)) this.cancelar_pulsacion()
		},
		cancelar_pulsacion() {
			clearTimeout(this._pulsacion_temporizador)
			this._pulsacion = null
		},
		atajo_del_asistente(evento) {
			if (!this.should_show || !this.$el || evento.defaultPrevented || evento.repeat || evento.isComposing || !evento.altKey || !evento.shiftKey || evento.ctrlKey || evento.metaKey || evento.code !== 'KeyA') return
			if (evento.target.closest && evento.target.closest('input, textarea, select, [contenteditable=true]')) return
			if (document.querySelector('.modal.show, .driver-popover')) return
			evento.preventDefault()
			if (this.abierto) this.cerrar()
			else this.abrir_desde_navegacion('lateral')
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
			// El login maestro usa polling: cada lectura vuelve a comprobar que la clave siga vigente.
			const canal = (this.should_show && this.puede_entrar_al_mostrador && this.user && !this.user.es_acceso_maestro && this.user.id)
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
			} else if (this.abierto) {
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
