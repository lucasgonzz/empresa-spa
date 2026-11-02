<template>
	<div class="acceso-soporte">
		<!--
			Mientras se canjea el token, esta vista NO dibuja nada: la pantalla de espera es el
			LogoLoading global (App.vue), que se prende con auth/setLoading y lee auth/setMessage.

			Lo único que aporta la vista en ese tramo es el blanco de fondo, que pinta
			`.acceso-soporte` (min-height: 100vh) y que se ve a través del overlay, que es un vidrio
			esmerilado translúcido y no una capa opaca. Mismo patrón que DemoIngreso.vue.
		-->
		<!-- Estado de error: sin token en la dirección, o token inválido/vencido/ya usado (401 del backend). -->
		<!--
			Mismo texto para todos los casos, a propósito: el backend responde SIEMPRE el mismo 401
			`token_invalido` sin decir cuál fue el motivo, y la pantalla tampoco lo distingue. Quien
			llega acá es un agente o alguien de soporte que lo único que puede hacer es pedir otro.
		-->
		<div
			v-if="estado === 'error'"
			class="acceso-soporte__pantalla"
		>
			<p class="acceso-soporte__texto acceso-soporte__texto--error">
				Este acceso de soporte ya no está disponible.
			</p>
			<p class="acceso-soporte__subtexto">
				Pedí uno nuevo.
			</p>
		</div>
	</div>
</template>
<script>
// Mixins compartidos: generals aporta los computed `authenticated`/`user`/etc, permissions aporta
// `redirect()` (misma resolución de home real que usa el resto del sistema).
// A propósito NO se importa el mixin `app` (arrastra broadcast/update_app/offline: no aplica acá;
// App.vue ya lo trae para todo el sistema). Igual que DemoIngreso.vue.
import generals from '@/common-vue/mixins/generals'
import permissions from '@/common-vue/mixins/permissions'
import { leer_token_de_acceso_soporte, direccion_sin_token } from '@/utils/acceso_soporte'

/**
 * Ingreso con acceso de soporte (misión acceso-soporte-firmado, 30/10/2026).
 *
 * Es la puerta por la que entra al sistema de un cliente un agente (Claude Code, Codex) o alguien
 * de soporte, SIN contraseña y sin que el dueño haga nada. El token lo emite el admin (que se
 * lo pide al empresa-api del cliente firmando con su clave compartida) y es de UN solo uso, con
 * 120 segundos de vida. Esta vista solo lo canjea por una sesión:
 *
 *   GET  /sanctum/csrf-cookie
 *   POST /api/acceso-soporte/canjear  { t: <token> }  ->  200 { ok: true } | 401 { error: 'token_invalido' }
 *   auth/me                                            ->  carga el usuario autenticado
 *
 * La estructura es la de DemoIngreso.vue, sin nada de demo: ni marcador `demo/setEsDemo`, ni
 * espera del plan, ni techo de tiempo. La sesión que queda es la del DUEÑO del sistema, con el
 * candado de sesión única sin tocar (lo resuelve el backend) y marcada como sesión de soporte
 * (`user.es_sesion_soporte`).
 */
