<template>
	<!--
		Pedido de OK para actualizar el sistema (misión aviso-actualizacion-sistema, 25/11/2026). Aparece en
		cada computadora con sesión cuando soporte necesita actualizar con el negocio abierto. No se puede
		cerrar sin contestar (ni con la tecla Esc, ni con un clic afuera, ni con la cruz): o "Aceptar" o
		"Ahora no". Quien acepta sigue trabajando y ve la pastilla "Faltan N computadoras por confirmar".
	-->
	<b-modal
		id="actualizacion-pedido-ok"
		:visible="visible"
		:no-close-on-backdrop="true"
		:no-close-on-esc="true"
		hide-header-close
		hide-header
		hide-footer
		centered
		modal-class="actualizacion-pedido-ok-modal"
		data-testid="actualizacion-pedido-ok"
	>
		<div class="actualizacion-pedido-ok" data-testid="actualizacion-pedido-ok-contenido">
			<!-- Ícono de actualización: dos flechas en círculo, neutro -->
			<span class="actualizacion-pedido-ok__icono" aria-hidden="true">
				<svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
					<path fill="currentColor" d="M12 4V1L8 5l4 4V6a6 6 0 016 6c0 1-.25 1.97-.7 2.8l1.46 1.46A7.93 7.93 0 0020 12a8 8 0 00-8-8zm0 14a6 6 0 01-6-6c0-1 .25-1.97.7-2.8L5.24 7.74A7.93 7.93 0 004 12a8 8 0 008 8v3l4-4-4-4v3z" />
				</svg>
			</span>

			<h2 class="actualizacion-pedido-ok__titulo">
				Necesitamos actualizar el sistema
			</h2>

			<p class="actualizacion-pedido-ok__texto">
				Si nos das el OK, vas a dejar de usar el sistema y empezamos a actualizarlo.
			</p>

			<!-- Cuenta regresiva: si nadie contesta, la sesión se cierra sola -->
			<p class="actualizacion-pedido-ok__plazo" data-testid="actualizacion-plazo">
				Si no respondés, {{ texto_plazo }} se cierra la sesión sola.
			</p>

			<div class="actualizacion-pedido-ok__acciones">
				<button
					type="button"
					class="actualizacion-pedido-ok__boton actualizacion-pedido-ok__boton--primario"
					:disabled="enviando"
					data-testid="actualizacion-aceptar"
					@click="responder('acepto')"
				>
					Aceptar
				</button>
				<button
					type="button"
					class="actualizacion-pedido-ok__boton actualizacion-pedido-ok__boton--secundario"
					:disabled="enviando"
					data-testid="actualizacion-ahora-no"
					@click="responder('ahora_no')"
				>
					Ahora no
				</button>
			</div>
		</div>
	</b-modal>
</template>
<script>
import { minutos_para_responder } from '@/utils/actualizacion_del_sistema'

/** Cada cuántos milisegundos se recalcula el tiempo que queda (la unidad visible es el minuto). */
const INTERVALO_CUENTA_MS = 10000

