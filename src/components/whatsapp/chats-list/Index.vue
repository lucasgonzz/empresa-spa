<template>
	<div
	class="whatsapp-chats-list">
		<div class="whatsapp-chats-list__header">
			<chat-search></chat-search>
			<b-button
			size="sm"
			variant="success"
			class="whatsapp-chats-list__new-btn"
			v-b-modal="'whatsapp-new-chat'">
				<i class="bi bi-plus-lg"></i>
				Nuevo chat
			</b-button>
		</div>

		<div class="whatsapp-chats-list__body">
			<p
			v-if="loading"
			class="text-center text-muted m-t-20">
				Cargando chats...
			</p>
			<p
			v-else-if="!chats.length"
			class="text-center text-muted m-t-20">
				No hay chats para mostrar
			</p>
			<chat-row
			v-else
			v-for="chat in chats"
			:key="chat.id"
			:chat="chat"
			:is_active="chat.id == selected_chat_id"
			@select="selectChat"></chat-row>
		</div>

		<new-chat-modal></new-chat-modal>
	</div>
</template>
<script>
import ChatSearch from '@/components/whatsapp/chats-list/ChatSearch'
import ChatRow from '@/components/whatsapp/chats-list/ChatRow'
import NewChatModal from '@/components/whatsapp/chats-list/NewChatModal'
export default {
	components: {
		ChatSearch,
		ChatRow,
		NewChatModal,
	},
	computed: {
		chats() {
			return this.$store.state.whatsapp_chat.chats
		},
		loading() {
			return this.$store.state.whatsapp_chat.loading_chats
		},
		selected_chat_id() {
			return this.$store.state.whatsapp_chat.selected_chat_id
		},
	},
	methods: {
		/**
		 * Abre la conversación del chat elegido: fija el seleccionado, carga la primera
		 * página de mensajes y marca el chat como leído (limpia su badge).
		 *
		 * @param {Object} chat
		 */
		selectChat(chat) {
			this.$store.commit('whatsapp_chat/setSelectedChatId', chat.id)
			// Limpia la conversación anterior para no mostrar mensajes de otro chat mientras carga.
			this.$store.commit('whatsapp_chat/setMessages', [])
			this.$store.dispatch('whatsapp_chat/getMessages', {chat_id: chat.id, page: 1})
			if (chat.unread_count > 0) {
				this.$store.dispatch('whatsapp_chat/markRead', chat.id)
			}
		},
	},
}
</script>
<style lang="sass">
.whatsapp-chats-list
	height: 100%
	display: flex
	flex-direction: column
	&__header
		display: flex
		flex-direction: row
		align-items: center
		padding: 8px 8px 4px 0
	&__new-btn
		flex-shrink: 0
		white-space: nowrap
		margin-right: 8px
	&__body
		flex: 1
		overflow-y: auto
</style>