export default {
	mixins: [generals, permissions],
	data() {
		return {
			// 'cargando' mientras se canjea el token; 'error' si no hay token o el backend lo rechaza.
			estado: 'cargando',
		}
	},
	/*
		Se arranca en `created()` y no en `mounted()` (como hace DemoIngreso.vue) porque el token es
		una credencial viva (vale 120 s) y cuanto antes salga de la barra, mejor. Lo que SÍ importa
		de verdad es el orden de adentro: primero se saca de la barra, después se toca la red.
	*/
	created() {
		var self = this

		// Token del acceso: viene en el fragmento (`#t=`) o, por tolerancia, en la query (`?t=`).
		const token = leer_token_de_acceso_soporte(window.location.hash, window.location.search)

		// 🔴 El token se saca de la barra ANTES de cualquier pedido de red, y en todos los casos
		// (haya token o no, vaya a salir bien o mal). Si se dejara para después del canje:
		//   - un pedido que se cuelga o falla lo dejaría a la vista (y 120 s de credencial viva);
		//   - quedaría en el historial del navegador, recuperable con Atrás o con el autocompletado;
		//   - se vería en pantalla en cualquier captura o pantalla compartida durante el ingreso.
		// El fragmento ya no viaja al servidor (por eso es fragmento y no query), pero la barra y
		// el historial son del navegador y hay que limpiarlos igual.
		this.sacar_token_de_la_barra()

		if (!token) {
			this.mostrar_error()
			return
		}

		// Patrón obligatorio del repo para estados de carga: el overlay global LogoLoading, que
		// ya vive en App.vue y lee auth.loading + auth.message. Se apaga SIEMPRE en el `.then`
		// final de abajo (cubre éxito y error): si quedara prendido, quien llega se come un vidrio
		// esmerilado encima de la pantalla de error sin forma de sacárselo.
		this.prender_espera()

		this.$axios.get('/sanctum/csrf-cookie')
			.then(function () {
				// Canjea el token por una sesión iniciada (el backend setea la cookie de sesión).
				// Un 401 rechaza esta promesa y cae en el `.catch` de abajo.
				return self.$axios.post('/api/acceso-soporte/canjear', { t: token })
			})
			.then(function () {
				// Se reusa la acción existente para cargar el usuario autenticado. Este `.then()`
				// espera de verdad porque la acción devuelve su cadena de promesas.
				//
				// 🔴 El archivo es `src/store/auth.js`, que es el que `src/store/index.js`
				// registra bajo el namespace `auth`. Hay un segundo `auth.js` en
				// `src/common-vue/store/` que NO importa nadie en este repo: decir "auth.js" a
				// secas ya hizo que dos revisiones diagnosticaran sobre el archivo equivocado.
				return self.$store.dispatch('auth/me')
			})
			.then(function () {
				// `auth/me` nunca rechaza (se traga el error adentro), así que se decide por el
				// estado: si el canje dijo 200 pero la sesión no quedó, es un error igual.
				if (!self.authenticated) {
					self.mostrar_error()
					return
				}

				// Guarda por si el watcher de App.vue ya navegó (`authenticated` pasa a true y
				// arranca la sesión, que lleva a la pantalla de inicio): evita un push duplicado.
				if (self.$route.name === 'accesoSoporte') {
					self.redirect()
				}
			})
			.catch(function () {
				// Cubre el 401 `token_invalido` del POST de canje, y cualquier falla de red o de
				// `sanctum/csrf-cookie`. No se distingue el motivo (ver el comentario del template).
				self.mostrar_error()
			})
			.then(function () {
				self.apagar_espera()
			})
	},
	methods: {
		/**
		 * Deja la barra de direcciones (y la entrada actual del historial) sin el token.
		 *
		 * `replaceState` y no `push`: reemplaza la entrada actual, así que Atrás no devuelve a una
		 * dirección con el token. El primer argumento es `null` y no `{}` porque no hay estado que
		 * conservar. No dispara navegación del router ni recarga la página.
		 *
		 * Se conserva la ruta y el resto de la query (ver `direccion_sin_token`); el fragmento se
		 * va entero.
		 *
		 * @returns {void}
		 */
		sacar_token_de_la_barra() {
			window.history.replaceState(
				null,
				'',
				direccion_sin_token(window.location.pathname, window.location.search)
			)
		},
		/**
		 * Prende el overlay global con el mensaje del ingreso.
		 *
		 * @returns {void}
		 */
		prender_espera() {
			this.$store.commit('auth/setMessage', 'Entrando con acceso de soporte')
			this.$store.commit('auth/setLoading', true)
		},
		/**
		 * Apaga el overlay global. Va en las dos ramas del flujo: si se muestra la pantalla de
		 * error con el overlay prendido, no se llega a leer.
		 *
		 * @returns {void}
		 */
		apagar_espera() {
			this.$store.commit('auth/setLoading', false)
			this.$store.commit('auth/setMessage', '')
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
// Mismo patrón visual que la pantalla de error de DemoIngreso.vue, con prefijo propio.
.acceso-soporte
	display: flex
	align-items: center
	justify-content: center
	min-height: 100vh
	background: var(--bg-card, #ffffff)

.acceso-soporte__pantalla
	display: flex
	flex-direction: column
	align-items: center
	justify-content: center
	text-align: center
	padding: 2rem

.acceso-soporte__texto
	font-size: 1rem
	font-weight: 500
	color: var(--color-text-primary, #111827)
	margin: 0

.acceso-soporte__texto--error
	font-size: 1.125rem
	font-weight: 600
	margin-bottom: 0.5rem

.acceso-soporte__subtexto
	font-size: 0.9375rem
	color: var(--color-text-secondary, #6b7280)
	margin: 0
</style>
