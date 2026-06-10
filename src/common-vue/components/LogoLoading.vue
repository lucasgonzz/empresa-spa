<template>
	<!-- Transición de entrada/salida del overlay global de carga -->
	<transition name="logo-loading-fade">
		<div
			v-if="loading"
			class="logo-loading-overlay"
			role="status"
			aria-live="polite"
			aria-busy="true"
		>
			<!-- Panel central: indicador + mensaje opcional -->
			<div class="logo-loading-panel">
				<!-- Barra de progreso durante actualización de la PWA -->
				<div
					v-if="there_is_update"
					class="logo-loading-progress"
				>
					<div class="logo-loading-progress-track">
						<div
							class="logo-loading-progress-bar"
							:style="{ width: progress + '%' }"
						></div>
					</div>
					<span class="logo-loading-progress-value">{{ progress }}%</span>
				</div>

				<!-- Spinner circular para operaciones habituales de la API -->
				<div
					v-else
					class="logo-loading-spinner"
					aria-hidden="true"
				>
					<span class="logo-loading-spinner-ring"></span>
					<span class="logo-loading-spinner-ring logo-loading-spinner-ring--delayed"></span>
				</div>

				<!-- Texto descriptivo enviado desde el store (auth/message) -->
				<p
					v-if="message != ''"
					class="logo-loading-message"
				>{{ message }}</p>
			</div>
		</div>
	</transition>
</template>

<script>
import update_app from '@/common-vue/mixins/update_app'

/**
 * Overlay global de carga: lee auth.loading y auth.message del store.
 * Durante actualización de la app (mixin update_app) muestra barra de progreso.
 */
export default {
	name: 'LogoLoading',
	mixins: [update_app],
	computed: {
		/**
		 * Indica si debe mostrarse el overlay (estado global de carga).
		 * @returns {boolean}
		 */
		loading() {
			return this.$store.state.auth.loading
		},
		/**
		 * Mensaje descriptivo de la operación en curso.
		 * @returns {string}
		 */
		message() {
			return this.$store.state.auth.message
		}
	}
}
</script>

<style scoped lang="sass">
@import '@/sass/_custom.scss'

// Duración de animaciones del overlay y del spinner
$logo_loading_duration: 0.35s
$logo_loading_spinner_size: 52px

// Entrada y salida del overlay completo
.logo-loading-fade-enter-active,
.logo-loading-fade-leave-active
	transition: opacity $logo_loading_duration ease

.logo-loading-fade-enter,
.logo-loading-fade-leave-to
	opacity: 0

// Capa fija que cubre toda la vista con desenfoque del contenido detrás
.logo-loading-overlay
	position: fixed
	inset: 0
	z-index: 10000
	display: flex
	align-items: center
	justify-content: center
	padding: 1.5rem
	background: rgba(255, 255, 255, 0.72)
	backdrop-filter: blur(10px)
	-webkit-backdrop-filter: blur(10px)
	@if ($theme == 'dark')
		background: rgba(30, 30, 30, 0.78)

// Tarjeta flotante con sombra suave y borde sutil
.logo-loading-panel
	display: flex
	flex-direction: column
	align-items: center
	gap: 1.25rem
	min-width: 220px
	max-width: min(92vw, 360px)
	padding: 2rem 2.25rem 1.85rem
	border-radius: 16px
	background: #fff
	box-shadow: 0 4px 24px rgba(15, 23, 42, 0.08), 0 1px 3px rgba(15, 23, 42, 0.06)
	border: 1px solid rgba(0, 123, 255, 0.08)
	@if ($theme == 'dark')
		background: #2a2a2a
		border-color: rgba(255, 255, 255, 0.06)
		box-shadow: 0 8px 32px rgba(0, 0, 0, 0.35)

// Contenedor del doble anillo animado
.logo-loading-spinner
	position: relative
	width: $logo_loading_spinner_size
	height: $logo_loading_spinner_size

// Anillos concéntricos con giro alternado
.logo-loading-spinner-ring
	position: absolute
	inset: 0
	border-radius: 50%
	border: 3px solid transparent
	border-top-color: $blue
	animation: logo-loading-spin 0.9s cubic-bezier(0.5, 0.15, 0.35, 0.85) infinite

.logo-loading-spinner-ring--delayed
	inset: 6px
	border-top-color: rgba($blue, 0.35)
	animation-duration: 1.2s
	animation-direction: reverse

@keyframes logo-loading-spin
	to
		transform: rotate(360deg)

// Bloque de barra de progreso (actualización PWA)
.logo-loading-progress
	width: 100%
	display: flex
	flex-direction: column
	align-items: stretch
	gap: 0.5rem

.logo-loading-progress-track
	height: 6px
	border-radius: 999px
	background: rgba($blue, 0.12)
	overflow: hidden

.logo-loading-progress-bar
	height: 100%
	border-radius: 999px
	background: linear-gradient(90deg, darken($blue, 6%), $blue 55%, lighten($blue, 8%))
	transition: width 0.45s ease
	position: relative
	&::after
		content: ''
		position: absolute
		inset: 0
		background: linear-gradient(90deg, transparent, rgba(255, 255, 255, 0.35), transparent)
		animation: logo-loading-shimmer 1.4s ease-in-out infinite

@keyframes logo-loading-shimmer
	0%
		transform: translateX(-100%)
	100%
		transform: translateX(100%)

.logo-loading-progress-value
	font-family: $font-family-sans-serif
	font-size: 0.8rem
	font-weight: 500
	letter-spacing: 0.04em
	color: rgba($blue, 0.85)
	text-align: right
	@if ($theme == 'dark')
		color: lighten($blue, 12%)

// Mensaje de la operación (store auth/message)
.logo-loading-message
	margin: 0
	font-family: $font-family-sans-serif
	font-size: 0.95rem
	font-weight: 400
	line-height: 1.45
	letter-spacing: 0.01em
	color: #334155
	text-align: center
	@if ($theme == 'dark')
		color: #e2e8f0
</style>
