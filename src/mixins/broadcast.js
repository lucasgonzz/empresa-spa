import online from '@/mixins/online'
export default {
    mixins: [online],
	methods: {
		listenChannelsLocal() {
            this.Echo.channel('message.from_buyer.'+this.owner_id)
            .notification((notification) => {
                console.log(notification)
                this.addBuyerMessage(notification.message)
                this.$store.commit('message/setChatsToShow')
                this.checkIfIsMessagesView(notification)
            });
		},
        checkIfIsMessagesView(noti) {
            if (this.$route.name == 'online' && this.view == 'mensajes' && this.$route.params.sub_view == noti.message.buyer_id) {
                console.log('se marcaron mensajes como leidos desde broadcast')
                this.setMessagesRead()
                this.scrollBottom('messages')
            }
        }
	}
}