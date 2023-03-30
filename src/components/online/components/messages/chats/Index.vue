<template>
	<div
	class="chats-container">
		<b-button
		block
		variant="primary"
		class="d-md-none"
		v-b-modal="'chats'">
			Buscar chat
		</b-button>
		<div>
			<!-- <chat-search></chat-search> -->
			<chats-list></chats-list>
		</div>
	</div>
</template>
<script>
// import ChatSearch from '@/components/online/components/messages/chats/ChatSearch'
import ChatsList from '@/components/online/components/messages/chats/ChatsList'
export default {
	components: {
		// ChatSearch,
		ChatsList,
	},
}
</script>
<style lang="sass">
</style>