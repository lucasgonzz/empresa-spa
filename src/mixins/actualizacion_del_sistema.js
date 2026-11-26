/**
 * Mixin de App.vue del aviso de actualización del sistema (misión aviso-actualizacion-sistema,
 * 25/11/2026).
 *
 * Mantiene al día el estado del pedido de OK mientras hay sesión, por dos caminos que se respaldan:
 *  - el canal público `actualizacion_del_sistema.{owner_id}` (evento `.ActualizacionDelSistemaCambio`):
 *    llega al instante, pero depende de Pusher;
 *  - un polling cada 60 s a `GET api/actualizacion-del-sistema/estado`, que además es el que le dice
 *    a la API qué computadoras están conectadas (presencia, plan §2.3).
 * Cualquier aviso del canal se resuelve preguntándole a la API (`consultar`): el payload no trae lo
 * que esta computadora contestó, y si el estado pasó a `actualizando` esa misma consulta recibe la
 * marca 503 y el interceptor de main.js cierra la sesión y manda al login.
 *
 * `escuchar_actualizacion_del_sistema()` se llama desde `listenChannelsLocal()` (mixins/broadcast.js),
 * o sea sólo con la sesión confirmada por el servidor (no con la restaurada sin conexión).
 */

/** Cada cuántos milisegundos se pregunta el estado (y se registra la presencia). */
const INTERVALO_DE_CONSULTA_MS = 60000

export default {
	data() {
		return {
			/** Id del `setInterval` del polling (null si no está corriendo). */
			actualizacion_timer: null,
			/** Nombre del canal suscrito, para no suscribirse dos veces y poder dejarlo. */
			actualizacion_echo_channel: null,
		}
	},
	computed: {
		/**
		 * Cuántas veces el servidor dijo que el pedido se rechazó o se canceló (ver `cancelaciones` en el store).
		 *
		 * @returns {Number}
		 */
		actualizacion_cancelaciones() {
			return this.$store.state.actualizacion_del_sistema.cancelaciones
		},
	},
	watch: {
		/**
		 * Sin sesión no hay presencia que registrar ni pedido que contestar: se corta todo. El bloqueo del
		 * store NO se toca (lo necesita la pantalla de ingreso).
		 *
		 * @param {Boolean} autenticado
		 * @returns {void}
		 */
		authenticated(autenticado) {
			if (!autenticado) {
				this.detener_actualizacion_del_sistema()
				this.$store.commit('actualizacion_del_sistema/limpiar_pedido')
			}
		},
		/**
		 * Si el SERVIDOR dice que el pedido se rechazó (alguien apretó "Ahora no") o se canceló, todas las
		 * computadoras lo cuentan con un aviso breve. Se mira un contador que sólo sube con una respuesta
		 * del servidor: ni el pase a `actualizando` (la marca cierra la sesión) ni un logout lo mueven,
		 * porque eso es un reseteo local del pedido y no una cancelación.
		 *
		 * @returns {void}
		 */
		actualizacion_cancelaciones() {
			this.$toast.info('La actualización se pasó para la noche.')
		},
	},
	beforeDestroy() {
		this.detener_actualizacion_del_sistema()
	},
	methods: {
		/**
		 * Arranca el polling y se suscribe al canal en vivo del dueño. Es idempotente: `listenChannelsLocal`
		 * corre en cada cambio de `authenticated` y no tiene que duplicar ni el timer ni la escucha.
		 *
		 * @returns {void}
		 */
		escuchar_actualizacion_del_sistema() {
			var self = this

			// Polling: una consulta ya, y después una por minuto.
			if (this.actualizacion_timer === null) {
				this.$store.dispatch('actualizacion_del_sistema/consultar')
				this.actualizacion_timer = window.setInterval(function () {
					self.consultar_actualizacion_del_sistema()
				}, INTERVALO_DE_CONSULTA_MS)
			}

			// Canal en vivo: sin Echo o sin dueño sólo queda el polling.
			if (!this.Echo || !this.owner_id) {
				return
			}
			/** Canal público del comercio, igual que article_embeddings.{id}. */
			const canal = 'actualizacion_del_sistema.' + this.owner_id
			if (this.actualizacion_echo_channel === canal) {
				return
			}
			// El leave va ANTES de asignar el canal nuevo: si en la misma pestaña entra un usuario de otro
			// comercio, la suscripción anterior le mostraría avisos del comercio de antes.
			if (this.actualizacion_echo_channel) {
				this.Echo.leave(this.actualizacion_echo_channel)
			}
			this.actualizacion_echo_channel = canal

			// Evento de `ShouldBroadcastNow` con broadcastAs: se escucha con .listen('.Nombre').
			this.Echo.channel(canal)
			.listen('.ActualizacionDelSistemaCambio', function () {
				self.consultar_actualizacion_del_sistema()
			})
		},
		/**
		 * Una vuelta del polling: pregunta el estado mientras haya sesión y la API tenga el aviso. Con una
		 * API sin soporte (404) el timer se apaga solo.
		 *
		 * @returns {void}
		 */
		consultar_actualizacion_del_sistema() {
			if (!this.authenticated) {
				return
			}
			if (this.$store.state.actualizacion_del_sistema.sin_soporte) {
				this.detener_actualizacion_del_sistema()
				return
			}
			this.$store.dispatch('actualizacion_del_sistema/consultar')
		},
		/**
		 * Apaga el polling y deja el canal en vivo.
		 *
		 * @returns {void}
		 */
		detener_actualizacion_del_sistema() {
			if (this.actualizacion_timer !== null) {
				window.clearInterval(this.actualizacion_timer)
				this.actualizacion_timer = null
			}
			if (this.Echo && this.actualizacion_echo_channel) {
				this.Echo.leave(this.actualizacion_echo_channel)
			}
			this.actualizacion_echo_channel = null
		},
	},
}
