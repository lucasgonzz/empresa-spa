<template>
	<div class="demo-ingreso">
		<!--
			Estado por defecto: se está canjeando el token y esperando el plan del panel.
			La pantalla de espera es el LogoLoading global (App.vue), que se prende con
			auth/setLoading: acá abajo solo queda el lienzo blanco que evita que se vea el
			sistema a medio dibujar detrás del vidrio esmerilado del overlay.
		-->
		<div
			v-if="estado === 'cargando'"
			class="demo-ingreso__pantalla"
		></div>
		<!-- Estado de error: sin token en la URL, o token inválido/expirado (401 del backend). -->
		<!-- Mismo tratamiento visual para ambos casos: no hay que distinguirle al lead un error técnico. -->
		<div
			v-else
			class="demo-ingreso__pantalla"
		>
			<p class="demo-ingreso__texto demo-ingreso__texto--error">
				Este acceso a la demo ya no está disponible.
			</p>
			<p class="demo-ingreso__subtexto">
				Escribinos por WhatsApp y te reenviamos el link.
			</p>
		</div>
	</div>
</template>
<script>
// Mixins compartidos: generals aporta los computed `authenticated`/`user`/`is_owner`/etc,
// permissions aporta `redirect()` (misma resolución de home real que usa el resto del sistema).
// A propósito NO se importa el mixin `app` (arrastra broadcast/update_app/offline: no aplica acá).
import generals from '@/common-vue/mixins/generals'
import permissions from '@/common-vue/mixins/permissions'

/**
 * 🔴 Techo de espera del plan, en milisegundos.
 *
 * Sin techo, una red colgada deja al lead mirando el overlay para siempre, y eso es una demo
 * perdida: entrar sin panel es molesto, no entrar nunca es fatal. El techo tiene que cubrir el
 * caso de la red colgada y no solo el del error, porque `demo/cargar_plan` NUNCA rechaza (se
 * traga el error adentro y deja las secciones vacías), así que un fallo limpio resuelve solo.
 *
 * 4 segundos: el plan normalmente vuelve en unos cientos de milisegundos, así que este número no
 * se toca en el camino feliz. Es el corte para el camino malo.
 */
const TECHO_ESPERA_PLAN = 4000

