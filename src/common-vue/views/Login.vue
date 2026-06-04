<template>
	<!-- Vista de login: split-screen en desktop, columna en mobile -->
	<div class="login-page">

		<!-- ─── Mobile: cabecera con marca (~35% superior) ─── -->
		<div class="login-page__mobile-header">
			<span class="login-page__deco login-page__deco--mobile-1" aria-hidden="true"></span>
			<span class="login-page__deco login-page__deco--mobile-2" aria-hidden="true"></span>
			<div class="login-page__mobile-brand">
				<div class="login-page__mobile-logo-wrap">
					<img
						class="login-page__mobile-logo"
						src="@/assets/logo.jpg"
						alt="Comercio City"
					>
				</div>
				<h1 class="login-page__mobile-title">Comercio City</h1>
				<p class="login-page__mobile-tagline">
					Operación comercial para distribuidoras y comercios
				</p>
			</div>
		</div>

		<!-- ─── Desktop: panel izquierdo con propuesta de valor ─── -->
		<div class="login-page__left">

			<span class="login-page__deco login-page__deco--1" aria-hidden="true"></span>
			<span class="login-page__deco login-page__deco--2" aria-hidden="true"></span>
			<span class="login-page__deco login-page__deco--3" aria-hidden="true"></span>

			<header class="login-page__brand">
				<img
					class="login-page__logo"
					src="@/assets/logo.jpg"
					alt="Comercio City"
				>
				<span class="login-page__brand-name">Comercio City</span>
			</header>

			<div class="login-page__hero">
				<h1 class="login-page__hero-title">
					Profesionalizá tu <span class="login-page__hero-highlight">negocio</span>
				</h1>
				<p class="login-page__hero-subtitle">
					La plataforma de operación comercial para distribuidoras y comercios que quieren crecer con orden.
				</p>
				<ul class="login-page__bullets">
					<li class="login-page__bullet">ERP completo adaptado a tu rubro</li>
					<li class="login-page__bullet">Ecommerce integrado con tu stock</li>
					<li class="login-page__bullet">Gestión real, no solo facturación</li>
				</ul>
			</div>

			<div class="login-page__security login-page__security--desktop">
				<span class="login-page__security-icon" aria-hidden="true">
					<svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
						<path fill="currentColor" d="M12 1L3 5v6c0 5.55 3.84 10.74 9 12 5.16-1.26 9-6.45 9-12V5l-9-4zm0 10.99h7c-.53 4.12-3.28 7.79-7 8.94V12H5V6.3l7-3.11v8.8z" />
					</svg>
				</span>
				<p class="login-page__security-note">
					Autenticación segura · Datos encriptados
				</p>
			</div>

		</div>

		<!-- ─── Panel del formulario (blanco) ─── -->
		<div class="login-page__right">
			<div class="login-page__form-wrap">
				<login-form :split_layout="true" />
				<!-- Mobile: nota de seguridad debajo del botón -->
				<div class="login-page__security login-page__security--mobile">
					<span class="login-page__security-icon login-page__security-icon--light" aria-hidden="true">
						<svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
							<path fill="currentColor" d="M12 1L3 5v6c0 5.55 3.84 10.74 9 12 5.16-1.26 9-6.45 9-12V5l-9-4zm0 10.99h7c-.53 4.12-3.28 7.79-7 8.94V12H5V6.3l7-3.11v8.8z" />
						</svg>
					</span>
					<p class="login-page__security-note">
						Autenticación segura · Datos encriptados
					</p>
				</div>
			</div>
		</div>

	</div>
</template>

<script>
import LoginForm from '@/common-vue/components/login/LoginForm'

/**
 * Vista de login split-screen (desktop) y apilada (mobile).
 * Desktop: panel izquierdo de marca + formulario a la derecha.
 * Mobile: cabecera beige con logo centrado + formulario blanco debajo.
 */
export default {
	components: {
		LoginForm,
	},
}
</script>

<style lang="sass" scoped>
@import '@/sass/_theme_variables.scss'

$brand: #007bff
$font_login: $font_family
$beige: #f5f0e8
$text_dark: #111827
$text_muted: #6b7280
$mobile_breakpoint: 900px

.login-page
  display: flex
  min-height: 100vh
  width: 100vw
  max-width: 100vw
  margin-left: calc(50% - 50vw)
  margin-right: calc(50% - 50vw)
  overflow: hidden
  font-family: $font_login
  @media screen and (max-width: $mobile_breakpoint)
    flex-direction: column

// ─── Cabecera mobile (oculta en desktop) ───
.login-page__mobile-header
  display: none
  @media screen and (max-width: $mobile_breakpoint)
    display: flex
    position: relative
    align-items: center
    justify-content: center
    min-height: 34vh
    padding: 2.5rem 1.75rem 2.75rem
    background: $beige
    overflow: hidden
    box-sizing: border-box

