<template>
	<!-- El compositor de ia.comerciocity.com (ia-spa, chat/Compositor.vue) en la ventana del
	sistema (misión agente-mejoras-uso-real, 29/10/2026): una píldora con el texto que crece y el
	botón de enviar redondo. Lo que la app tiene y la ventana no (adjuntar, micrófono, selector de
	modelo) no se agrega: la ventana sigue mandando solo texto.

	Enter envía y Shift+Enter hace un salto de línea (D40), como siempre. Mientras el asistente
	responde, el botón queda como el «detener» apagado de ia-spa y Enter no hace nada (el texto
	queda escrito). -->
	<div class="asistente-ia-composer">
		<div class="asistente-ia-composer__columna">
			<!-- Lo que el panel quiera poner arriba de la píldora: en el teléfono, las sugerencias
			de la conversación en blanco (ver Panel.vue). -->
			<slot name="arriba"></slot>
			<form
			class="asistente-ia-composer__caja"
			aria-label="Escribir un mensaje"
			@submit.prevent="send">
				<textarea
				id="asistente-ia-composer-text"
				ref="area"
				v-model="texto"
				class="asistente-ia-composer__texto"
				rows="1"
				:placeholder="placeholder"
				aria-label="Mensaje para tu asistente"
				enterkeyhint="send"
				@keydown.enter="on_keydown_enter"></textarea>
				<button
				v-if="ocupado"
				type="button"
				class="asistente-ia-composer__enviar asistente-ia-composer__enviar--esperando"
				title="Respondiendo…"
				aria-label="Respondiendo…"
				disabled>
					<icono
					nombre="detener"
					:tamano="18"></icono>
				</button>
				<button
				v-else
				type="submit"
				class="asistente-ia-composer__enviar"
				title="Enviar"
				aria-label="Enviar"
				:disabled="!puede_enviar">
					<icono
					nombre="enviar"
					:tamano="20"></icono>
				</button>
			</form>
			<p class="asistente-ia-composer__aviso">El asistente puede equivocarse. Revisá lo importante.</p>
		</div>
	</div>
</template>

<script>
import Icono from '@/components/asistente-ia/Icono'

/**
 * Alto de un renglón del texto, en px (16px de letra × 1,5 de interlineado). Es la unidad con la
 * que D40 cuenta las filas que puede crecer el compositor.
 */
const ALTO_DE_RENGLON = 24

