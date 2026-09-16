<template>
	<div
	v-if="mostrar"
	class="whatsapp-bubble whatsapp-bubble--in whatsapp-bubble--sim whatsapp-simulated-composer"
	@click="enfocar">
		<textarea
		ref="textarea"
		v-model="body"
		class="whatsapp-simulated-composer__texto"
		rows="1"
		:disabled="enviando"
		placeholder="Escribí acá el próximo mensaje del cliente..."
		@keydown.enter="onKeydownEnter"></textarea>
		<div class="whatsapp-simulated-composer__footer">
			<i class="bi bi-cone-striped"></i>
			Simulando al cliente — Enter para mandar, Shift+Enter para salto de línea
		</div>
	</div>
</template>
<script>
/**
 * Misión whatsapp-mejoras-interfaz (15/9/2026), reemplaza a `SimulateInChatModal.vue`.
 *
 * Viñeta SIEMPRE presente al pie de la conversación mientras el interruptor de
 * "Simulación" del header está prendido (`state.whatsapp_chat.simulando_en_vivo`),
 * dibujada como si fuera el próximo mensaje del cliente: mismas clases que una burbuja
 * entrante real (`whatsapp-bubble--in`) más el borde punteado de `--sim`, pero el
 * "texto" es un `<textarea>` editable en vez de un `<p>`. Pedido de Lucas: que el
 * operador pueda simular un mensaje atrás de otro sin volver a abrir nada — acá se
 * manda con Enter y la misma viñeta queda lista, vacía, para el siguiente.
 *
 * La llamada a `simulateInbound` es la misma que usaba el modal que reemplaza; ese
 * action ya se encarga de appendear el mensaje a `state.messages` si el chat sigue
 * abierto, así que el mensaje recién simulado aparece solo, arriba de esta viñeta.
 */
const MAX_RENGLONES = 5

