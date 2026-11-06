<template>
	<b-modal
	id="whatsapp-new-chat"
	title="Nuevo chat de WhatsApp"
	ok-title="Iniciar chat"
	cancel-title="Cancelar"
	:ok-disabled="loading || (!is_test && !phone.trim())"
	:cancel-disabled="loading"
	:no-close-on-backdrop="loading"
	:no-close-on-esc="loading"
	:hide-header-close="loading"
	@ok="create"
	@hidden="reset">
		<div v-if="is_owner" class="whatsapp-new-chat__test">
			<b-form-checkbox switch v-model="is_test">
				<strong>Chat de prueba</strong>
			</b-form-checkbox>
			<p>Practicá con el agente simulando mensajes de un cliente.</p>
		</div>
		<b-form-group
		v-if="!is_test"
		label-for="whatsapp-new-chat-phone"
		label="Teléfono">
			<div class="whatsapp-new-chat__phone">
				<i class="bi bi-telephone" aria-hidden="true"></i>
				<b-form-input
				id="whatsapp-new-chat-phone"
				v-model="phone"
				type="tel"
				autocomplete="tel"
				placeholder="Ej. +54 9 351 123 4567"
				@keydown.enter.prevent="create()"></b-form-input>
			</div>
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
			is_test: false,
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
		create(event) {
			if (event) {
				event.preventDefault()
			}
			if (this.loading || (!this.is_test && !this.phone.trim())) {
				return
			}
			this.loading = true
			this.$store.dispatch('whatsapp_chat/createChat', {
				phone: this.is_test ? null : this.phone.trim(),
				is_test: this.is_test,
				client_id: this.selected_client ? this.selected_client.id : null,
			})
			.then(chat => {
				// Antes acá se repetía el trío setSelectedChatId + setMessages + getMessages:
				// ahora la carga la dispara el watch de conversation/Index.vue.
				this.abrir_chat_whatsapp({chat_id: chat.id})
				this.$bvModal.hide('whatsapp-new-chat')
			})
			.catch(err => {
				const data = err.response && err.response.data
				this.$toast.error((data && data.message) || 'No se pudo crear el chat')
			})
			.finally(() => {
				this.loading = false
			})
		},
		reset() {
			this.phone = ''
			this.is_test = false
			this.selected_client = null
		},
	},
}
</script>
<style lang="sass">
.whatsapp-new-chat
	&__test
		padding: .8rem 1rem
		margin-bottom: 1rem
		border: 1px solid var(--color-border)
		border-radius: 12px
		background: var(--bg-section)
		.custom-switch
			padding-left: 3rem
			.custom-control-label
				cursor: pointer
				&::before
					width: 2.4rem
					height: 1.35rem
					border-radius: 1rem
					left: -3rem
					top: .05rem
				&::after
					width: 1.05rem
					height: 1.05rem
					left: -2.85rem
					top: .2rem
			.custom-control-input:checked ~ .custom-control-label
				&::before
					background: var(--wa-verde)
					border-color: var(--wa-verde)
				&::after
					transform: translateX(1.05rem)
		p
			margin: .35rem 0 0
			font-size: .85rem
			color: var(--color-text-secondary)
	&__phone
		position: relative
		i
			position: absolute
			left: .85rem
			top: 50%
			transform: translateY(-50%)
			color: var(--color-text-secondary)
			pointer-events: none
		input.form-control
			padding-left: 2.45rem
			border-radius: 10px
			min-height: 42px
</style>
