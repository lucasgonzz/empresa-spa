import online from '@/mixins/online'
export default {
    mixins: [online],
	methods: {
		listenChannelsLocal() {
            this.Echo.channel('message.from_buyer.'+this.owner_id)
            .notification((notification) => {
                console.log(notification)
                this.addBuyerMessage(notification.message)
                this.$store.dispatch('message/setChatsToShow')
                this.checkIfIsMessagesView(notification)
            });
            // Suscribe canal de soporte para chat interno con admin.
            this.listenSupportChannel()
		},
        checkIfIsMessagesView(noti) {
            if (this.$route.name == 'online' && this.view == 'mensajes' && this.$route.params.sub_view == noti.message.buyer_id) {
                console.log('se marcaron mensajes como leidos desde broadcast')
                this.setMessagesRead()
                this.scrollBottom('messages')
            }
        },
        /**
         * Escucha mensajes de soporte enviados desde admin-api.
         */
        listenSupportChannel() {
            this.Echo.channel('support.user.' + this.user.id)
            .listen('.SupportMessageReceived', event_data => {
                // Agrega mensaje en conversación activa para actualización inmediata.
                this.$store.commit('support_message/addModel', event_data.message)
                // Refresca lista de tickets para estados/orden.
                this.$store.dispatch('support_ticket/getModels')
            })
        }
	}
}