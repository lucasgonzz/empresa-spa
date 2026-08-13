import online from '@/mixins/online'
export default {
    mixins: [online],
	computed: {
        articles_stock_minimo() {
            let models = this.$store.state.inventory_performance.models

            if (
                this.$store.state.inventory_performance.models[0]
                && this.$store.state.inventory_performance.models[0].articles_stock_minimo
            ) {
                return this.$store.state.inventory_performance.models[0].articles_stock_minimo
            }

            return []
        },
        problemas_al_facturar() {
            return this.$store.state.afip_ticket.problemas_al_facturar 
        },
        deposit_movements_en_curso() {
            return this.$store.state.deposit_movement.en_curso.models 
        },
		is_online_view() {
			return this.route_name == 'online'
		},
        unconfirmed_orders_history() {
            return this.$store.state.order.unconfirmed_models
        },
        /**
         * Pedidos sin confirmar que alimentan la alerta del nav y el modal de alertas.
         *
         * 🔴 Sale de UNA sola coleccion, y ese es el arreglo (mision 43, 12/8/2026). Antes se
         * concatenaban dos: `unconfirmed_models` (que pide start_methods.js, sin filtro de fecha)
         * y `order.models` (que bajaba el arranque, y eran los pedidos DEL DIA). Un pedido sin
         * confirmar de hoy estaba en las dos y se contaba y se listaba dos veces. Se corrige por
         * construccion y no deduplicando por id: `order` salio del arranque (ver call_methods.js),
         * asi que `order.models` ya no tiene los pedidos del dia al iniciar, y de todas formas
         * `unconfirmed_models` los incluye a todos -- es el unico endpoint que trae los sin
         * confirmar de cualquier fecha.
         *
         * Ver prompts/hallazgos/20260811-arranque-baja-pedidos-del-dia-y-la-alerta-los-duplica.json
         *
         * @returns {Array}
         */
        unconfirmed_orders() {
            if (this.has_online) {
                return this.unconfirmed_orders_history.filter(order => {
                    return order.order_status.name == 'Sin confirmar' && order.buyer
                })
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

        /**
         * Cantidad de sincronizaciones con Tienda Nube que terminaron con error.
         * Alimenta el badge del ítem de menú "Tienda Nube".
         */
        tn_sync_failed_count() {
            return this.$store.state.sync_to_tn_article.failed_count
        },
	},
}