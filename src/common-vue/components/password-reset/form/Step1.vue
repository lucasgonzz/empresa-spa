<template>
<div
v-if="view == 'email'">
	<b-form-group
	label="Ingresá el correo del dueño de la cuenta y te enviamos un código de recuperación.">
		<b-form-input
		v-model="register_user.email"
		type="email"
		autocomplete="email"
		@keyup.enter="sendCode"
		placeholder="Correo electrónico del dueño"></b-form-input>
	</b-form-group>
	<p
	class="text-muted small text-left">
		Solo el dueño puede recuperar la contraseña por acá. Si sos empleado, pedile al dueño que te la cambie desde el módulo de empleados.
	</p>
	<btn-loader
	@clicked="sendCode"
	text="Enviar código"
	:loader="loading"></btn-loader>
	<b-button
	:to="{name: 'login'}"
	block
	variant="outline-primary">
		Regresar
	</b-button>
</div>
</template>
<script>
import BtnLoader from '@/common-vue/components/BtnLoader'
export default {
	props: {
		register_user: Object,
	},
	components: {
		BtnLoader
	},
	data() {
		return {
			loading: false
		}
	},
	methods: {
		/**
		 * Pide el código de verificación al correo.
		 *
		 * Manda `longitud_del_codigo: 4` para pedir un código de 4 dígitos. Es opt-in: una API
		 * vieja ignora el campo y manda uno de 6, y el paso 2 acepta ambos (mínimo 4 caracteres).
		 * Si el correo es de un empleado la API responde `es_empleado` + `message` y no manda nada.
		 */
		sendCode() {
			if (this.checkForm()) {
				this.loading = true
				this.$axios.post('password-reset/send-verification-code', {
					email                : this.register_user.email.trim(),
					longitud_del_codigo  : 4,
				})
				.then(res => {
					this.loading = false
					if (res.data.email_send) {
						this.$router.push({name: null, params: {view: 'codigo-de-verificacion'}})
					} else if (res.data.es_empleado) {
						this.$toast.error(res.data.message, {
							duration: 10000,
						})
					} else {
						this.$toast.error('El correo no corresponde a un usuario registrado')
					}
				})
				.catch(err => {
					console.log(err)
					this.loading = false
					this.showTooManyAttempts(err)
				})
			}
		},
		/**
		 * Si la API respondió 429 (throttle por IP de recuperar clave), muestra su `message` como
		 * toast de error. No avanza de paso: la persona se queda en esta pantalla y el botón vuelve
		 * a andar (el cargando ya se apagó en el `.catch`). Cualquier otro error no se toca.
		 *
		 * Sin sesión (lo normal acá) el interceptor global de axios NO avisa de un 429, por eso lo
		 * hace cada paso. Con sesión iniciada el interceptor ya muestra el `message` de la API, y
		 * acá no se repite para no duplicar el aviso.
		 *
		 * @param {Object} err Error de axios del `.catch`.
		 */
		showTooManyAttempts(err) {
			if (!err || !err.response || err.response.status !== 429) {
				return
			}
			let ya_avisado = this.$store.state.auth.authenticated === true && !(err.config && err.config.skip_global_error_event)
			if (ya_avisado) {
				return
			}
			let message = err.response.data && err.response.data.message
			this.$toast.error(message || 'Hiciste demasiados intentos. Esperá unos minutos y volvé a probar.', {
				duration: 10000,
			})
		},
		checkForm() {
			if (this.register_user.email.trim() == '') {
				this.$toast.error('Ingresá tu correo')
				return false
			}
			return true
		},
	}
}
</script>