export default {
	components: {
		Icono,
	},
	props: {
		/**
		 * true con la conversación en blanco: el texto de ayuda es el de un chat nuevo de ia-spa.
		 */
		vacia: {
			type: Boolean,
			default: false,
		},
	},
	data() {
		return {
			texto: '',
			// true durante el POST: cubre el hueco entre el click y el 201 (recién
			// ahí existe el assistant pendiente que bloquea por hay_respuesta_en_curso).
			sending: false,
			// Alto del viewport para dimensionar el crecimiento del textarea.
			viewport_height: typeof window !== 'undefined' ? window.innerHeight : 800,
		}
	},
	computed: {
		hay_respuesta_en_curso() {
			return this.$store.getters['ai_chat/hay_respuesta_en_curso']
		},
		/**
		 * true mientras viaja el mensaje o el asistente está respondiendo: el botón es el
		 * «detener» apagado de ia-spa.
		 *
		 * @returns {Boolean}
		 */
		ocupado() {
			return this.hay_respuesta_en_curso || this.sending
		},
		puede_enviar() {
			return !this.hay_respuesta_en_curso && !this.sending && this.texto.trim() != ''
		},
		placeholder() {
			return this.vacia ? 'Preguntá lo que quieras' : 'Escribí tu mensaje'
		},
		/**
		 * El textarea crece hasta ~la mitad del alto del panel (D40): el panel mide
		 * min(88vh, 900px) y una línea ronda los 24px. Clampeado entre 3 y 14 filas,
		 * recalculado al redimensionar.
		 */
		composer_max_rows() {
			let alto_panel = Math.min(this.viewport_height * 0.88, 900)
			let filas = Math.floor(alto_panel / 2 / ALTO_DE_RENGLON)
			return Math.min(Math.max(filas, 3), 14)
		},
	},
	watch: {
		/**
		 * Cada cambio del texto (tipeo, envío que lo limpia, sugerencia que lo escribe) acomoda el
		 * alto del textarea con el DOM ya actualizado.
		 */
		texto() {
			let self = this
			this.$nextTick(function () {
				self.ajustar_alto()
			})
		},
	},
	mounted() {
		const self = this
		window.addEventListener('resize', self.on_window_resize)
		this.ajustar_alto()
		this.enfocar()
	},
	beforeDestroy() {
		const self = this
		window.removeEventListener('resize', self.on_window_resize)
	},
	methods: {
		on_window_resize() {
			this.viewport_height = window.innerHeight
			this.ajustar_alto()
		},
		/**
		 * El alto del textarea sigue a su contenido hasta `composer_max_rows` renglones (D40); de
		 * ahí en más scrollea adentro. Es el `ajustar_alto` de ia-spa con el tope de siempre de
		 * esta ventana: antes lo hacía `b-form-textarea` con `max-rows`.
		 *
		 * @returns {void}
		 */
		ajustar_alto() {
			let area = this.$refs.area
			if (!area) {
				return
			}
			// El padding de arriba y abajo (6px + 6px) entra en scrollHeight: el tope lo suma.
			let maximo = this.composer_max_rows * ALTO_DE_RENGLON + 12
			area.style.height = 'auto'
			area.style.height = Math.min(area.scrollHeight, maximo) + 'px'
			area.style.overflowY = area.scrollHeight > maximo ? 'auto' : 'hidden'
		},
		/**
		 * Pone el cursor en el texto, salvo en pantallas táctiles: ahí abrir el teclado solo
		 * porque se abrió el chat tapa media pantalla (mismo criterio que ia-spa).
		 *
		 * @returns {void}
		 */
		enfocar() {
			let tactil = typeof window !== 'undefined' && window.matchMedia && window.matchMedia('(pointer: coarse)').matches
			if (tactil || !this.$refs.area) {
				return
			}
			this.$refs.area.focus({ preventScroll: true })
		},
		/**
		 * Enter solo envía; Shift+Enter deja pasar el salto de línea (D40). Con una
		 * respuesta en curso, Enter no hace nada (el texto queda escrito). Mientras se está
		 * componiendo una palabra con el teclado (acentos con tecla muerta, IME) el Enter es de
		 * esa composición y no manda.
		 */
		on_keydown_enter(event) {
			if (event.shiftKey || event.isComposing) {
				return
			}
			event.preventDefault()
			this.send()
		},
		/**
		 * Para las sugerencias de la pantalla vacía: escribe el texto y lo manda por el mismo
		 * camino que uno tipeado (con su manejo del 409).
		 *
		 * @param {String} texto
		 */
		escribir_y_mandar(texto) {
			let self = this
			this.texto = texto
			this.$nextTick(function () {
				self.send()
			})
		},
		send() {
			let self = this
			let contenido = this.texto.trim()
			if (!contenido || !this.puede_enviar) {
				return
			}
			// El globo optimista sube al toque (D41): el input se limpia ya mismo.
			this.texto = ''
			this.sending = true
			this.enfocar()
			this.$store.dispatch('ai_chat/sendMessage', {
				contenido: contenido,
			})
				.then(() => {
					self.sending = false
				})
				.catch(err => {
					self.sending = false
					let data = err.response && err.response.data
					if (err.response && err.response.status == 409 && data && data.code == 'respuesta_en_curso') {
						// El servidor ya está generando una respuesta en esta conversación
						// (R2: doble clic o una pestaña vieja). Se repone el texto para no
						// perder lo escrito.
						self.texto = contenido
						self.$toast.error('Esperá la respuesta del asistente antes de mandar otro mensaje.')
						return
					}
					console.log(err)
				})
		},
	},
}
</script>

