<template>
	<b-modal
	id="whatsapp-new-chat"
	title="Nuevo chat de WhatsApp"
	ok-title="Iniciar chat"
	cancel-title="Cancelar"
	:ok-disabled="!phone"
	@ok="create"
	@hidden="reset">
		<b-form-group
		label="Teléfono">
			<b-form-input
			v-model="phone"
			placeholder="Ej: 5493511234567"></b-form-input>
		</b-form-group>

		<b-form-group
		label="Cliente (opcional)">
			<search-component
			id="whatsapp_new_chat_client"
			@setSelected="onClientSelected"
			@clearSelected="onClientCleared"
			:prop="{text: 'Cliente', key: 'client_id'}"
			:model="selected_client"
			model_name="client"
			:props_to_filter="['num', 'name', 'phone', 'dni', 'cuit']"
			search_from_api
			placeholder="Buscar cliente"
			input_icon="icon-user-o"></search-component>
		</b-form-group>
	</b-modal>
</template>
<script>
export default {
	components: {
		SearchComponent: () => import('@/common-vue/components/search/Index'),
	},
	data() {
		return {
			// Teléfono ingresado a mano (obligatorio para crear el chat).
			phone: '',
			// Cliente elegido en el buscador (opcional); se manda como client_id al crear.
			selected_client: null,
			loading: false,
		}
	},
	methods: {
		onClientSelected(result) {
			this.selected_client = result.model
		},
		onClientCleared() {
			this.selected_client = null
		},
		/**
		 * Crea (o recupera, si ya existía) el chat por teléfono y lo abre en la conversación.
		 */
		create() {
			if (!this.phone) {
				return
			}
			this.$store.commit('auth/setMessage', 'Creando chat')
			this.$store.commit('auth/setLoading', true)
			this.$store.dispatch('whatsapp_chat/createChat', {
				phone: this.phone,
				client_id: this.selected_client ? this.selected_client.id : null,
			})
			.then(chat => {
				this.$store.commit('auth/setLoading', false)
				this.$store.commit('auth/setMessage', '')
				this.$store.commit('whatsapp_chat/setSelectedChatId', chat.id)
				this.$store.commit('whatsapp_chat/setMessages', [])
				this.$store.dispatch('whatsapp_chat/getMessages', {chat_id: chat.id, page: 1})
				this.$bvModal.hide('whatsapp-new-chat')
			})
			.catch(err => {
				this.$store.commit('auth/setLoading', false)
				this.$store.commit('auth/setMessage', '')
				console.log(err)
				this.$toast.error('No se pudo crear el chat')
			})
		},
		reset() {
			this.phone = ''
			this.selected_client = null
		},
	},
}
</script>
