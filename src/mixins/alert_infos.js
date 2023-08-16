export default {
	computed: {
		is_online_view() {
			return this.route_name == 'online'
		},
		_unconfirmed_orders() {
			return this.$store.state.order.unconfirmed_models 
		},
        unconfirmed_orders() {
            if (this.has_online) {
                return this._unconfirmed_orders.filter(order => {
                	return order.order_status.name == 'Sin confirmar'
                })
            }
            return []
        },
        messages_not_read() {
            if (this.has_online) {
            	let messages_not_read = []
            	this.$store.state.buyer.models.forEach(model => {
            		model.messages.forEach(message => {
            			if (message.from_buyer && !message.read) {
            				messages_not_read++
            				messages_not_read.push(message)
            			}
            		})
            	})
            	return messages_not_read
            }
            return []
        },
        provider_order_days_to_advise() {
			return this.$store.state.provider_order.days_to_advise_models 
        },
	},
}