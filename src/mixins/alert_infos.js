import online from '@/mixins/online'
export default {
    mixins: [online],
	computed: {
		is_online_view() {
			return this.route_name == 'online'
		},
        orders() {
            return this.$store.state.order.models 
        },
        unconfirmed_orders_history() {
            return this.$store.state.order.unconfirmed_models 
        },
        unconfirmed_orders() {
            if (this.has_online) {
                let unconfirmed_orders_history = this.unconfirmed_orders_history.filter(order => {
                    return order.order_status.name == 'Sin confirmar' && order.buyer
                })
                let unconfirmed_orders = this.orders.filter(order => {
                    return order.order_status.name == 'Sin confirmar' && order.buyer
                })
                return unconfirmed_orders_history.concat(unconfirmed_orders)
            }
            return []
        },
        messages_not_read() {
            if (this.has_online) {
            	let messages_not_read = 0
                this.$store.state.message.chats_to_show.forEach(chats_to_show => {

                    messages_not_read += this.messagesNotRead(chats_to_show)

                })
                return messages_not_read
                // let messages_not_read = []
            	// this.$store.state.buyer.models.forEach(buyer => {
            	// 	buyer.messages.forEach(message => {
                //         // console.log(message)
            	// 		if (message.from_buyer && !message.read && message.buyer_id) {
                //             message.buyer = buyer
            	// 			messages_not_read.push(message)
            	// 		}
            	// 	})
            	// })
            	// return messages_not_read
            }
            return []
        },
        provider_order_days_to_advise() {
            return this.$store.state.provider_order.days_to_advise_models 
        },
        ventas_sin_cobrar() {
            return this.$store.state.sale.ventas_sin_cobrar.models 
        },
	},
}