export default {
	name: 'ActualizacionPedidoOkModal',
	data() {
		return {
			/** ¿Se está mandando la respuesta? Desactiva los botones para no contestar dos veces. */
			enviando: false,
			/** "Ahora" para la cuenta regresiva (se refresca mientras el modal está abierto). */
			ahora: Date.now(),
			/** Id del `setInterval` de la cuenta regresiva. */
			timer_cuenta: null,
		}
	},
	computed: {
		/**
		 * ¿Hay pedido abierto que esta computadora todavía no contestó?
		 *
		 * @returns {Boolean}
		 */
		visible() {
			return this.$store.getters['actualizacion_del_sistema/mostrar_modal']
		},
		/**
		 * Segundos que quedan para responder: lo que dijo la API al contestar menos lo que pasó desde entonces.
		 *
		 * @returns {Number}
		 */
		segundos_restantes() {
			const estado = this.$store.state.actualizacion_del_sistema
			return Math.max(0, estado.segundos_para_responder - (this.ahora - estado.recibido_at) / 1000)
		},
		/**
		 * "en 8 minutos" / "en 1 minuto" / "en unos segundos".
		 *
		 * @returns {String}
		 */
		texto_plazo() {
			const minutos = minutos_para_responder(this.segundos_restantes)
			if (minutos > 1) {
				return 'en ' + minutos + ' minutos'
			}
			return minutos === 1 ? 'en 1 minuto' : 'en unos segundos'
		},
	},
	watch: {
		/**
		 * La cuenta regresiva sólo corre mientras el modal está abierto.
		 *
		 * @param {Boolean} abierto
		 * @returns {void}
		 */
		visible: {
			immediate: true,
			handler(abierto) {
				this.detener_cuenta()
				if (abierto) {
					this.ahora = Date.now()
					this.timer_cuenta = window.setInterval(() => {
						this.ahora = Date.now()
					}, INTERVALO_CUENTA_MS)
				}
			},
		},
	},
	beforeDestroy() {
		this.detener_cuenta()
	},
	methods: {
		/**
		 * Manda la respuesta de esta computadora. Si no se pudo registrar se avisa y los botones quedan
		 * disponibles para reintentar (el modal sigue abierto porque el estado del store no cambió).
		 *
		 * @param {String} respuesta 'acepto' | 'ahora_no'
		 * @returns {void}
		 */
		responder(respuesta) {
			var self = this
			if (this.enviando) {
				return
			}
			this.enviando = true
			this.$store.dispatch('actualizacion_del_sistema/responder', respuesta)
			.then(function (salio_bien) {
				self.enviando = false
				if (!salio_bien && self.visible) {
					self.$toast.error('No pudimos registrar tu respuesta. Probá de nuevo.')
				}
			})
			.catch(function () {
				self.enviando = false
			})
		},
		/**
		 * Apaga la cuenta regresiva.
		 *
		 * @returns {void}
		 */
		detener_cuenta() {
			if (this.timer_cuenta !== null) {
				window.clearInterval(this.timer_cuenta)
				this.timer_cuenta = null
			}
		},
	},
}
</script>
<style lang="sass">
// Sin `scoped`: b-modal pinta su contenido fuera del componente (en el body). Todo cuelga de una
// clase propia para no pisar otros modales.
.actualizacion-pedido-ok-modal
	.modal-dialog
		max-width: 420px
	.modal-content
		border-radius: 16px
		border: 1px solid var(--color-border, rgba(0, 0, 0, 0.08))
		box-shadow: 0 8px 40px rgba(0, 0, 0, 0.18)
	.modal-body
		padding: 2rem 1.75rem 1.5rem

.actualizacion-pedido-ok
	text-align: center

.actualizacion-pedido-ok__icono
	display: inline-flex
	align-items: center
	justify-content: center
	width: 52px
	height: 52px
	margin-bottom: 1rem
	border-radius: 50%
	background: rgba(0, 122, 255, 0.1)
	color: var(--color-primary, #007aff)
	svg
		width: 26px
		height: 26px

.actualizacion-pedido-ok__titulo
	margin: 0 0 0.6rem
	font-size: 1.3rem
	font-weight: 600
	line-height: 1.25
	letter-spacing: -0.01em
	color: var(--color-text-primary, #1d1d1f)

.actualizacion-pedido-ok__texto
	margin: 0 0 0.5rem
	font-size: 0.95rem
	line-height: 1.5
	color: var(--color-text-secondary, #424245)

.actualizacion-pedido-ok__plazo
	margin: 0 0 1.5rem
	font-size: 0.85rem
	line-height: 1.4
	color: var(--color-text-secondary, #6e6e73)

.actualizacion-pedido-ok__acciones
	display: flex
	flex-direction: column
	gap: 0.5rem

.actualizacion-pedido-ok__boton
	display: block
	width: 100%
	padding: 0.7rem 1rem
	border-radius: 10px
	border: 1px solid transparent
	font-size: 0.95rem
	font-weight: 600
	line-height: 1.2
	cursor: pointer
	box-sizing: border-box
	&:disabled
		opacity: 0.55
		cursor: default

.actualizacion-pedido-ok__boton--primario
	background: var(--color-primary, #007aff)
	color: #fff

.actualizacion-pedido-ok__boton--secundario
	background: transparent
	color: var(--color-primary, #007aff)
	&:hover:not(:disabled)
		background: rgba(0, 122, 255, 0.07)
</style>
