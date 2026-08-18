<template>
	<div
	v-if="should_show"
	class="whatsapp-sidebar-host">
		<whatsapp-sidebar
		v-if="sidebar_abierto"></whatsapp-sidebar>
	</div>
</template>
<script>
/**
 * Anfitrión del módulo WhatsApp: se monta en `App.vue` y vive en TODA la aplicación.
 *
 * Tiene dos trabajos, y los dos existen por el mismo motivo: desde este refactor la
 * conversación de WhatsApp se abre desde Clientes, Pedidos y Compradores, no solo desde el
 * módulo.
 *
 * 1. **Monta el sidebar** cuando el store dice que está abierto. El sidebar no recibe props
 *    ni emite eventos: se abre con `abrir_chat_whatsapp()` (mixin global) y se cierra
 *    commiteando `setSidebarAbierto`.
 *
 * 2. **Es el DUEÑO ÚNICO de la suscripción a Echo.** Antes vivía en `views/Whatsapp.vue`, y
 *    con la conversación abriéndose fuera del módulo eso significaba que estando en Clientes
 *    no había tiempo real: el mensaje entrante no aparecía ni sonaba. Se mudó acá, que es un
 *    componente siempre montado, siguiendo el patrón que ya usa
 *    `asistente-ia/FloatingButton.vue` con el canal del chat IA.
 *
 * 🔴 **La suscripción se BORRÓ de `views/Whatsapp.vue`.** No pueden convivir las dos: con la
 * vista del módulo abierta habría dos escuchas sobre el mismo canal, así que cada mensaje
 * entrante sonaría dos veces y dispararía dos `markRead`. Si alguna vez hay que verificarlo:
 *
 *     git grep -n "'whatsapp\.'" -- src/
 *
 * tiene que devolver UNA sola línea, la de este archivo: es el único lugar de la SPA que arma
 * el nombre del canal. (Grepear "whatsapp" y "Echo" juntos no sirve: da falsos positivos por
 * los comentarios y falsos negativos porque el nombre del canal viaja en una variable.)
 *
 * 🔴 **Invariante que este componente sostiene:** hay UNA sola instancia del sidebar en toda
 * la aplicación (`v-if="sidebar_abierto"` acá adentro, y este host se monta una sola vez en
 * `App.vue`). De eso depende que los tres ids de modal hardcodeados del módulo
 * —`whatsapp-templates`, `whatsapp-link-client`, `whatsapp-summary`— sigan siendo seguros:
 * con dos sidebars montados a la vez chocarían. Si alguna vez se quiere una segunda
 * instancia, primero hay que parametrizar esos ids.
 */
