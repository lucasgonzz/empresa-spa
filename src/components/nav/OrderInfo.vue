<template>
	<div
	v-if="authenticated">
		<b-alert
		class="alert-online m-t-15 c-p s-2 apretable"
		show
		v-if="unconfirmed_orders.length >= 1 && !is_online_view"
		variant="danger">
			<div
			@click="toOrders">
				<h4 >
					{{ unconfirmed_orders.length }} pedidos sin confirmar
				</h4>
			</div>
		</b-alert>
		<b-alert
		class="alert-online m-t-15 c-p s-2 apretable"
		show
		v-if="messages_not_read >= 1 && !is_online_view"
		variant="danger">
			<div
			@click="toMessages">
				<h4 >
					{{ messages_not_read }} mensajes sin leer
				</h4>
			</div>
		</b-alert>
	</div>
</template>
<script>
export default {
	computed: {
		is_online_view() {
			return this.route_name == 'online'
		},
		orders() {
			return this.$store.state.order.models 
		},
		_unconfirmed_orders() {
			return this.$store.state.order.unconfirmed_models 
		},
        unconfirmed_orders() {
            if (this.has_online) {
                let orders = this.orders.filter(order => {
                	return order.order_status.name == 'Sin confirmar'
                })
                let unconfirmed_orders = this._unconfirmed_orders.filter(order => {
                	return order.order_status.name == 'Sin confirmar'
                })
                return orders.concat(unconfirmed_orders) 
            }
            return []
        },
        messages_not_read() {
            if (this.has_online) {
            	let messages_not_read = 0 
            	this.$store.state.buyer.models.forEach(model => {
            		model.messages.forEach(message => {
            			if (message.from_buyer && !message.read) {
            				messages_not_read++
            			}
            		})
            	})
            	return messages_not_read
            }
            return null
        },
	},
	methods: {
		toOrders() {
			this.$router.push({name: 'online', params: {view: 'pedidos', sub_view: null}})
		},
		toMessages() {
			this.$router.push({name: 'online', params: {view: 'mensajes', sub_view: null}})
		},
	}
}
</script>
<style lang="sass">
.alert-online
	margin: 0 15px
	h4
		margin-bottom: 1em
		&:last-child
			margin-bottom: 0
</style>