<style lang="sass">
@import '@/components/asistente-ia/_tokens'

.asistente-ia-composer
	flex-shrink: 0
	position: relative
	padding: 0 0 8px 0
	background: var(--ia-bg)

	&__columna
		+asistente-ia-columna

	// La píldora de ia-spa: fondo del compositor, radio 28, la sombra suave y, en claro, el borde
	// fino (en oscuro ia-spa no lo pone: el fondo ya se despega).
	&__caja
		display: flex
		align-items: flex-end
		gap: 8px
		width: 100%
		margin: 0
		padding: 8px 8px 8px 18px
		background: var(--ia-bg-compositor)
		border: 1px solid var(--ia-borde)
		border-radius: var(--ia-radio-compositor)
		box-shadow: var(--ia-sombra-compositor)
		box-sizing: border-box
		transition: box-shadow var(--ia-transicion)

	// 🔴 `box-shadow: none` y borde cero explícitos: common-vue/sass/_inputs.sass le pone a TODO
	// <textarea> del sistema la sombra diagonal de formulario. Gana por especificidad (una clase
	// contra el elemento pelado). Sin `.form-control` a propósito: así tampoco le llegan los
	// fondos y bordes de formulario de bootstrap ni los del modo oscuro (sass/_dark_theme.sass).
	//
	// El alto de un renglón con su padding (24 + 6 + 6) es el del botón de enviar (36): con una
	// sola línea los dos quedan alineados.
	&__texto
		flex: 1
		min-width: 0
		display: block
		min-height: 36px
		margin: 0
		padding: 6px 0
		border: 0
		border-radius: 0
		outline: none
		resize: none
		overflow-y: hidden
		background: transparent
		box-shadow: none
		color: var(--ia-texto)
		font-family: inherit
		// 16px y no menos: con menos, iOS hace zoom al enfocar.
		font-size: 16px
		line-height: 24px

		&::placeholder
			color: var(--ia-texto-3)

		&:focus, &:focus-visible
			outline: none
			box-shadow: none

	// El botón de enviar de ia-spa: un círculo negro (blanco en oscuro) con la flecha; apagado
	// mientras no hay nada que mandar.
	&__enviar
		flex: 0 0 auto
		display: inline-flex
		align-items: center
		justify-content: center
		width: 36px
		height: 36px
		padding: 0
		border: 0
		border-radius: 50%
		background: var(--ia-boton-enviar)
		color: var(--ia-boton-enviar-texto)
		box-shadow: none
		cursor: pointer
		transition: background var(--ia-transicion), opacity var(--ia-transicion)

		&:hover:not(:disabled)
			opacity: .85

		&:disabled
			background: var(--ia-boton-enviar-apagado)
			color: var(--ia-boton-enviar-apagado-texto)
			cursor: default

		&:focus
			outline: none

		&:focus-visible
			outline: 2px solid var(--ia-foco)
			outline-offset: 2px

		// Respondiendo: el cuadradito de «detener», en el color pleno pero apagado.
		&--esperando:disabled
			background: var(--ia-boton-enviar)
			color: var(--ia-boton-enviar-texto)
			opacity: .45

	&__aviso
		margin: 8px 0 0 0
		text-align: center
		font-size: .75rem
		line-height: 1.4
		color: var(--ia-texto-3)

html.dark-mode .asistente-ia-composer__caja
	border-color: transparent

@media screen and (max-width: 767px)
	.asistente-ia-composer
		padding-bottom: 6px

	.asistente-ia-composer__aviso
		font-size: .7rem
		margin-top: 6px

@media (prefers-reduced-motion: reduce)
	.asistente-ia-composer__caja, .asistente-ia-composer__enviar
		transition: none
</style>
