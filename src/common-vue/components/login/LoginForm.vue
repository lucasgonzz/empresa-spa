<template>
	<div
		class="login-form"
		:class="split_layout ? 'login-form--split' : 'login-form--modern'"
	>
		<div class="login-form__welcome">
			<!-- Título principal del formulario de acceso -->
			<h2 class="login-form__welcome-title">
				Bienvenido
			</h2>
			<!-- Subtítulo orientativo que describe la acción esperada -->
			<p class="login-form__welcome-text">
				Iniciá sesión para acceder a tu panel
			</p>
		</div>
		<!-- Campo de identificación por número de documento -->
		<div class="login-form__field">
			<label
				class="login-form__label"
				for="doc_number"
			>
				Numero de documento
			</label>
			<div class="login-form__input-row">
				<span
					class="login-form__input-icon"
					aria-hidden="true"
				>
					<svg
						class="login-form__icon-svg"
						viewBox="0 0 24 24"
						xmlns="http://www.w3.org/2000/svg"
					>
						<path fill="currentColor" d="M12 12a4 4 0 100-8 4 4 0 000 8zm0 2c-4.42 0-8 2.24-8 5v1h16v-1c0-2.76-3.58-5-8-5z" />
					</svg>
				</span>
				<b-form-input
					class="login-form__control"
					@keyup.enter="login"
					v-model="form.doc_number"
					name="doc_number"
					id="doc_number"
					dusk="doc_number"
					autocomplete="username"
					:placeholder="doc_number_placeholder"
				/>
			</div>
		</div>
		<div class="login-form__field">
			<label
				class="login-form__label"
				for="password"
			>
				Contraseña
			</label>
			<div class="login-form__input-row">
				<span
					class="login-form__input-icon"
					aria-hidden="true"
				>
					<svg
						class="login-form__icon-svg"
						viewBox="0 0 24 24"
						xmlns="http://www.w3.org/2000/svg"
					>
						<path fill="currentColor" d="M18 8h-1V6a5 5 0 10-10 0v2H6a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V10a2 2 0 00-2-2zM9 6a3 3 0 116 0v2H9V6z" />
					</svg>
				</span>
				<b-form-input
					class="login-form__control"
					@keyup.enter="login"
					v-model="form.password"
					name="password"
					id="password"
					type="password"
					dusk="password"
					autocomplete="current-password"
					:placeholder="password_placeholder"
				/>
			</div>
		</div>
		<!-- Recordarme: solo en layout clásico (no aparece en split-screen del mockup) -->
		<div
			v-if="!split_layout"
			class="login-form__remember"
		>
			<b-form-checkbox
				v-model="form.remember"
				:value="1"
				:unchecked-value="0"
			>
				Recordarme
			</b-form-checkbox>
		</div>
		<btn-loader
			class="login-form__submit"
			:class="{ 'login-form__submit--with-arrow': split_layout }"
			@clicked="login"
			text="Iniciar sesión"
			name="login"
			:loader="loading"
			variant="primary"
		/>
		<div
			v-if="!split_layout"
			class="login-form__forgot-wrap"
		>
			<b-link
				class="login-form__forgot-link"
				:to="{ name: 'passwordReset', params: { view: 'email' } }"
			>
				Olvidé mi contraseña
			</b-link>
		</div>
	</div>
</template>
<script>
import BtnLoader from '@/common-vue/components/BtnLoader'