export default {
	props: {
		/** Chat abierto en la conversación (se usa chat.phone para la simulación). */
		chat: {
			type: Object,
			default: null,
		},
	},
	data() {
		return {
			// Texto que "escribe" el cliente, todavía sin mandar.
			body: '',
			enviando: false,
		}
	},
	computed: {
		mostrar() {
			return this.$store.state.whatsapp_chat.simulando_en_vivo
		},
		chat_id() {
			return this.$store.state.whatsapp_chat.selected_chat_id
		},
	},
	watch: {
		/**
		 * El texto a medio escribir era para la conversación anterior: no tiene sentido
		 * arrastrarlo a la que se abre ahora, y mucho menos mandarlo ahí por error.
		 */
		chat_id() {
			this.body = ''
		},
		body() {
			this.$nextTick(this.ajustar_alto)
		},
		/**
		 * Al prender el interruptor, el foco salta derecho a la viñeta: es lo que Lucas pidió
		 * ("el usuario puede hacer click y comenzar a escribir"), sin un click extra.
		 */
		mostrar(activo) {
			if (!activo) {
				return
			}
			this.$nextTick(() => {
				if (this.$refs.textarea) {
					this.$refs.textarea.focus()
				}
			})
		},
	},
	methods: {
		enfocar() {
			if (this.$refs.textarea) {
				this.$refs.textarea.focus()
			}
		},
		/**
		 * Mismo mecanismo que `Composer.vue::ajustar_alto()`: arranca en un renglón, crece
		 * hasta cinco y de ahí en más scrollea adentro. Ver el docblock de ese método para el
		 * porqué de cada línea — es el mismo cálculo, letra por letra.
		 *
		 * @returns {void}
		 */
		ajustar_alto() {
			let el = this.$refs.textarea
			if (!el) {
				return
			}
			let estilo = window.getComputedStyle(el)
			let borde = parseFloat(estilo.borderTopWidth) + parseFloat(estilo.borderBottomWidth)
			let relleno = parseFloat(estilo.paddingTop) + parseFloat(estilo.paddingBottom)
			let alto_renglon = parseFloat(estilo.lineHeight)
			if (isNaN(alto_renglon)) {
				alto_renglon = parseFloat(estilo.fontSize) * 1.4
			}
			let maximo = (alto_renglon * MAX_RENGLONES) + relleno + borde
			el.style.height = 'auto'
			let alto = el.scrollHeight + borde
			el.style.height = Math.min(alto, maximo) + 'px'
			el.style.overflowY = alto > maximo ? 'auto' : 'hidden'
		},
		/**
		 * Enter solo manda; Shift+Enter deja pasar el salto de línea normal — mismo contrato
		 * que el composer real.
		 *
		 * @param {KeyboardEvent} event
		 */
		onKeydownEnter(event) {
			if (!event.shiftKey) {
				event.preventDefault()
				this.enviar()
			}
		},
		/**
		 * Inyecta el mensaje en la conversación abierta y deja la viñeta lista para el
		 * siguiente: no se cierra nada, no hay que volver a clickear un botón.
		 *
		 * @returns {void}
		 */
		enviar() {
			let self = this
			let body = this.body.trim()
			if (!body || !this.chat || !this.chat.phone || this.enviando) {
				return
			}
			this.enviando = true
			this.$store.dispatch('whatsapp_chat/simulateInbound', {
				phone: this.chat.phone,
				body: body,
			})
			.then(function () {
				self.enviando = false
				self.body = ''
				self.$nextTick(function () {
					self.ajustar_alto()
					if (self.$refs.textarea) {
						self.$refs.textarea.focus()
					}
				})
			})
			.catch(function (err) {
				self.enviando = false
				console.log(err)
				self.mostrar_error(err)
			})
		},
		/**
		 * Mismo manejo de errores que tenía `SimulateInChatModal.vue` (429/403/422).
		 *
		 * @param {Object} err Error de axios.
		 */
		mostrar_error(err) {
			let status = err.response && err.response.status
			let data = err.response && err.response.data

			if (status == 429) {
				this.$toast.error(
					'Estás simulando muy seguido: el límite es 10 mensajes por minuto. Cada simulación gasta una llamada paga al agente, por eso el techo. Esperá un minuto y probá de nuevo.',
					{ duration: 8000 }
				)
				return
			}
			if (status == 403) {
				this.$toast.error('Solo el dueño puede simular mensajes entrantes.')
				return
			}
			// 422 de validación (con `errors` campo por campo): el interceptor global de
			// main.js ya muestra el detalle, no hace falta duplicar el toast.
			if (status == 422 && data && data.errors) {
				return
			}
			this.$toast.error((data && data.message) || 'No se pudo simular el mensaje')
		},
	},
}
</script>
<style lang="sass">
// El chasis (fondo, borde punteado, padding, radio, ancho máximo, alineación a la
// izquierda) sale entero de `.whatsapp-bubble`, `.whatsapp-bubble--in` y
// `.whatsapp-bubble--sim` (MessageBubble.vue): es EXACTAMENTE la burbuja de un mensaje
// simulado del cliente, que es justo lo que esta viñeta representa antes de mandarse.
// Acá solo se resetea el textarea para que no se note que es un input, y se agrega el
// pie que aclara qué es.
.whatsapp-simulated-composer
	cursor: text
	&__texto
		display: block
		width: 100%
		border: none
		background: transparent
		color: inherit
		font: inherit
		padding: 0
		margin: 0
		resize: none
		white-space: pre-wrap
		word-break: break-word
		outline: none
		// Arranca oculto: con un renglón vacío no hay nada que scrollear, y mostrarla desde el
		// principio se ve como un defecto visual en un campo recién dibujado.
		overflow-y: hidden
		&::placeholder
			color: inherit
			opacity: var(--wa-texto-tenue-op)
	&__footer
		display: flex
		align-items: center
		gap: 4px
		margin-top: 4px
		font-size: .68rem
		font-weight: 600
		opacity: var(--wa-texto-tenue-op)
</style>
