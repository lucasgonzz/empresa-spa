<template>
	<div
	v-if="should_show"
	class="tienda-mensajes-sidebar-host">
		<tienda-mensajes-sidebar
		v-if="sidebar_abierto"></tienda-mensajes-sidebar>
	</div>
</template>
<script>
import { escapar_html, nombre_del_comprador } from '@/components/online/components/mensajes/helpers'

/**
 * Anfitrión del submódulo "Mensajes" de Tienda Online (misión mensajes-tienda-online, 28/9/2026).
 * Se monta UNA sola vez en `App.vue` y vive en toda la aplicación, igual que
 * `whatsapp/SidebarHost.vue`, y por el mismo motivo: la conversación se abre desde el submódulo,
 * desde Clientes de Tienda Online, desde Alertas y desde el aviso de mensaje nuevo, y el mensaje
 * del comprador tiene que entrar y sonar esté donde esté el operador.
 *
 * Tres trabajos:
 *
 * 1. **Monta el sidebar** (carga diferida) cuando el store dice que está abierto.
 *
 * 2. **Es el DUEÑO ÚNICO de la suscripción en vivo** al canal privado de mensajes de la tienda
 *    del dueño (evento `TiendaChatActualizado`, contrato C1). Con la sesión iniciada ya queda
 *    escuchando: no hay polling. Si hubiera dos escuchas, cada mensaje sonaría dos veces y se
 *    contaría doble en los badges. Para verificarlo:
 *
 *        git grep -n "tienda-mensajes\." -- src/
 *
 *    tiene que devolver UNA sola línea: la de este archivo que arma el nombre del canal.
 *
 * 3. **Pide el resumen al iniciar sesión**: es lo que prende el badge de Tienda Online y el
 *    contador de Alertas desde el login, sin entrar al submódulo. Reemplaza al GET /api/buyer
 *    entero que hacía `start_methods.js` en el arranque solo para contar mensajes sin leer.
 *
 * Sumar este canal no suma conexiones a Pusher: la pestaña ya tiene la suya (Echo se crea en
 * main.js) y los canales se multiplexan adentro de esa misma conexión.
 */
