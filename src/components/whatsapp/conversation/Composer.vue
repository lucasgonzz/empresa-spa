<template>
	<div
	v-if="chat"
	class="whatsapp-composer">
		<!-- Chat en simulación: el backend FRENA todo envío de texto hacia WhatsApp mientras el
		último entrante sea simulado. Sin este aviso el operador escribía, apretaba enviar, la
		fila se guardaba y no salía nada: fallaba en silencio. -->
		<div
		v-if="en_simulacion"
		class="whatsapp-composer__simulacion">
			<strong class="whatsapp-composer__simulacion-titulo">
				<i class="bi bi-cone-striped"></i>
				Chat en simulación: los envíos a WhatsApp están frenados
			</strong>
			<span class="whatsapp-composer__simulacion-detalle">
				El último mensaje entrante lo inyectaste vos desde "Simular mensaje", así que la
				ventana de 24 h está forzada y no hay una conversación real abierta con este
				número. Lo que mandes se va a guardar acá y lo vas a ver en la conversación,
				pero <strong>al cliente no le llega</strong>. Se destraba solo en cuanto el
				cliente escriba de verdad.
			</span>
		</div>

		<div class="whatsapp-composer__toolbar">
			<b-button
			size="sm"
			variant="outline-secondary"
			:disabled="suggesting"
			@click="suggest">
				<i class="bi bi-magic"></i>
				{{ suggesting ? 'Sugiriendo...' : 'Sugerir respuesta' }}
			</b-button>
			<b-button
			size="sm"
			variant="outline-secondary"
			@click="$bvModal.show('whatsapp-templates')">
				<i class="bi bi-file-earmark-text"></i>
				Plantillas
			</b-button>
		</div>

		<div class="whatsapp-composer__input-row">
			<b-form-textarea
			v-model="text"
			id="whatsapp-composer-text"
			:placeholder="placeholder"
			rows="2"
			max-rows="6"
			@keydown.enter="onKeydownEnter"></b-form-textarea>
			<btn-loader
			:loader="sending"
			:block="false"
			icon="send"
			@clicked="send"></btn-loader>
		</div>

		<templates-modal
		:chat="chat"></templates-modal>
	</div>
</template>
<script>
import TemplatesModal from '@/components/whatsapp/conversation/TemplatesModal'
export default {
	components: {
		TemplatesModal,
		BtnLoader: () => import('@/common-vue/components/BtnLoader'),
	},
	data() {
		return {
			text: '',
			sending: false,
			suggesting: false,
		}
	},
	computed: {
		// El getter del store hace exactamente esto y ya existía; este computed estaba copiado
		// byte por byte también en conversation/Index.vue y en Header.vue.
		chat() {
			return this.$store.getters['whatsapp_chat/selected_chat']
		},
		/**
		 * El chat abierto está en modo simulación (ver el getter en `store/whatsapp_chat.js`:
		 * se resuelve mirando el último entrante cargado, que es lo único que el broadcast
		 * mantiene al día).
		 */
		en_simulacion() {
			return this.$store.getters['whatsapp_chat/chat_en_simulacion']
		},
		/**
		 * En simulación el placeholder también lo dice: el aviso de arriba se puede pasar por
		 * alto, el cursor no.
		 */
		placeholder() {
			if (this.en_simulacion) {
				return 'Simulación: lo que escribas se guarda pero no le llega al cliente'
			}
			return 'Escribí un mensaje (Enter para enviar, Shift+Enter para salto de línea)'
		},
	},
	methods: {
		/**
		 * Enter solo (sin Shift) envía el mensaje; Shift+Enter deja pasar el salto de línea normal.
		 *
		 * @param {KeyboardEvent} event
		 */
		onKeydownEnter(event) {
			if (!event.shiftKey) {
				event.preventDefault()
				this.send()
			}
		},
		send() {
			let body = this.text.trim()
			if (!body || !this.chat) {
				return
			}
			this.sending = true
			this.$store.dispatch('whatsapp_chat/sendMessage', {
				chat_id: this.chat.id,
				body: body,
			})
			.then(() => {
				this.sending = false
				this.text = ''
			})
			.catch(err => {
				this.sending = false
				console.log(err)
				let data = err.response && err.response.data
				if (err.response && err.response.status == 422 && data && data.code == 'fuera_de_ventana') {
					this.$toast.error(
						'Pasaron más de 24 h desde el último mensaje del cliente. WhatsApp solo permite retomar la conversación con una plantilla.',
						{ duration: 8000 }
					)
					this.$bvModal.show('whatsapp-templates')
					return
				}
				this.$toast.error((data && data.message) || 'No se pudo enviar el mensaje')
			})
		},
		/**
		 * Pide una sugerencia de la IA y la carga en el input, editable antes de enviar
		 * (nunca se envía sola).
		 */
		suggest() {
			if (!this.chat) {
				return
			}
			this.suggesting = true
			this.$store.dispatch('whatsapp_chat/suggest', this.chat.id)
			.then(suggestion => {
				this.suggesting = false
				this.text = suggestion || ''
			})
			.catch(err => {
				this.suggesting = false
				console.log(err)
				this.$toast.error('No se pudo generar la sugerencia')
			})
		},
	},
}
</script>
<style lang="sass">
.whatsapp-composer
	padding: 8px 14px 14px 14px
	background: #ffffff
	border-top: 1px solid rgba(0, 0, 0, .08)
	&__simulacion
		display: flex
		flex-direction: column
		gap: 2px
		background: #fff6e5
		border: 1px dashed #d39e00
		border-radius: 8px
		padding: 8px 10px
		margin-bottom: 8px
		text-align: left
		&-titulo
			display: flex
			flex-direction: row
			align-items: center
			gap: 6px
			font-size: .8rem
			color: #8a5b00
		&-detalle
			font-size: .74rem
			line-height: 1.35
			color: rgba(0, 0, 0, .65)
			// En teléfono el detalle come media pantalla. Se recorta a tres líneas y el resto
			// queda accesible al tocarlo (el título ya dice lo que hay que saber para no
			// mandar un mensaje creyendo que sale).
			@media screen and (max-width: 575px)
				max-height: 3.5em
				overflow-y: auto
	&__toolbar
		display: flex
		flex-direction: row
		gap: 8px
		margin-bottom: 6px
	&__input-row
		display: flex
		flex-direction: row
		align-items: flex-end
		gap: 8px
		textarea
			flex: 1
</style>
