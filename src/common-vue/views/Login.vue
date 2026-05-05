<template>
	<!-- Vista de login: layout de página (fondo, marca, tarjeta, pie) alineado al diseño de referencia -->
	<div class="login-page">
		<div class="login-page__inner">
			<header class="login-page__brand">
				<!-- Logo clickeable: misma acción que el logo anterior del formulario (home si aplica) -->
				<img src="@/assets/logo.jpg" alt="">
				<!-- Nombre de la app desde entorno (VUE_APP_APP_NAME) -->
				<p class="login-page__subtitle">
					{{ login_subtitle }}
				</p>
			</header>
			<div class="login-page__card">
				<login-form />
			</div>
			<p class="login-page__footer-note">
				Autenticación empresarial segura
			</p>
		</div>
	</div>
</template>
<script>
import LoginForm from '@/common-vue/components/login/LoginForm'

export default {
	components: {
		LoginForm,
	},
	computed: {
		/**
		 * Subtítulo bajo el nombre de la app (mensaje corto de propósito del acceso).
		 *
		 * @returns {string}
		 */
		login_subtitle() {
			return 'Acceso a plataforma de gestión'
		},
	},
	methods: {
		/**
		 * Navega al home cuando la configuración del negocio habilita página de inicio pública.
		 *
		 * @returns {void}
		 */
		click_brand() {
			if (this.use_home_page) {
				this.$router.push({ name: 'home' })
			}
		},
	},
}
</script>
<style lang="sass" scoped>
.login-page
	min-height: 100vh
	width: 100vw
	display: flex
	justify-content: center
	align-items: center
	background: #f9fafb
	padding: 2rem 1rem
	box-sizing: border-box

.login-page__inner
	width: 100%
	max-width: 420px
	display: flex
	flex-direction: column
	align-items: center

.login-page__brand
	text-align: center
	margin-bottom: 1.75rem

// .login-page__logo-btn
// 	border: none
// 	padding: 0
// 	margin: 0 auto 1rem
// 	background: transparent
// 	cursor: pointer
// 	line-height: 0

img 
	margin: 0 auto 1rem
	cursor: pointer
	width: 120px
	border-radius: 50%

.login-page__logo-svg
	width: 48px
	height: 48px
	display: block

.login-page__title
	font-size: 1.5rem
	font-weight: 700
	color: #111827
	margin: 0 0 0.35rem
	letter-spacing: -0.02em

.login-page__subtitle
	font-size: 0.95rem
	color: #6b7280
	margin: 0

.login-page__card
	width: 100%
	background: #ffffff
	border-radius: 12px
	box-shadow: 0 10px 40px rgba(17, 24, 39, 0.08), 0 2px 10px rgba(17, 24, 39, 0.04)
	padding: 0
	overflow: hidden

.login-page__footer-note
	margin-top: 1.75rem
	font-size: 1rem
	color: #9ca3af
	text-align: center
</style>
