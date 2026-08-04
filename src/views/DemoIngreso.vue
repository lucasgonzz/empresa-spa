<template>
	<div class="demo-ingreso">
		<!-- Estado por defecto: se está canjeando el token contra el backend. -->
		<div
			v-if="estado === 'cargando'"
			class="demo-ingreso__pantalla"
		>
			<div class="demo-ingreso__spinner"></div>
			<p class="demo-ingreso__texto">Preparando tu demo...</p>
		</div>
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

export default {
	mixins: [generals, permissions],
	data() {
		return {
			// 'cargando' mientras se canjea el token; 'error' si no hay token o el backend lo rechaza.
			estado: 'cargando',
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
				// Guarda por si el watcher de App.vue ya navegó: evita un push duplicado.
				if (self.$route.name === 'demoIngreso') {
					self.redirect()
				}
			})
			.catch(function () {
				// Cubre el 401 `token_invalido` del POST de canje.
				self.mostrar_error()
			})
	},
	methods: {
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

.demo-ingreso__spinner
	width: 36px
	height: 36px
	border-radius: 50%
	border: 3px solid #e5e7eb
	border-top-color: #007bff
	animation: demo-ingreso-spin 0.8s linear infinite
	margin-bottom: 1.25rem

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

@keyframes demo-ingreso-spin
	from
		transform: rotate(0deg)
	to
		transform: rotate(360deg)
</style>
