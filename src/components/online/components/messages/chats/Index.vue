<template>
	<div
	class="chats-container">
		<b-button
		block
		variant="primary"
		class="d-md-none m-t-15"
		v-b-modal="'chats'">
			Buscar chat
		</b-button>
		<div
		class="d-none d-lg-block">
			<chat-search></chat-search>
			<chats-list></chats-list>
		</div>
	</div>
</template>
<script>
import ChatSearch from '@/components/online/components/messages/chats/ChatSearch'
import ChatsList from '@/components/online/components/messages/chats/ChatsList'
export default {
	components: {
		ChatSearch,
		ChatsList,
	},
}
</script>
<style lang="sass">
</style>