import online from '@/mixins/online'
export default {
    mixins: [online],
    data() {
        return {
            /** Nombre del canal support.user.* actualmente suscrito (para Echo.leave al cambiar de usuario). */
            support_user_echo_channel: null,
        }
    },
    watch: {
        /**
         * Tras auth/me el usuario puede llegar después de `authenticated`; re-suscribe al canal correcto.
         */
        'user.id'() {
            this.listenSupportChannel()
        },
    },
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
         * Escucha mensajes de soporte enviados desde admin-api (empresa-api re-emite a support.user.{id}).
         * Deja el canal previo para no acumular listeners y re-enlaza al cargar el usuario.
         */
        listenSupportChannel() {
            if (!this.Echo) {
                return
            }
            if (this.support_user_echo_channel) {
                this.Echo.leave(this.support_user_echo_channel)
                this.support_user_echo_channel = null
            }
            if (!this.user || !this.user.id) {
                return
            }
            const support_user_channel = 'support.user.' + this.user.id
            this.support_user_echo_channel = support_user_channel
            this.Echo.channel(support_user_channel)
            .listen('.SupportMessageReceived', (event_data) => {
                if (!event_data || !event_data.message) {
                    return
                }
                const msg = event_data.message
                this.$store.commit('support_message/addModel', msg)
                // ticket + unread_messages_count: el API emite toArray; si faltan, se refresca la bandeja (badge en FloatingButton).
                if (msg.ticket && msg.ticket.id) {
                    this.$store.dispatch('support_ticket/applyTicketFromMessage', msg)
                } else if (msg.sender_type === 'admin' && msg.support_ticket_id) {
                    this.$store.dispatch('support_ticket/getModels')
                }
            })
            .listen('.SupportMessageRead', (event_data) => {
                if (event_data && event_data.message) {
                    this.$store.commit('support_message/patchMessageRead', event_data.message)
                    this.$store.dispatch('support_ticket/applyTicketFromMessage', event_data.message)
                }
            })
        }
	}
}