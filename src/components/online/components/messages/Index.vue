<template>
	<div
	v-if="view == 'mensajes'">
		<chats-modal></chats-modal>	
		<b-row
		class="messages">
			<b-col
			class="col-chats"
			lg="3">
				<chats></chats>
			</b-col>
			<b-col
			class="col-messages"
			lg="9">
				<conversation></conversation>
			</b-col>
		</b-row>
	</div>
</template>
<script>
import ChatsModal from '@/components/online/components/messages/chats/MobileModal'
import Chats from '@/components/online/components/messages/chats/Index'
import Conversation from '@/components/online/components/messages/conversation/Index'
export default { 
	components: {
		ChatsModal,
		Chats,
		Conversation,
	},
	created() {
		console.log('creado messages')
		this.$store.commit('message/setChatsToShow')
	}
}
</script>
<style lang="sass">
$nav_height: 60px
$nav_margin: 1em
$online_nav_height: 42px
$online_nav_margin: 1em
.messages
	max-height: calc(100vh - 50px - 1em - 42px - 1em - 10px)
	margin-bottom: 0 !important
.col-messages
	height: calc(100vh - $nav_height - 65px)
	// height: calc(100vh - $nav_height - 15px - 42px - 15px - 50px)
	border-left: 1px solid rgba(0, 0, 0, .3)
	// box-shadow: 3px 0px 12px -3px rgba(0,0,0,0.7)
	// -webkit-box-shadow: 3px 0px 12px -3px rgba(0,0,0,0.7)
	// -moz-box-shadow: 3px 0px 12px -3px rgba(0,0,0,0.7)
	// border-left: .1em solid rgba(51,51,51,.5)
	// border-bottom: .1em solid rgba(51,51,51,.5)
.col-chats
	// border-bottom: .1em solid rgba(51,51,51,.5)
	padding-bottom: 1em
	@media screen and (max-width: 992px)
		height: 50px
</style>