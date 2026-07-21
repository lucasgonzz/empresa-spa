<template>
	<div
	class="whatsapp-conversation">
		<p
		v-if="!chat"
		class="text-with-icon whatsapp-conversation__empty">
			<i class="bi bi-whatsapp"></i>
			Elegí un chat para ver la conversación
		</p>
		<div
		v-else
		class="whatsapp-conversation__content">
			<header-component></header-component>
			<messages></messages>
			<composer></composer>
		</div>
	</div>
</template>
<script>
import HeaderComponent from '@/components/whatsapp/conversation/Header'
import Messages from '@/components/whatsapp/conversation/Messages'
import Composer from '@/components/whatsapp/conversation/Composer'
export default {
	components: {
		HeaderComponent,
		Messages,
		Composer,
	},
	computed: {
		chat() {
			let selected_chat_id = this.$store.state.whatsapp_chat.selected_chat_id
			return this.$store.state.whatsapp_chat.chats.find(c => c.id == selected_chat_id) || null
		},
	},
}
</script>
<style lang="sass">
.whatsapp-conversation
	height: 100%
	&__empty
		height: 100%
		display: flex
		flex-direction: column
		align-items: center
		justify-content: center
		color: rgba(0, 0, 0, .45)
		i
			font-size: 2.5rem
			margin-bottom: 10px
	&__content
		height: 100%
		display: flex
		flex-direction: column
</style>