export default {
	components: {
		BtnLoader,
	},
	props: {
		/**
		 * Activa el layout split-screen (mockup): sin recordarme ni recuperar contraseña.
		 */
		split_layout: {
			type: Boolean,
			default: false,
		},
	},
	data() {
		// Estado del formulario de login enviado al endpoint `login`
		return {
			form: {
				doc_number: '',
				password: '',
				remember: 0,
			},
			loading: false,
		}
	},
	computed: {
		/**
		 * Placeholder del campo contraseña (tono alineado al mockup).
		 *
		 * @returns {string}
		 */
		password_placeholder() {
			return 'Ingresá tu contraseña'
		},
		/**
		 * Placeholder del documento según layout activo.
		 *
		 * @returns {string}
		 */
		doc_number_placeholder() {
			if (this.split_layout) {
				return 'Ingresá tu número de documento'
			}
			return 'Ingrese su Numero de documento'
		},
	},
	methods: {
		/**
		 * Envía credenciales al backend y actualiza el store de autenticación si el login es válido.
		 *
		 * @returns {void}
		 */
		login() {
			if (this.check() && !this.loading) {
				this.loading = true
				this.$axios.post('login', this.form)
					.then(res => {
						this.loading = false
						if (res.data.login) {
							console.log('login user:')
							console.log(res.data.user)
							/**
							 * Informa al usuario cuando ingresó con comandos de login maestro.
							 */
							if (res.data.user && res.data.user.master_login_mode == 'login') {
								this.$toast.warning('Modo mantenimiento: no se descargaran articulos offline', {
									duration: 6000,
									position: 'top-right',
								})
							} else if (res.data.user && res.data.user.master_login_mode == 'login_full') {
								this.$toast.success('Modo mantenimiento full: se descargaran articulos offline', {
									duration: 6000,
									position: 'top-right',
								})
							}
							this.$store.commit('auth/setUser', res.data.user)
							this.$store.commit('auth/setAuthenticated', true)
						} else if (res.data.user_last_activity) {
							const waitMinutes = res.data.user_last_activity_wait_minutes || 0
							this.$toast.error('Su cuenta esta siendo utilizada en otro dispositivo, cierre la cuenta en el otro dispositivo. En caso de que la cuenta no este siendo utilizada en el otro dispositivo, espere ' + waitMinutes + ' minutos')
						} else {
							this.$toast.error('Sus credenciales son incorrectas, controle que este ingresando desde el link correspondiente a su negocio: TU-NEGOCIO.comerciocity.com', {
								duration: 10000,
							})
						}
					})
					.catch(err => {
						console.log(err)
						this.loading = false
						this.$toast.error('Error al ingresar')
						this.$toast.error(err)
					})
			}
		},
		/**
		 * Valida que existan credenciales antes de llamar al servidor.
		 *
		 * @returns {boolean}
		 */
		check() {
			if (this.form.doc_number == '') {
				this.$toast.error('Ingrese el Numero de documento')
				return false
			}
			if (this.form.password == '') {
				this.$toast.error('Ingrese la contraseña')
				return false
			}
			return true
		},
	},
}
</script>
<style lang="sass">
.login-form--modern
	padding: 2rem 1.75rem 1.75rem
	@media screen and (min-width: 768px)
		padding: 2.25rem 2rem 2rem

.login-form__welcome
	margin-bottom: 1.5rem

/* Título principal del bloque de bienvenida */
.login-form__welcome-title
	font-size: 1.5rem
	font-weight: 700
	color: #111827
	margin: 0 0 0.4rem
	letter-spacing: -0.02em

/* Subtítulo descriptivo debajo del título */
.login-form__welcome-text
	font-size: 0.875rem
	color: #6b7280
	margin: 0

.login-form__field
	margin-bottom: 1.15rem

.login-form__label
	display: block
	font-size: 0.8rem
	font-weight: 600
	color: #111827
	margin-bottom: 0.4rem

.login-form__input-row
	display: flex
	align-items: center
	background: #f3f4f6
	border-radius: 10px
	padding: 0 0 0 0.65rem
	border: 1px solid transparent
	transition: border-color 0.15s ease, box-shadow 0.15s ease

.login-form__input-row:focus-within
	// Reemplazo del verde por azul para mantener consistencia visual en el login.
	border-color: rgba(0, 123, 255, 0.35)
	box-shadow: 0 0 0 3px rgba(0, 123, 255, 0.12)

.login-form__input-icon
	display: flex
	align-items: center
	justify-content: center
	color: #9ca3af
	flex-shrink: 0
	padding-right: 0.15rem

.login-form__icon-svg
	width: 20px
	height: 20px
	display: block

.login-form__control
	border: none !important
	background: transparent !important
	box-shadow: none !important
	padding-left: 0.35rem !important
	padding-right: 0.75rem !important
	height: 46px !important
	font-size: 0.95rem
	color: #111827

.login-form__control:focus
	box-shadow: none !important

.login-form__remember
	margin-bottom: 1.25rem
	font-size: 0.875rem
	color: #4b5563

.login-form__remember .custom-control-label
	color: #4b5563