export default {
	mixins: [generals, permissions],
	data() {
		return {
			// 'cargando' mientras se canjea el token; 'error' si no hay token o el backend lo rechaza.
			estado: 'cargando',
			// Handle del techo de espera, para poder limpiarlo si el plan llega primero.
			temporizador_techo: null,
		}
	},
	mounted() {
		var self = this

		// Token de acceso a la demo recibido en la query string del link (?t=...).
		const token = this.$route.query.t

		if (!token) {
			this.mostrar_error()
			return
		}

		// Patrón obligatorio del repo para estados de carga: el overlay global LogoLoading, que
		// ya vive en App.vue y lee auth.loading + auth.message. Se apaga en el .then Y en el
		// .catch (el .then final de abajo cubre las dos ramas): si quedara prendido, el lead se
		// come un vidrio esmerilado encima del sistema sin forma de sacárselo.
		this.prender_espera()

		this.$axios.get('/sanctum/csrf-cookie')
			.then(function () {
				// Canjea el token de la demo por una sesión iniciada (setea la cookie de sesión).
				return self.$axios.post('/api/demo/ingreso', { t: token })
			})
			.then(function () {
				// Se reusa la acción existente para cargar el usuario autenticado: con el
				// `return` agregado en auth.js, este `.then()` ahora sí espera a que termine.
				return self.$store.dispatch('auth/me')
			})
			.then(function () {
				// `auth/me` nunca rechaza (se traga el error adentro), asi que decidimos por el estado.
				if (!self.authenticated) {
					self.mostrar_error()
					return
				}
				// Marcador de sesion de demo (mision 51). Esta es la UNICA puerta de entrada a
				// una demo, asi que es el unico lugar donde se prende: mientras siga apagado,
				// App.vue no monta el panel y nadie pide el plan. Un cliente real nunca pasa
				// por aca, y por eso su arranque no agrega ni una llamada.
				self.$store.commit('demo/setEsDemo', true)

				// 🔴 `auth/me` apaga el overlay por su cuenta cuando termina (auth.js lo
				// maneja adentro), así que hay que volver a prenderlo para cubrir la espera
				// del plan. Sin esto el lead se come una pantalla en blanco y sin mensaje
				// justo en el tramo final del ingreso. Prender y apagar caen en el mismo tick
				// de Vue, así que el overlay no llega a parpadear.
				self.prender_espera()

				// Recién ahora `demo/activa` da true, así que el plan ya se puede pedir.
				return self.esperar_plan()
					.then(function () {
						// Guarda por si el watcher de App.vue ya navegó: evita un push duplicado.
						if (self.$route.name === 'demoIngreso') {
							self.redirect()
						}
					})
			})
			.catch(function () {
				// Cubre el 401 `token_invalido` del POST de canje.
				self.mostrar_error()
			})
			.then(function () {
				self.apagar_espera()
			})
	},
	beforeDestroy() {
		// El redirect destruye esta vista: sin esto queda un setTimeout apuntando a un
		// componente muerto.
		this.limpiar_techo()
	},
	methods: {
		/**
		 * Espera a que el plan del panel esté cargado, con techo de tiempo.
		 *
		 * El plan se despacha desde acá —y no se espera a que lo pida el panel al montarse—
		 * para poder engancharse a la promesa. El store memoriza el pedido, así que el panel
		 * reusa esta misma llamada y no se paga un segundo GET.
		 *
		 * @returns {Promise} Resuelve cuando el plan llegó, o cuando se agotó el techo.
		 */
		esperar_plan() {
			let self = this

			const plan = this.$store.dispatch('demo/cargar_plan')

			const techo = new Promise(function (resolver) {
				self.temporizador_techo = setTimeout(resolver, TECHO_ESPERA_PLAN)
			})

			return Promise.race([plan, techo])
				.then(function () {
					self.limpiar_techo()
				})
		},
		/**
		 * Prende el overlay global con el mensaje del ingreso.
		 *
		 * @returns {void}
		 */
		prender_espera() {
			this.$store.commit('auth/setMessage', 'Preparando tu demo')
			this.$store.commit('auth/setLoading', true)
		},
		/**
		 * Apaga el overlay global. Va en las dos ramas del flujo: si se muestra la pantalla de
		 * error con el overlay prendido, el lead no llega a leerla.
		 *
		 * @returns {void}
		 */
		apagar_espera() {
			this.$store.commit('auth/setLoading', false)
			this.$store.commit('auth/setMessage', '')
		},
		/**
		 * @returns {void}
		 */
		limpiar_techo() {
			if (this.temporizador_techo) {
				clearTimeout(this.temporizador_techo)
				this.temporizador_techo = null
			}
		},
		/**
		 * Cambia el estado visual a la pantalla de error (token ausente o inválido).
		 *
		 * @returns {void}
		 */
		mostrar_error() {
			this.estado = 'error'
		},
	},
}
</script>
<style lang="sass">
.demo-ingreso
	display: flex
	align-items: center
	justify-content: center
	min-height: 100vh
	background: #ffffff

.demo-ingreso__pantalla
	display: flex
	flex-direction: column
	align-items: center
	justify-content: center
	text-align: center
	padding: 2rem

.demo-ingreso__texto
	font-size: 1rem
	font-weight: 500
	color: #111827
	margin: 0

.demo-ingreso__texto--error
	font-size: 1.125rem
	font-weight: 600
	margin-bottom: 0.5rem

.demo-ingreso__subtexto
	font-size: 0.9375rem
	color: #6b7280
	margin: 0
</style>
