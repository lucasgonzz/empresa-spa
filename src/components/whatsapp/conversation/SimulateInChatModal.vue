<template>
	<b-modal
	id="whatsapp-simulate-in-chat"
	title="Simular mensaje del cliente"
	hide-footer
	size="lg"
	@hidden="reset">
		<b-alert
		show
		variant="warning"
		class="whatsapp-simulate-in-chat__aviso">
			<strong>
				<i class="bi bi-cone-striped"></i>
				Esto no le manda nada a nadie.
			</strong>
			El mensaje entra como si lo hubiera escrito el cliente y recorre el mismo camino que
			uno real (ventana de 24 h, agrupación de mensajes seguidos y agente) en esta
			conversación, pero queda marcado como simulado: lo que el agente conteste se guarda y
			se ve acá mismo, y <strong>no sale hacia WhatsApp</strong>. El chat vuelve a enviar de
			verdad solo cuando el cliente escriba en serio.
		</b-alert>

		<b-form-group
		label="Mensaje del cliente">
			<b-form-textarea
			v-model="body"
			rows="3"
			max-rows="8"
			placeholder="Hola! Tenés stock de..."></b-form-textarea>
			<small class="text-muted whatsapp-simulate-in-chat__hint">
				Hasta 2000 caracteres. Se pueden simular 10 mensajes por minuto: cada uno gasta
				una llamada paga al agente.
			</small>
		</b-form-group>

		<div class="whatsapp-simulate-in-chat__actions">
			<btn-loader
			text="Simular mensaje"
			icon_class="bi bi-play-fill"
			:loader="loading"
			:block="false"
			:disabled="!puede_simular"
			@clicked="simulate"></btn-loader>
		</div>
	</b-modal>
</template>
<script>
/**
 * Versión reducida de `chats-list/SimulateInboundModal.vue`, scoped a la conversación abierta:
 * ya se sabe el teléfono (`chat.phone`), así que no lleva buscador de cliente ni campo de
 * teléfono, solo el textarea del mensaje.
 */
export default {
	components: {
		BtnLoader: () => import('@/common-vue/components/BtnLoader'),
	},
	props: {
		/** Chat abierto en la conversación (se usa chat.phone para la simulación). */
		chat: {
			type: Object,
			default: null,
		},
	},
	data() {
		return {
			// Texto que "escribe" el cliente.
			body: '',
			loading: false,
		}
	},
	computed: {
		puede_simular() {
			return !!(this.chat && this.chat.phone) && !!this.body.trim()
		},
	},
	methods: {
		/**
		 * Inyecta el mensaje en la conversación ya abierta. A diferencia del modal de la
		 * bandeja, acá no hace falta re-navegar al chat: ya está a la vista, y la respuesta del
		 * agente aparece sola cuando esté lista.
		 */
		simulate() {
			let self = this
			let body = this.body.trim()
			if (!this.chat || !this.chat.phone || !body) {
				return
			}
			this.loading = true
			this.$store.dispatch('whatsapp_chat/simulateInbound', {
				phone: this.chat.phone,
				body: body,
			})
			.then(() => {
				self.loading = false
				self.$bvModal.hide('whatsapp-simulate-in-chat')
				self.body = ''
				self.$toast.success('Mensaje simulado. La respuesta del agente aparece sola cuando esté lista.')
			})
			.catch(err => {
				self.loading = false
				console.log(err)
				self.mostrar_error(err)
			})
		},
		/**
		 * Mismo manejo de errores que `chats-list/SimulateInboundModal.vue` (429/403/422).
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
		reset() {
			this.body = ''
		},
	},
}
</script>
<style lang="sass">
.whatsapp-simulate-in-chat
	&__aviso
		font-size: .85rem
	&__hint
		display: block
		margin-top: 6px
	&__actions
		display: flex
		flex-direction: row
		justify-content: flex-end
		margin-top: 15px
</style>