.login-page__mobile-brand
  position: relative
  z-index: 1
  text-align: center
  width: 100%
  max-width: 320px

.login-page__mobile-logo-wrap
  width: 76px
  height: 76px
  border-radius: 50%
  background: #ffffff
  display: flex
  align-items: center
  justify-content: center
  margin: 0 auto 1.15rem
  box-shadow: 0 4px 16px rgba(17, 24, 39, 0.08)

.login-page__mobile-logo
  width: 52px
  height: 52px
  border-radius: 50%
  object-fit: cover

.login-page__mobile-title
  font-size: 1.375rem
  font-weight: 700
  color: $text_dark
  margin: 0 0 0.45rem
  letter-spacing: -0.02em

.login-page__mobile-tagline
  font-size: 0.875rem
  font-weight: 400
  color: $text_muted
  line-height: 1.5
  margin: 0

// Círculos decorativos mobile
.login-page__deco--mobile-1
  width: 280px
  height: 280px
  left: -90px
  top: -60px

.login-page__deco--mobile-2
  width: 340px
  height: 340px
  right: -110px
  bottom: -120px

// ─── Panel izquierdo desktop ───
.login-page__left
  position: relative
  flex: 0 0 50%
  max-width: 50%
  background: $beige
  display: flex
  flex-direction: column
  padding: 2.75rem 3.5rem 2.25rem
  box-sizing: border-box
  overflow: hidden
  @media screen and (max-width: $mobile_breakpoint)
    display: none

.login-page__deco
  position: absolute
  border-radius: 50%
  border: 1px solid rgba(17, 24, 39, 0.09)
  background: transparent
  pointer-events: none

.login-page__deco--1
  width: 380px
  height: 380px
  right: -80px
  top: 12%

.login-page__deco--2
  width: 520px
  height: 520px
  right: -160px
  bottom: -140px

.login-page__deco--3
  width: 220px
  height: 220px
  right: 28%
  top: 38%

.login-page__brand
  display: flex
  align-items: center
  gap: 0.6rem
  position: relative
  z-index: 1

.login-page__logo
  width: 32px
  height: 32px
  border-radius: 8px
  object-fit: cover
  flex-shrink: 0

.login-page__brand-name
  font-size: 1.0625rem
  font-weight: 600
  color: $text_dark
  letter-spacing: -0.02em

.login-page__hero
  flex: 1
  display: flex
  flex-direction: column
  justify-content: center
  position: relative
  z-index: 1
  padding: 1.5rem 0 2rem
  max-width: 520px

.login-page__hero-title
  font-size: 2.75rem
  font-weight: 800
  line-height: 1.12
  color: $text_dark
  margin: 0 0 1.25rem
  letter-spacing: -0.035em

.login-page__hero-highlight
  color: $brand

.login-page__hero-subtitle
  font-size: 1.0625rem
  font-weight: 400
  text-align: left
  color: $text_muted
  line-height: 1.65
  margin: 0 0 2rem
  max-width: 460px

.login-page__bullets
  list-style: none
  padding: 0
  margin: 0
  display: flex
  flex-direction: column
  gap: 0.85rem

.login-page__bullet
  font-size: 1rem
  font-weight: 400
  color: #374151
  display: flex
  align-items: center
  gap: 0.65rem
  line-height: 1.4
  &::before
    content: ''
    display: inline-block
    width: 7px
    height: 7px
    border-radius: 50%
    background: $brand
    flex-shrink: 0

// ─── Nota de seguridad ───
.login-page__security
  display: flex
  align-items: center
  gap: 0.5rem

.login-page__security--desktop
  position: relative
  z-index: 1

.login-page__security--mobile
  display: none
  justify-content: center
  margin-top: 1.75rem
  @media screen and (max-width: $mobile_breakpoint)
    display: flex

.login-page__security-icon
  display: flex
  align-items: center
  justify-content: center
  width: 28px
  height: 28px
  border-radius: 50%
  background: $text_dark
  color: #ffffff
  flex-shrink: 0
  svg
    width: 14px
    height: 14px

.login-page__security-icon--light
  width: auto
  height: auto
  border-radius: 0
  background: transparent
  color: #9ca3af
  svg
    width: 16px
    height: 16px

.login-page__security-note
  font-size: 0.8125rem
  font-weight: 400
  color: #9ca3af
  margin: 0

// ─── Panel del formulario ───
.login-page__right
  flex: 0 0 50%
  max-width: 50%
  background: #ffffff
  display: flex
  align-items: center
  justify-content: center
  padding: 2rem 3rem
  box-sizing: border-box
  @media screen and (max-width: $mobile_breakpoint)
    flex: 1
    max-width: 100%
    align-items: flex-start
    justify-content: flex-start
    padding: 2rem 1.75rem 2.5rem

.login-page__form-wrap
  width: 100%
  max-width: 380px
  @media screen and (max-width: $mobile_breakpoint)
    max-width: 100%
</style>
