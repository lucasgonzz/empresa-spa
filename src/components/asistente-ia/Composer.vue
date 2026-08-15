<template>
	<div class="asistente-ia-composer">
		<b-form-textarea
		v-model="texto"
		id="asistente-ia-composer-text"
		placeholder="Escribile al asistente (Enter para enviar, Shift+Enter para salto de línea)"
		rows="1"
		:max-rows="composer_max_rows"
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
		puede_enviar() {
			return !this.hay_respuesta_en_curso && !this.sending && this.texto.trim() != ''
		},
		/**
		 * El textarea crece hasta ~la mitad del alto del panel (D40): el panel mide
		 * min(88vh, 900px) y una línea ronda los 24px. Clampeado entre 3 y 14 filas,
		 * recalculado al redimensionar.
		 */
		composer_max_rows() {
			let alto_panel = Math.min(this.viewport_height * 0.88, 900)
			let filas = Math.floor(alto_panel / 2 / 24)
			return Math.min(Math.max(filas, 3), 14)
		},
	},
	mounted() {
		const self = this
		window.addEventListener('resize', self.on_window_resize)
	},
	beforeDestroy() {
		const self = this
		window.removeEventListener('resize', self.on_window_resize)
	},
	methods: {
		on_window_resize() {
			this.viewport_height = window.innerHeight
		},
		/**
		 * Enter solo envía; Shift+Enter deja pasar el salto de línea (D40). Con una
		 * respuesta en curso, Enter no hace nada (el texto queda escrito).
		 */
		on_keydown_enter(event) {
			if (!event.shiftKey) {
				event.preventDefault()
				this.send()
			}
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
.asistente-ia-composer
	flex-shrink: 0
	display: flex
	flex-direction: row
	align-items: flex-end
	gap: 8px
	padding: 10px 18px 14px 18px
	border-top: 1px solid var(--color-border-secondary, #e9ecef)

	textarea
		flex: 1
		border-radius: 12px
		resize: none
</style>
