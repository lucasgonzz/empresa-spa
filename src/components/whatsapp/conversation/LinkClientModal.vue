<template>
	<b-modal
	id="whatsapp-link-client"
	title="Vincular cliente al chat"
	hide-footer
	@shown="onShown">
		<search-component
		id="whatsapp_link_client"
		@setSelected="onClientSelected"
		@clearSelected="onClientCleared"
		:prop="{text: 'Cliente', key: 'client_id'}"
		:model="selected_client"
		model_name="client"
		:props_to_filter="['num', 'name', 'phone', 'dni', 'cuit']"
		search_from_api
		placeholder="Buscar cliente"
		input_icon="icon-user-o"></search-component>

		<div class="whatsapp-link-client__actions">
			<b-button
			v-if="chat && chat.client"
			variant="outline-danger"
			size="sm"
			@click="unlink">
				Quitar vínculo actual
			</b-button>
			<btn-loader
			text="Vincular"
			:loader="loading"
			:block="false"
			:disabled="!selected_client"
			@clicked="link"></btn-loader>
		</div>
	</b-modal>
</template>
<script>
export default {
	components: {
		SearchComponent: () => import('@/common-vue/components/search/Index'),
		BtnLoader: () => import('@/common-vue/components/BtnLoader'),
	},
	props: {
		chat: {
			type: Object,
			default: null,
		},
	},
	data() {
		return {
			selected_client: null,
			loading: false,
		}
	},
	methods: {
		/**
		 * Precarga el cliente ya vinculado (si hay) cada vez que se abre el modal.
		 */
		onShown() {
			this.selected_client = this.chat && this.chat.client ? this.chat.client : null
		},
		onClientSelected(result) {
			this.selected_client = result.model
		},
		onClientCleared() {
			this.selected_client = null
		},
		link() {
			if (!this.selected_client) {
				return
			}
			this.save(this.selected_client.id)
		},
		unlink() {
			this.selected_client = null
			this.save(null)
		},
		/**
		 * Vincula o desvincula (client_id null) el chat al cliente elegido.
		 *
		 * @param {number|null} client_id
		 */
		save(client_id) {
			this.loading = true
			this.$store.dispatch('whatsapp_chat/linkClient', {
				chat_id: this.chat.id,
				client_id: client_id,
			})
			.then(() => {
				this.loading = false
				this.$toast.success('Chat actualizado')
				this.$bvModal.hide('whatsapp-link-client')
			})
			.catch(err => {
				this.loading = false
				console.log(err)
				this.$toast.error('No se pudo actualizar el vínculo')
			})
		},
	},
}
</script>
<style lang="sass">
.whatsapp-link-client__actions
	display: flex
	flex-direction: row
	justify-content: flex-end
	gap: 10px
	margin-top: 15px
</style>