export default {
	components: {
		TiendaMensajesSidebar: () => import('@/components/online/components/mensajes/sidebar/Index'),
	},
	data() {
		return {
			// Comercio (owner_id) al que corresponde lo que hay en el store; null = ninguno.
			owner_del_estado: null,
			// Canal suscripto ahora (null = ninguno). Se guarda para el Echo.leave.
			canal_suscripto: null,
			// true una vez enganchado el listener de reconexión de Echo (se engancha una sola vez).
			reconexion_enganchada: false,
			// true cuando Echo ya estuvo conectado alguna vez: distingue la primera conexión de
			// una reconexión real.
			echo_ya_estuvo_conectado: false,
		}
	},
	computed: {
		/**
		 * Sesión iniciada, extensión de tienda online y permiso sobre los compradores (el mismo
		 * que "Clientes" de Tienda Online; el `buyer.messages` que usaba el módulo viejo no existe
		 * en los seeders). El `v-if` va en la raíz del template y no en App.vue para que el
		 * componente se instancie siempre y los watch sigan a la sesión y a la extensión cuando
		 * se resuelven después del arranque.
		 */
		should_show() {
			return !!(this.authenticated && this.user && this.hasExtencion('online') && this.can('buyer.index'))
		},
		sidebar_abierto() {
			return this.$store.state.tienda_mensajes.sidebar_abierto
		},
	},
	watch: {
		owner_id() {
			this.sincronizar()
		},
		should_show() {
			this.sincronizar()
		},
	},
	mounted() {
		this.sincronizar()
		document.addEventListener('visibilitychange', this.on_visibilidad)
	},
	beforeDestroy() {
		document.removeEventListener('visibilitychange', this.on_visibilidad)
		if (this.canal_suscripto && this.Echo) {
			this.Echo.leave(this.canal_suscripto)
			this.canal_suscripto = null
		}
	},
	methods: {
		/**
		 * Pone el store y la suscripción en línea con quién está en la pestaña.
		 *
		 * 🔴 Si cambió el comercio (se cerró sesión y entró otro en la misma pestaña) o se perdió
		 * la condición, el store se vacía ANTES de suscribir: lo que hay en memoria es de otro
		 * negocio y no puede quedar a la vista ni en los badges.
		 */
		sincronizar() {
			let owner = this.should_show && this.owner_id ? this.owner_id : null
			if (owner !== this.owner_del_estado) {
				this.$store.commit('tienda_mensajes/reset')
				this.owner_del_estado = owner
				if (owner) {
					this.$store.dispatch('tienda_mensajes/getResumen')
				}
			}
			this.suscribir_canal()
		},
		/**
		 * Se suscribe al canal privado del dueño. El `Echo.leave` del canal anterior va ANTES del
		 * corte por "no hay canal nuevo": si entra otra persona en la misma pestaña, o se pierde la
		 * extensión, el canal anterior no puede quedar vivo escuchando mensajes de otro negocio.
		 */
		suscribir_canal() {
			if (!this.Echo) {
				return
			}
			let canal = this.owner_del_estado ? 'tienda-mensajes.' + this.owner_del_estado : null
			// Guarda de doble suscripción: los dos watch pueden dispararse varias veces en la
			// misma sesión y terminar pidiendo el mismo canal.
			if (this.canal_suscripto === canal) {
				return
			}
			if (this.canal_suscripto) {
				this.Echo.leave(this.canal_suscripto)
			}
			this.canal_suscripto = canal
			if (!canal) {
				return
			}
			/*
				🔴 `.listen('.TiendaChatActualizado')`, CON el punto inicial: es un Event con
				broadcastAs(), no una notificación de Laravel. Un `.notification()` acá no recibiría
				nada nunca, sin ningún error a la vista.
			*/
			this.Echo.private(canal)
			.listen('.TiendaChatActualizado', (payload) => {
				this.on_tienda_chat_actualizado(payload)
			})
			this.escuchar_reconexion()
		},
		/**
		 * Aplica el evento en el store y, si es un mensaje nuevo del comprador, avisa: si esa
		 * conversación está abierta (y la pestaña se está viendo) la marca leída; si no, suena y
		 * muestra un aviso que la abre al hacerle clic.
		 *
		 * @param {Object} payload Contrato C1.
		 */
		on_tienda_chat_actualizado(payload) {
			let self = this
			this.$store.dispatch('tienda_mensajes/aplicarBroadcast', payload)
			.then(function (resultado) {
				if (!resultado || !resultado.mensaje_nuevo_del_comprador) {
					return
				}
				if (resultado.conversacion_abierta && self.pestana_visible()) {
					self.$store.dispatch('tienda_mensajes/marcarLeido', payload.buyer_id)
					return
				}
				self.sonar_mensaje_entrante()
				if (!resultado.conversacion_abierta) {
					self.avisar_mensaje_entrante(payload.buyer_id, resultado.buyer)
				}
			})
			.catch(function (err) {
				console.log(err)
			})
		},
		/**
		 * Toast "Nuevo mensaje de {nombre}" que abre la conversación al hacerle clic.
		 *
		 * 🔴 El nombre va escapado: el plugin de toasts dibuja el mensaje con `v-html`, y el
		 * nombre lo escribe el propio comprador en la tienda.
		 *
		 * @param {Number} buyer_id
		 * @param {Object|null} buyer
		 */
		avisar_mensaje_entrante(buyer_id, buyer) {
			let self = this
			let nombre = nombre_del_comprador(buyer, buyer_id)
			this.$toast.info('Nuevo mensaje de <strong>' + escapar_html(nombre) + '</strong> en la tienda', {
				duration: 7000,
				onClick: function () {
					self.abrir_chat_tienda(Object.assign({}, buyer || {}, { id: buyer_id }))
				},
			})
		},
		/**
		 * @returns {Boolean} true si la pestaña está a la vista (o si el navegador no lo sabe decir).
		 */
		pestana_visible() {
			return typeof document.visibilityState == 'undefined' || document.visibilityState == 'visible'
		},
		/**
		 * La pestaña vuelve a verse con la conversación abierta y algo sin leer (entró mientras
		 * estaba en otra pestaña): ahora sí alguien lo está viendo, se marca leído.
		 */
		on_visibilidad() {
			if (!this.pestana_visible()) {
				return
			}
			let state = this.$store.state.tienda_mensajes
			if (!state.sidebar_abierto || !state.selected_buyer_id) {
				return
			}
			let fila = this.$store.getters['tienda_mensajes/fila_de'](state.selected_buyer_id)
			if (fila && parseInt(fila.unread_count, 10) > 0) {
				this.$store.dispatch('tienda_mensajes/marcarLeido', state.selected_buyer_id)
			}
		},
		/**
		 * Al reconectar Echo se vuelve a pedir lo que se pudo haber perdido: los eventos que pasaron
		 * con la conexión caída no se reenvían solos. El resumen siempre; la bandeja y la
		 * conversación abierta solo si alguien las está usando, y en silencio (sin "Cargando...").
		 *
		 * Réplica local de la técnica de `whatsapp/SidebarHost.vue`
		 * (`escuchar_reconexion_de_echo_de_whatsapp`).
		 */
		escuchar_reconexion() {
			if (this.reconexion_enganchada) {
				return
			}
			if (!this.Echo.connector || !this.Echo.connector.pusher || !this.Echo.connector.pusher.connection) {
				return
			}
			let self = this
			let connection = this.Echo.connector.pusher.connection
			// Si ya está conectado al engancharse (lo normal: Echo conecta en main.js mucho antes de
			// que resuelva la sesión), cualquier 'connected' posterior ES una reconexión.
			this.echo_ya_estuvo_conectado = connection.state == 'connected'
			this.reconexion_enganchada = true
			connection.bind('connected', function () {
				if (!self.echo_ya_estuvo_conectado) {
					self.echo_ya_estuvo_conectado = true
					return
				}
				if (!self.canal_suscripto) {
					return
				}
				self.refrescar_tras_reconexion()
			})
		},
		refrescar_tras_reconexion() {
			let state = this.$store.state.tienda_mensajes
			this.$store.dispatch('tienda_mensajes/getResumen')
			if (state.chats_cargados) {
				this.$store.dispatch('tienda_mensajes/getChats', { page: 1, silent: true })
			}
			if (state.chats_no_leidos_cargados) {
				this.$store.dispatch('tienda_mensajes/getChatsNoLeidos')
			}
			if (state.sidebar_abierto && state.selected_buyer_id) {
				this.$store.dispatch('tienda_mensajes/getMessages', {
					buyer_id: state.selected_buyer_id,
					page: 1,
					silent: true,
				})
				.catch(function (err) {
					console.log(err)
				})
			}
		},
		/**
		 * Sonido corto de mensaje entrante, sintetizado con Web Audio (copiado de
		 * `whatsapp/SidebarHost.vue`, `playIncomingSound`) para no depender de un archivo propio.
		 * Si el navegador no lo soporta o bloquea el audio, falla en silencio.
		 */
		sonar_mensaje_entrante() {
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
				// Cada aviso crea su contexto de audio: se cierra al terminar el pitido para no
				// acumular contextos abiertos en una sesión larga (Chrome limita cuántos puede haber).
				oscillator.onended = function () {
					if (audio_context.close) {
						audio_context.close()
					}
				}
			} catch (e) {
				// Sin sonido disponible: no es bloqueante.
			}
		},
	},
}
</script>
