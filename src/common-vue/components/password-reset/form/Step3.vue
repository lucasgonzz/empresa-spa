<template>
<div
v-if="view == 'nueva-clave'">
	<p>
		Ingresá tu nueva contraseña.
	</p>
	<b-form-group>
		<b-form-input
		v-model="register_user.password"
		type="password"
		autocomplete="new-password"
		placeholder="Ingresá tu nueva contraseña"></b-form-input>
	</b-form-group>
	<b-form-group>
		<b-form-input
		v-model="register_user.password_confirm"
		type="password"
		autocomplete="new-password"
		@keyup.enter="updatePassword"
		placeholder="Confirmá tu nueva contraseña"></b-form-input>
	</b-form-group>
	<btn-loader
	@clicked="updatePassword"
	text="Actualizar contraseña"
	:loader="loading"></btn-loader>
</div>
</template>
<script>
import BtnLoader from '@/common-vue/components/BtnLoader'
/**
 * Largo mínimo de la contraseña nueva. Es el mismo que exige la API
 * (`PasswordResetController::MINIMO_DE_LA_CONTRASENA`): si la SPA dejara pasar menos, la API
 * la rechazaría con un 422.
 */
const MIN_PASSWORD_LENGTH = 6
export default {
	props: {
		register_user: Object,
	},
	components: {
		BtnLoader
	},
	computed: {
		check() {
			return !this.register_user.terminos_y_condiciones
		},
		is_code_typed() {
			if (this.register_user.verification_code.length < 4) {
				return false
			}
			return true
		},
		is_password_typed() {
			if (this.register_user.password.length >= MIN_PASSWORD_LENGTH && this.register_user.password == this.register_user.password_confirm) {
				return true
			}
			return false
		},
	},
	data() {
		return {
			loading: false
		}
	},
	methods: {
		/**
		 * Cambia la contraseña con el código ya verificado.
		 *
		 * Si sale bien, la API deja la sesión abierta. Para que la persona quede ADENTRO del
		 * sistema se hace lo mismo que cuando entra por el login: se va a `login` y se pide
		 * `auth/me`; al quedar autenticado, App.vue la lleva a su pantalla de inicio. Si por lo
		 * que sea no queda autenticada (por ejemplo, la cuenta está abierta en otro dispositivo),
		 * queda en el login con un aviso para que entre con la contraseña nueva.
		 *
		 * Los errores 422 (código vencido o inválido, contraseña inválida) los muestra con su motivo
		 * el interceptor global de axios; acá solo se apaga el cargando.
		 */
		updatePassword() {
			if (this.checkPassword()) {
				this.loading = true
				this.$axios.post('password-reset/update-password', {
					...this.register_user,
					verification_code: String(this.register_user.verification_code),
				})
				.then(() => {
					this.$toast.success('Tu contraseña se actualizó')
					return this.$router.push({name: 'login'}).catch(() => {})
				})
				.then(() => {
					return this.$store.dispatch('auth/me')
				})
				.then(() => {
					this.loading = false
					if (!this.$store.state.auth.authenticated) {
						this.$toast.info('Ingresá con tu nueva contraseña')
					}
				})
				.catch(err => {
					this.loading = false
					console.log(err)
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
		checkPassword() {
			if (this.register_user.password == '') {
				this.$toast.error('Ingresá una nueva contraseña')
				return false
			}
			if (this.register_user.password.length < MIN_PASSWORD_LENGTH) {
				this.$toast.error('La contraseña tiene que tener al menos ' + MIN_PASSWORD_LENGTH + ' caracteres')
				return false
			}
			if (this.register_user.password_confirm == '') {
				this.$toast.error('Confirmá la nueva contraseña')
				return false
			}
			if (this.register_user.password != this.register_user.password_confirm) {
				this.$toast.error('Las contraseñas no coinciden')
				return false
			}
			return true
		}
	}
}
</script>
<style lang="sass">
.form-register
	.custom-checkbox
		text-align: left
</style>
