<template>
	<!--
		El input de pregunta va SIEMPRE abajo del informe (§2.2), esté o no el sidebar.
		Molde de asistente-ia/Composer.vue: una línea que crece, Enter manda y
		Shift+Enter hace salto de línea. La diferencia es qué pasa al mandar: si el
		informe no tiene conversación todavía, primero se crea la del informe
		(POST mostrador/reportes/{id}/conversacion) y recién ahí sale el mensaje por
		ai_chat/sendMessage, que ya la encuentra seleccionada.
	-->
	<div class="pregunta-input">
		<b-form-textarea
		ref="textarea"
		v-model="texto"
		:id="'pregunta-input-' + reporte.id"
		placeholder="Preguntale a tu asistente sobre este informe"
		rows="1"
		max-rows="6"
		no-resize
		@keydown.enter="on_keydown_enter"></b-form-textarea>
		<btn-loader
		:loader="sending"
		:block="false"
		:disabled="!puede_enviar"
		icon_class="bi bi-send"
		@clicked="send"></btn-loader>
	</div>
</template>

<script>
export default {
	components: {
		BtnLoader: () => import('@/common-vue/components/BtnLoader'),
	},
	props: {
		reporte: {
			type: Object,
			required: true,
		},
	},
	data() {
		return {
			texto: '',
			// true desde el click hasta que el POST del mensaje confirma (cubre el
			// hueco antes de que exista el assistant pendiente que bloquea).
			sending: false,
		}
	},
	computed: {
		con_conversacion() {
			return !!this.reporte.conversation_id
		},
		/**
		 * 🔴 Solo cuenta con conversación propia: ai_chat.messages es el de la
		 * conversación SELECCIONADA, que puede ser la de otro informe cerrado hace un
		 * rato (con una respuesta todavía en curso). Para un informe sin conversación
		 * eso no tiene que bloquear la primera pregunta.
		 */
		hay_respuesta_en_curso() {
			return this.con_conversacion && this.$store.getters['ai_chat/hay_respuesta_en_curso']
		},
		puede_enviar() {
			return !this.hay_respuesta_en_curso && !this.sending && this.texto.trim() != ''
		},
	},
	methods: {
		/**
		 * Enter solo envía; Shift+Enter deja pasar el salto de línea. Con una
		 * respuesta en curso, Enter no hace nada (el texto queda escrito).
		 */
		on_keydown_enter(event) {
			if (!event.shiftKey) {
				event.preventDefault()
				this.send()
			}
		},
		enfocar() {
			let self = this
			this.$nextTick(function () {
				if (self.$refs.textarea && typeof self.$refs.textarea.focus == 'function') {
					self.$refs.textarea.focus()
				}
			})
		},
		send() {
			let self = this
			let contenido = this.texto.trim()
			if (!contenido || !this.puede_enviar) {
				return
			}
			// El globo optimista sube al toque: el input se limpia ya mismo.
			this.texto = ''
			this.sending = true
			// Con conversación, el sidebar (o el cajón, en angosto) tiene que mostrarse
			// YA, con el globo optimista, y no recién cuando el POST confirme: contra
			// el API real el POST tarda más de lo que el ojo tolera sin respuesta.
			if (this.con_conversacion) {
				this.$emit('enviando')
			}

			// Sin conversación, primero se crea la del informe; con conversación, se
			// manda directo (el sidebar ya la dejó seleccionada en ai_chat).
			let conversacion_lista
			let creando = false
			if (this.con_conversacion) {
				conversacion_lista = Promise.resolve()
			} else {
				creando = true
				conversacion_lista = this.$store.dispatch('mostrador/crearConversacion', this.reporte.id)
					.then(function () {
						creando = false
						self.$emit('conversacion-creada')
					})
			}

			conversacion_lista
				.then(function () {
					return self.$store.dispatch('ai_chat/sendMessage', {
						contenido: contenido,
					})
				})
				.then(function () {
					self.sending = false
					self.$emit('enviado')
				})
				.catch(function (err) {
					self.sending = false
					let data = err.response && err.response.data
					if (creando) {
						// No se pudo abrir la conversación del informe: se repone el texto
						// para no perder la pregunta.
						self.texto = contenido
						self.$toast.error('No se pudo abrir la conversación de este informe. Probá de nuevo.')
						console.log(err)
						return
					}
					if (err.response && err.response.status == 409 && data && data.code == 'respuesta_en_curso') {
						// El servidor ya está generando una respuesta en esta conversación
						// (doble clic o una pestaña vieja): se repone el texto.
						self.texto = contenido
						self.$toast.error('Esperá la respuesta del asistente antes de mandar otra pregunta.')
						return
					}
					// Cualquier otra falla del envío ya dejó el globo en error con su
					// botón de reintento (ai_chat/sendMessage no rechaza en ese caso).
					console.log(err)
				})
		},
	},
}
</script>

<style lang="sass">
// Pegado al pie de la columna del informe (flex-shrink 0, sin position fixed): en
// el teléfono el panel ocupa el viewport y el teclado lo achica, así que el input
// queda a la vista arriba del teclado.
.pregunta-input
	flex-shrink: 0
	display: flex
	flex-direction: row
	align-items: flex-end
	gap: 8px
	padding: 10px 18px 14px 18px
	border-top: 1px solid var(--color-border-secondary, #e9ecef)
	background: var(--bg-card, #fff)

	textarea
		flex: 1
		border-radius: 12px
		resize: none
</style>