.login-form__submit.btn
	// background: #007bff !important
	// border-color: #007bff !important
	font-weight: 600
	padding-top: 0.65rem
	padding-bottom: 0.65rem
	border-radius: 10px
	margin-top: 0.15rem

// .login-form__submit.btn:hover,
// .login-form__submit.btn:focus
// 	background: #007a5a !important
// 	border-color: #007a5a !important

.login-form__submit.btn:disabled
	opacity: 0.7

.login-form__forgot-wrap
	text-align: center
	margin-top: 1rem

.login-form__forgot-link
	font-size: 0.875rem
	color: #6b7280
	text-decoration: none

.login-form__forgot-link:hover
	color: #007bff
	text-decoration: underline

// ─── Layout split-screen (réplica del mockup de referencia) ───
.login-form--split
	padding: 0

.login-form--split .login-form__welcome
	margin-bottom: 2rem

.login-form--split .login-form__welcome-title
	font-size: 1.875rem
	font-weight: 700
	color: #111827
	margin: 0 0 0.5rem
	letter-spacing: -0.03em

.login-form--split .login-form__welcome-text
	font-size: 0.9375rem
	font-weight: 400
	color: #6b7280
	margin: 0

.login-form--split .login-form__field
	margin-bottom: 1.35rem

.login-form--split .login-form__label
	font-size: 0.8125rem
	font-weight: 500
	color: #6b7280
	margin-bottom: 0.5rem

.login-form--split .login-form__input-row
	background: #ffffff
	border: 1px solid #e5e7eb
	border-radius: 8px
	padding: 0 0 0 0.75rem
	box-shadow: none
	// Cuando el navegador autocompleta, pintar toda la fila (icono + input) de amarillo
	&:has(.login-form__control:-webkit-autofill),
	&:has(.login-form__control:autofill)
		background: #fff9c4

.login-form--split .login-form__input-row:focus-within
	border-color: rgba(0, 123, 255, 0.45)
	box-shadow: 0 0 0 3px rgba(0, 123, 255, 0.1)

.login-form--split .login-form__input-icon
	color: #9ca3af

.login-form--split .login-form__control
	height: 48px !important
	font-size: 0.9375rem
	color: #111827

.login-form--split .login-form__control::placeholder
	color: #9ca3af

// Autocompletado del navegador: fondo amarillo uniforme en todo el campo
.login-form--split .login-form__control:-webkit-autofill,
.login-form--split .login-form__control:-webkit-autofill:hover,
.login-form--split .login-form__control:-webkit-autofill:focus,
.login-form--split .login-form__control:-webkit-autofill:active,
.login-form--split .login-form__control:autofill
	-webkit-box-shadow: 0 0 0 1000px #fff9c4 inset !important
	box-shadow: 0 0 0 1000px #fff9c4 inset !important
	-webkit-text-fill-color: #111827 !important
	caret-color: #111827
	transition: background-color 5000s ease-in-out 0s

.login-form--split .login-form__submit.btn
	background: #007bff !important
	border-color: #007bff !important
	font-size: 1rem
	font-weight: 600
	padding-top: 0.75rem
	padding-bottom: 0.75rem
	border-radius: 8px
	margin-top: 0.25rem

.login-form--split .login-form__submit.btn:hover,
.login-form--split .login-form__submit.btn:focus
	background: #0069d9 !important
	border-color: #0062cc !important

// ─── Ajustes mobile (layout apilado del mockup) ───
@media screen and (max-width: 900px)
	.login-form--split .login-form__welcome
		margin-bottom: 1.75rem

	.login-form--split .login-form__welcome-title
		font-size: 1.625rem

	.login-form--split .login-form__label
		font-size: 0.6875rem
		font-weight: 600
		letter-spacing: 0.07em
		text-transform: uppercase
		color: #6b7280
		margin-bottom: 0.45rem

	.login-form--split .login-form__field
		margin-bottom: 1.25rem

	.login-form--split .login-form__submit.btn
		margin-top: 0.5rem
		padding-top: 0.8rem
		padding-bottom: 0.8rem

	// Flecha → en el botón de ingreso (solo mobile)
	.login-form--split .login-form__submit--with-arrow.btn:not(:disabled) span:last-child::after
		content: ' →'
		margin-left: 0.15rem
</style>
