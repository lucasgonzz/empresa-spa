<template>
<div
v-if="view == 'codigo-de-verificacion'">
	<p class="text-left">
		Enviamos un código de verificación a <strong>{{ register_user.email }}</strong>, si no encontrás el correo <strong>revisá la carpeta de spam</strong>. El código vence en 30 minutos.
	</p>
	<b-form-group>
		<b-form-input
		v-model="register_user.verification_code"
		class="verification-code-input"
		type="text"
		inputmode="numeric"
		pattern="[0-9]*"
		autocomplete="one-time-code"
		maxlength="6"
		@input="keepOnlyDigits"
		@keyup.enter="checkVerificationCode"
		placeholder="Código"></b-form-input>
	</b-form-group>
	<btn-loader
	@clicked="checkVerificationCode"
	text="Verificar"
	:loader="loading"></btn-loader>
	<!-- Salidas del paso: con los 5 intentos agotados la persona necesita otro código o volver atrás -->
	<b-button
	@click="resendVerificationCode"
	:disabled="resending"
	block
	variant="outline-primary"
	data-testid="pedir-otro-codigo">
		Pedir otro código
	</b-button>
	<b-button
	@click="backToEmail"
	:disabled="resending"
	block
	variant="link"
	data-testid="regresar-al-correo">
		Regresar
	</b-button>
</div>
</template>
<script>
import BtnLoader from '@/common-vue/components/BtnLoader'
export default {
	props: {
		register_user: Object,
		verification_code_send: Boolean,
		code_verified: Boolean,
	},
	components: {
		BtnLoader
	},
	computed: {
		/**
		 * El código está completo si tiene al menos 4 caracteres: la API nueva manda 4 dígitos
		 * y una API vieja todavía manda 6, así que se acepta cualquiera de los dos.
		 */
		is_code_typed() {
			if (this.register_user.verification_code.length < 4) {
				return false
			}
			return true
		},
	},
	data() {
		return {
			loading: false,
			// Evita doble click mientras se pide un código nuevo
			resending: false,
		}
	},
	methods: {
		/**
		 * Pide un código nuevo al mismo correo (mismo pedido que el paso 1). El código anterior
		 * deja de servir en la API; se limpia lo tipeado. Si la página se recargó en este paso y
		 * el correo se perdió, manda de vuelta al paso del correo.
		 */
		resendVerificationCode() {
			if (this.resending) {
				return
			}
			if (!this.register_user.email || this.register_user.email.trim() == '') {
				this.backToEmail()
				return
			}
			this.resending = true
			this.$axios.post('password-reset/send-verification-code', {
				email                : this.register_user.email.trim(),
				longitud_del_codigo  : 4,
			})
			.then(res => {
				this.resending = false
				if (res.data.email_send) {
					this.register_user.verification_code = ''
					this.$toast.success('Te mandamos un código nuevo. Revisá también la carpeta de spam.')
				} else if (res.data.es_empleado) {
					this.$toast.error(res.data.message, {
						duration: 10000,
					})
				} else {
					this.$toast.error('No pudimos mandar un código nuevo. Probá de nuevo en unos minutos.')
				}
			})
			.catch(err => {
				console.log(err)
				this.resending = false
				this.showTooManyAttempts(err)
			})
		},
		/**
		 * Vuelve al paso del correo para cambiarlo o empezar de nuevo.
		 */
		backToEmail() {
			this.register_user.verification_code = ''
			this.$router.push({name: null, params: {view: 'email'}})
		},
		/**
		 * Deja solo los dígitos de lo que se tipea o se pega. El código se maneja siempre como
		 * texto (no `type="number"`), así un código que empezara con 0 no perdería el cero.
		 *
		 * @param {String} value Lo que hay ahora en el input.
		 */
		keepOnlyDigits(value) {
			let digits = String(value).replace(/\D/g, '')
			if (digits != value) {
				this.register_user.verification_code = digits
			}
		},
		checkVerificationCode() {
			if (this.is_code_typed) {
				this.loading = true
				this.$axios.post('/password-reset/check-verification-code', {
					...this.register_user,
					verification_code: String(this.register_user.verification_code),
				})
				.then(res => {
					this.loading = false
					if (res.data.verified) {
						this.$router.push({name: null, params: {view: 'nueva-clave'}})
					} else {
						this.register_user.verification_code = ''
						this.$toast.error('El código ingresado no es correcto')
					}
				})
				.catch(err => {
					this.loading = false
					console.log(err)
					this.showTooManyAttempts(err)
				})
			} else {
				this.$toast.error('Escribí el código completo')
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
	}
}
</script>
<style lang="sass">
.form-register
	.custom-checkbox
		text-align: left
	.verification-code-input
		text-align: center
		font-size: 1.6em
		letter-spacing: .35em
		font-weight: 600
		&::placeholder
			font-size: .6em
			letter-spacing: normal
			font-weight: normal
</style>