export default {
	components: {
		/*
			Carga diferida a propósito: el cascarón arrastra la conversación entera (header,
			mensajes, burbujas, composer y tres modales). Este host se monta en toda la
			aplicación, así que ese código no tiene por qué estar en el camino de nadie que
			nunca abra un chat.
		*/
		WhatsappSidebar: () => import('@/components/whatsapp/sidebar/Index'),
	},
	data() {
		return {
			// Nombre del canal `whatsapp.*` al que estamos suscritos ahora (null = ninguno).
			// Se guarda para poder hacer Echo.leave al cambiar de persona o perder la extensión.
			whatsapp_echo_channel: null,
			// true una vez enganchado el listener de reconexión de Echo (se engancha una sola vez).
			reconexion_de_whatsapp_enganchada: false,
			// true cuando Echo ya estuvo conectado alguna vez: distingue la primera conexión
			// (no hay nada que recuperar) de una reconexión real.
			echo_de_whatsapp_ya_estuvo_conectado: false,
		}
	},
	computed: {
		/**
		 * Solo con sesión iniciada y el módulo habilitado. El `v-if` va en la raíz del
		 * template y no en `App.vue` para que el componente se instancie siempre: así los
		 * `watch` de abajo pueden reaccionar cuando la extensión o el usuario resuelven
		 * después del arranque (es el mismo motivo por el que lo hace así el FAB del
		 * asistente IA).
		 */
		should_show() {
			return this.authenticated && this.hasExtencion('whatsapp')
		},
		sidebar_abierto() {
			return this.$store.state.whatsapp_chat.sidebar_abierto
		},
	},
	mounted() {
		this.suscribir_canal_de_whatsapp()
		/*
			Config del bot (personalidad, habilidades, toggles como chat_simulation_enabled):
			se pide aca y no en views/Whatsapp.vue porque la conversacion se abre desde
			Clientes, Pedidos y Compradores sin pasar nunca por el modulo (ver el docblock
			de arriba). Sin esto, el boton "Simular mensaje" de Composer.vue leia siempre
			config == null fuera del modulo, aunque el toggle estuviera prendido en la
			base, porque nada disparaba la carga. Guard igual al de sidebar/Index.vue con
			whatsapp_template: no pedirla de nuevo si ya esta.
		*/
		if (!this.$store.state.whatsapp_bot_config.models.length) {
			this.$store.dispatch('whatsapp_bot_config/getModels')
		}
	},
	beforeDestroy() {
		if (this.whatsapp_echo_channel && this.Echo) {
			this.Echo.leave(this.whatsapp_echo_channel)
			this.whatsapp_echo_channel = null
		}
	},
	watch: {
		/**
		 * Tras `auth/me`, o al cambiar de persona en la misma pestaña, se re-suscribe al canal
		 * del owner que corresponda.
		 */
		'user.id'() {
			this.suscribir_canal_de_whatsapp()
		},
		/**
		 * La extensión puede resolverse después del arranque: cuando el módulo aparece o
		 * desaparece, la suscripción lo sigue.
		 */
		should_show() {
			this.suscribir_canal_de_whatsapp()
		},
	},
	methods: {
		/**
		 * Se suscribe al canal privado `whatsapp.{owner_id}` (evento `WhatsappChatUpdated`).
		 *
		 * 🔴 El `Echo.leave` va ANTES del corte por "no hay canal nuevo": si en la misma
		 * pestaña entra otra persona, o se pierde la extensión, el canal anterior no puede
		 * quedar vivo escuchando conversaciones de otro negocio.
		 */
		suscribir_canal_de_whatsapp() {
			if (!this.Echo) {
				return
			}
			let canal = (this.should_show && this.owner_id)
				? 'whatsapp.' + this.owner_id
				: null
			// Guarda de doble suscripción: los dos watch de arriba se pueden disparar varias
			// veces en la misma sesión y terminar pidiendo el mismo canal.
			if (this.whatsapp_echo_channel === canal) {
				return
			}
			if (this.whatsapp_echo_channel) {
				this.Echo.leave(this.whatsapp_echo_channel)
			}
			this.whatsapp_echo_channel = canal
			if (!canal) {
				return
			}
			/*
				Va con `.listen('.WhatsappChatUpdated')`, CON el punto inicial: es un Event con
				broadcastAs, no una notificación de Laravel. Un `.notification()` acá no
				recibiría nada nunca y sin ningún error a la vista.
			*/
			this.Echo.private(canal)
			.listen('.WhatsappChatUpdated', (payload) => {
				this.on_whatsapp_chat_updated(payload)
			})

			this.escuchar_reconexion_de_echo_de_whatsapp()
		},
		/**
		 * Refleja en vivo lo que llega por el canal: nuevos mensajes entrantes, respuestas de
		 * la IA o de otro empleado, y cambios de estado de entrega (checks). La bandeja se
		 * actualiza siempre; la conversación, solo si es la que se está mirando.
		 *
		 * @param {Object} payload { chat, chat_id, message }
		 */
		on_whatsapp_chat_updated(payload) {
			if (!payload || !payload.chat) {
				return
			}

			// Actualiza (sin pisar props que este payload liviano no trae) la fila de la bandeja.
			this.$store.commit('whatsapp_chat/patchChatFromBroadcast', payload.chat)

			let state = this.$store.state.whatsapp_chat

			/*
				🔴 "El chat está abierto" ahora exige que el sidebar esté abierto, y no alcanza
				con que `selected_chat_id` coincida. Antes esto vivía en la vista del módulo, y
				estar en la vista ya implicaba estar viendo la conversación. Ahora la selección
				sobrevive al cierre del sidebar (es el chat en el que quedó parado), así que sin
				esta condición un entrante de ese chat se marcaría leído sin que nadie lo haya
				visto, y se agregaría a un array de mensajes que no se está mostrando.
			*/
			let is_open_chat = state.sidebar_abierto
				&& state.selected_chat_id
				&& state.selected_chat_id == payload.chat_id

			if (!payload.message) {
				return
			}

			if (is_open_chat) {
				// Si el mensaje ya está en la conversación (ej: lo mandó este mismo operador y
				// ya se agregó en el .then() del envío), se actualiza en vez de duplicar.
				let already_loaded = state.messages.some(m => m.id == payload.message.id)
				if (already_loaded) {
					this.$store.commit('whatsapp_chat/patchMessage', payload.message)
				} else {
					this.$store.commit('whatsapp_chat/appendMessage', payload.message)
					// Sonido corto solo para mensajes entrantes del cliente.
					if (payload.message.direction == 'in') {
						this.playIncomingSound()
					}
				}
				this.$store.dispatch('whatsapp_chat/markRead', payload.chat_id)
			} else if (payload.message.direction == 'in') {
				this.playIncomingSound()
			}
		},
		/**
		 * Vuelve a pedir la bandeja (y la conversación abierta) cada vez que Echo se reconecta:
		 * los eventos que ocurrieron con la conexión caída no se reenvían solos, así que sin
		 * esto un mensaje que entró durante el corte no aparece hasta recargar la pantalla.
		 *
		 * Réplica local de `escuchar_reconexion_de_echo` de `mixins/broadcast.js`, que no se
		 * toca porque al reconectar dispara cosas de pedidos que no tienen nada que ver.
		 */
		escuchar_reconexion_de_echo_de_whatsapp() {
			if (this.reconexion_de_whatsapp_enganchada) {
				return
			}
			// El conector de Pusher lo expone Echo (config de main.js). Se chequea en vez de
			// asumirlo: si cambia el broadcaster, solo se pierde este refresco.
			if (!this.Echo.connector || !this.Echo.connector.pusher || !this.Echo.connector.pusher.connection) {
				return
			}
			let connection = this.Echo.connector.pusher.connection
			// Si ya está conectado cuando nos enganchamos (lo normal: Echo conecta en main.js
			// mucho antes de resolver la sesión), cualquier 'connected' posterior ES una
			// reconexión.
			this.echo_de_whatsapp_ya_estuvo_conectado = connection.state == 'connected'
			this.reconexion_de_whatsapp_enganchada = true
			connection.bind('connected', () => {
				if (!this.echo_de_whatsapp_ya_estuvo_conectado) {
					this.echo_de_whatsapp_ya_estuvo_conectado = true
					return
				}
				let state = this.$store.state.whatsapp_chat
				this.$store.dispatch('whatsapp_chat/getChats')
				if (state.sidebar_abierto && state.selected_chat_id) {
					// `silent` para que la conversación no parpadee a "Cargando mensajes..." por
					// una recarga que el operador ni pidió.
					this.$store.dispatch('whatsapp_chat/getMessages', {
						chat_id: state.selected_chat_id,
						page: 1,
						silent: true,
					})
				}
			})
		},
		/**
		 * Sonido corto para avisar de un mensaje entrante nuevo. Se sintetiza con Web Audio API
		 * (un "beep" corto) en vez de cargar un archivo de audio propio, para no depender de un
		 * asset nuevo. Si el navegador no soporta AudioContext o bloquea el autoplay, falla en
		 * silencio: no es una funcionalidad crítica del módulo.
		 */
		playIncomingSound() {
			try {
				let AudioContextClass = window.AudioContext || window.webkitAudioContext
				if (!AudioContextClass) {
					return
				}
				let audio_context = new AudioContextClass()
				let oscillator = audio_context.createOscillator()
				let gain = audio_context.createGain()
				oscillator.type = 'sine'
				oscillator.frequency.value = 880
				gain.gain.setValueAtTime(0.15, audio_context.currentTime)
				gain.gain.exponentialRampToValueAtTime(0.0001, audio_context.currentTime + 0.25)
				oscillator.connect(gain)
				gain.connect(audio_context.destination)
				oscillator.start()
				oscillator.stop(audio_context.currentTime + 0.25)
			} catch (e) {
				// Sin sonido disponible: no es bloqueante para el módulo.
			}
		},
	},
}
</script>
