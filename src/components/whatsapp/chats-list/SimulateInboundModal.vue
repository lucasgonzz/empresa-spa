<template>
	<b-modal
	id="whatsapp-simulate-inbound"
	title="Simular mensaje del cliente"
	hide-footer
	size="lg"
	@hidden="reset">
		<b-alert
		show
		variant="warning"
		class="whatsapp-simulate__aviso">
			<strong>
				<i class="bi bi-cone-striped"></i>
				Esto no le manda nada a nadie.
			</strong>
			El mensaje entra como si lo hubiera escrito el cliente y recorre el mismo camino que
			uno real (ventana de 24 h, agrupación de mensajes seguidos y agente), pero queda
			marcado como simulado: lo que el agente conteste se guarda y se ve en la
			conversación, y <strong>no sale hacia WhatsApp</strong>. El chat vuelve a enviar de
			verdad solo cuando el cliente escriba en serio.
		</b-alert>

		<b-form-group
		label="Cliente (opcional)">
			<search-component
			id="whatsapp_simulate_client"
			@setSelected="onClientSelected"
			@clearSelected="onClientCleared"
			:prop="{text: 'Cliente', key: 'client_id'}"
			:model="selected_client"
			model_name="client"
			:props_to_filter="['num', 'name', 'phone', 'dni', 'cuit']"
			search_from_api
			placeholder="Buscar cliente"
			input_icon="icon-user-o"></search-component>
			<small class="text-muted whatsapp-simulate__hint">
				Si el cliente tiene teléfono cargado, se completa abajo solo. También podés
				escribir un número a mano y listo.
			</small>
		</b-form-group>

		<b-form-group
		label="Teléfono">
			<b-form-input
			v-model="phone"
			placeholder="Ej: 5493511234567"></b-form-input>
			<small class="text-muted whatsapp-simulate__hint">
				Si ya hay un chat con ese número, el mensaje entra en ese chat. Si no, se crea uno.
			</small>
		</b-form-group>

		<b-form-group
		label="Mensaje del cliente">
			<b-form-textarea
			v-model="body"
			rows="3"
			max-rows="8"
			placeholder="Hola! Tenés stock de..."></b-form-textarea>
			<small class="text-muted whatsapp-simulate__hint">
				Hasta 2000 caracteres. Se pueden simular 10 mensajes por minuto: cada uno gasta
				una llamada paga al agente.
			</small>
		</b-form-group>

		<div class="whatsapp-simulate__actions">
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
export default {
	components: {
		SearchComponent: () => import('@/common-vue/components/search/Index'),
		BtnLoader: () => import('@/common-vue/components/BtnLoader'),
	},
	data() {
		return {
			// Teléfono al que se le inyecta el mensaje. Se puede escribir a mano o llenar
			// eligiendo un cliente del buscador.
			phone: '',
			// Texto que "escribe" el cliente.
			body: '',
			// Cliente elegido en el buscador (solo se usa para completar el teléfono: el
			// endpoint de simulación recibe `phone` y `body`, nada más).
			selected_client: null,
			loading: false,
		}
	},
	computed: {
		puede_simular() {
			return !!this.phone.trim() && !!this.body.trim()
		},
	},
	methods: {
		/**
		 * Al elegir un cliente se completa el teléfono con el que tiene cargado. Si no tiene,
		 * se avisa y se deja el campo como está para escribirlo a mano.
		 *
		 * @param {Object} result Payload de search-component: { model, prop, query, ... }
		 */
		onClientSelected(result) {
			this.selected_client = result.model
			if (this.selected_client && this.selected_client.phone) {
				this.phone = String(this.selected_client.phone)
				return
			}
			this.$toast.warning('Ese cliente no tiene teléfono cargado. Escribí el número a mano.')
		},
		onClientCleared() {
			this.selected_client = null
		},
		/**
		 * Inyecta el mensaje y deja el chat abierto con la conversación cargada: ver lo que
		 * contestó el agente es todo el punto de simular, así que no alcanza con avisar que
		 * salió bien.
		 */
		simulate() {
			let self = this
			let phone = this.phone.trim()
			let body = this.body.trim()
			if (!phone || !body) {
				return
			}
			this.loading = true
			this.$store.dispatch('whatsapp_chat/simulateInbound', {
				phone: phone,
				body: body,
			})
			.then(chat => {
				self.loading = false
				self.$bvModal.hide('whatsapp-simulate-inbound')
				if (!chat) {
					self.$toast.warning('El mensaje se simuló pero no se pudo recuperar el chat. Buscalo en la bandeja.')
					self.$store.dispatch('whatsapp_chat/getChats')
					return
				}
				// Antes acá se repetía el trío setSelectedChatId + setMessages + getMessages:
				// ahora la carga la dispara el watch de conversation/Index.vue.
				self.abrir_chat_whatsapp({chat_id: chat.id})
				self.$toast.success('Mensaje simulado. La respuesta del agente aparece sola cuando esté lista.')
			})
			.catch(err => {
				self.loading = false
				console.log(err)
				self.mostrar_error(err)
			})
		},
		/**
		 * Traduce el error del backend a algo que se entienda. El 429 es el caso que más va a
		 * pasar mientras se prueba (throttle propio de 10 por minuto en la ruta) y con el
		 * mensaje genérico parecía que el sistema estaba roto.
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
			this.phone = ''
			this.body = ''
			this.selected_client = null
		},
	},
}
</script>
<style lang="sass">
.whatsapp-simulate
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
