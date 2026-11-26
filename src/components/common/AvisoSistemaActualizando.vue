<template>
	<!--
		Tarjeta de la pantalla de ingreso mientras el sistema se actualiza (misión aviso-actualizacion-sistema,
		25/11/2026). Va arriba del formulario, que sigue usable (el acceso maestro de soporte entra por ahí).
		Es un estado normal, no una falla: tono neutro, sin rojo. Cuando termina la actualización lo dice
		y la persona ya puede ingresar.
	-->
	<div
		v-if="visible"
		class="aviso-sistema-actualizando"
		:class="terminada ? 'aviso-sistema-actualizando--lista' : 'aviso-sistema-actualizando--en-curso'"
		role="status"
		aria-live="polite"
		data-testid="aviso-sistema-actualizando"
		:data-estado="terminada ? 'terminada' : 'actualizando'"
	>
		<!-- Ícono: arco que gira despacio mientras se actualiza; tilde cuando terminó -->
		<span class="aviso-sistema-actualizando__icono" aria-hidden="true">
			<svg v-if="terminada" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
				<path fill="currentColor" d="M9 16.2L4.8 12l-1.4 1.4L9 19 21 7l-1.4-1.4z" />
			</svg>
			<svg v-else class="aviso-sistema-actualizando__giro" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
				<path fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" d="M12 3a9 9 0 019 9" />
			</svg>
		</span>
		<div class="aviso-sistema-actualizando__cuerpo">
			<p v-if="terminada" class="aviso-sistema-actualizando__titulo" data-testid="aviso-sistema-actualizando-titulo">
				Ya terminó la actualización. Podés ingresar.
			</p>
			<template v-else>
				<p class="aviso-sistema-actualizando__titulo" data-testid="aviso-sistema-actualizando-titulo">
					Estamos actualizando el sistema
				</p>
				<p class="aviso-sistema-actualizando__texto" data-testid="aviso-sistema-actualizando-texto">
					{{ detalle }}
				</p>
			</template>
		</div>
	</div>
</template>
<script>
import { detalle_de_mensaje } from '@/utils/actualizacion_del_sistema'

/** Cada cuántos milisegundos se pregunta si ya terminó (mientras la tarjeta muestra el bloqueo). */
const INTERVALO_PUBLICO_MS = 20000

export default {
	name: 'AvisoSistemaActualizando',
	data() {
		return {
			/** Id del `setInterval` que pregunta el estado público. */
			timer_publico: null,
		}
	},
	computed: {
		/**
		 * ¿El sistema está actualizándose (la API contestó la marca)?
		 *
		 * @returns {Boolean}
		 */
		bloqueado() {
			return this.$store.state.actualizacion_del_sistema.bloqueado
		},
		/**
		 * ¿Terminó la actualización mientras esta pantalla estaba abierta?
		 *
		 * @returns {Boolean}
		 */
		terminada() {
			return this.$store.state.actualizacion_del_sistema.terminada
		},
		/**
		 * @returns {Boolean}
		 */
		visible() {
			return this.bloqueado || this.terminada
		},
		/**
		 * Mensaje de la API sin la oración que ya es el título.
		 *
		 * @returns {String}
		 */
		detalle() {
			return detalle_de_mensaje(this.$store.state.actualizacion_del_sistema.mensaje)
		},
	},
	watch: {
		/**
		 * Mientras hay bloqueo se pregunta cada 20 s; cuando se levanta (o deja de haberlo) se deja de preguntar.
		 *
		 * @param {Boolean} bloqueado
		 * @returns {void}
		 */
		bloqueado(bloqueado) {
			if (bloqueado) {
				this.iniciar_consulta()
			} else {
				this.detener_consulta()
			}
		},
	},
	mounted() {
		// Una consulta al abrir el ingreso: si el sistema se está actualizando, la API contesta la marca y
		// la tarjeta aparece aunque la persona no haya intentado ingresar todavía.
		this.$store.dispatch('actualizacion_del_sistema/consultar_publico')
		if (this.bloqueado) {
			this.iniciar_consulta()
		}
	},
	beforeDestroy() {
		this.detener_consulta()
	},
	methods: {
		/**
		 * Arranca el polling del estado público (idempotente).
		 *
		 * @returns {void}
		 */
		iniciar_consulta() {
			var self = this
			if (this.timer_publico !== null) {
				return
			}
			this.timer_publico = window.setInterval(function () {
				self.$store.dispatch('actualizacion_del_sistema/consultar_publico')
			}, INTERVALO_PUBLICO_MS)
		},
		/**
		 * Apaga el polling.
		 *
		 * @returns {void}
		 */
		detener_consulta() {
			if (this.timer_publico !== null) {
				window.clearInterval(this.timer_publico)
				this.timer_publico = null
			}
		},
	},
}
</script>
<style scoped lang="sass">
.aviso-sistema-actualizando
	display: flex
	align-items: flex-start
	gap: 0.85rem
	margin: 0 0 1.5rem
	padding: 0.95rem 1.1rem
	border-radius: 14px
	background: var(--bg-card, #f5f5f7)
	border: 1px solid var(--color-border, rgba(0, 0, 0, 0.08))
	box-sizing: border-box

.aviso-sistema-actualizando__icono
	flex: 0 0 auto
	display: inline-flex
	align-items: center
	justify-content: center
	width: 28px
	height: 28px
	margin-top: 1px
	border-radius: 50%
	svg
		width: 20px
		height: 20px

.aviso-sistema-actualizando--en-curso .aviso-sistema-actualizando__icono
	color: var(--color-primary, #007aff)

.aviso-sistema-actualizando--lista .aviso-sistema-actualizando__icono
	color: #34a853
	background: rgba(52, 168, 83, 0.12)

// Giro lento: indica "en proceso" sin llamar la atención.
.aviso-sistema-actualizando__giro
	animation: aviso-sistema-actualizando-giro 1.4s linear infinite

.aviso-sistema-actualizando__cuerpo
	min-width: 0

.aviso-sistema-actualizando__titulo
	margin: 0
	font-size: 0.95rem
	font-weight: 600
	line-height: 1.35
	color: var(--color-text-primary, #1d1d1f)

.aviso-sistema-actualizando__texto
	margin: 0.25rem 0 0
	font-size: 0.85rem
	line-height: 1.5
	color: var(--color-text-secondary, #6e6e73)

@keyframes aviso-sistema-actualizando-giro
	to
		transform: rotate(360deg)

@media (prefers-reduced-motion: reduce)
	.aviso-sistema-actualizando__giro
		animation: none
</style>
