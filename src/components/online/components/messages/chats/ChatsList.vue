<template>
	<div
	class="m-t-15"
	id="chats-list">
		<div
		v-if="!loading">
			<b-list-group
			v-if="chats.length">
				<b-list-group-item
				:class="activeChat(chat)"
				v-for="chat in chats"
				:key="chat.id"
				class="chat c-p"
				@click="setSelectedBuyer(chat)">
					<b-badge
					variant="danger"
					class="m-r-10"
					v-show="messagesNotRead(chat) > 0">
						{{ messagesNotRead(chat) }}
					</b-badge>
					<span> 
						{{ chat.name }} {{ chat.surname }}
					</span>
				</b-list-group-item>
			</b-list-group>
			<p
			class="text-with-icon"
			v-else>
				<i class="icon-not"></i>
				No hay chats recientes
			</p>
		</div>
		<div
		v-else>
			<p
			class="text-center">
				Cargando chats...
			</p>
		</div>
	</div>
</template>
<script>
import online from '@/mixins/online'
import ChatSearch from '@/components/online/components/messages/chats/ChatSearch'
export default {
	mixins: [online],
	components: {
		ChatSearch,
	},
	computed: {
		selected_buyer() {
			return this.$store.state.message.selected_buyer
		},
		chats() {
			return this.$store.state.message.chats_to_show
		},
		loading() {
			return this.$store.state.buyer.loading
		},
	},
	mounted() {
		this.setSelectedBuyer(null)
	},
	// watch: {
	// 	$route(to, from) {
    //         let buyer = this.$store.state.buyer.models.find(b => {
    //         	return b.id == this.$route.params.chat_id
    //         })
	// 		this.$store.commit('message/setSelectedBuyer', buyer)
	// 	}
	// },
	methods: {
		setSelectedBuyer(buyer) {
			this.$store.commit('message/setSelectedBuyer', buyer)
			if (buyer) {
				if (this.$route.params.sub_view != buyer.id) {
					this.$router.push({name: 'online', params: {view: 'mensajes', sub_view: buyer.id}})
				} else {
					this.$store.dispatch('message/getModels')
				}
				this.setMessagesRead(buyer)
				this.$bvModal.hide('chats')
			}
		},
		activeChat(buyer) {
			return this.selected_buyer && buyer.id == this.selected_buyer.id ? 'active-chat' : ''
		},
	}
}
</script>
<style lang="sass">
@import '@/sass/_custom'
#chats-list 
	.chat 
		display: flex
		flex-direction: row 
		align-items: center
		justify-content: flex-start

	.active-chat 
		font-weight: bold
		color: #FFF
		background: $blue 
</style>