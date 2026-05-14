import alert_infos from '@/mixins/alert_infos'
export default {
	mixins: [alert_infos],
	methods: {
		/**
		 * Devuelve la cantidad de sincronizaciones TN con estado 'error'.
		 * Usada como budget_function en el ítem de menú "Tienda Nube".
		 *
		 * @returns {number}
		 */
		tn_failed_syncs_count() {
			return this.tn_sync_failed_count
		},
		/**
		 * Total para el badge del ítem "Tienda Online": pedidos sin confirmar más mensajes sin leer.
		 * Usa las mismas fuentes y permisos que las alertas globales para esos dos rubros.
		 *
		 * @returns {number}
		 */
		online_menu_alert_count() {
			if (!this.has_online) {
				return 0
			}
			let total = 0
			if (this.can('alerts.orders')) {
				total += Number(this.unconfirmed_orders.length)
			}
			if (this.can('alerts.messages')) {
				total += Number(this.messages_not_read)
			}
			return total
		},
		alerts_count() {
			let total = 0
			
			total += this.ventas_sin_cobrar.length

			if (this.can('alerts.provider_orders')) {
				total += Number(this.provider_order_days_to_advise.length)
			}
			
			if (this.can('alerts.orders')) {
				total += Number(this.unconfirmed_orders.length)
			}
			
			if (this.can('alerts.messages')) {
				total += Number(this.messages_not_read)
			}
			
			if (this.can('alerts.problemas_al_facturar')) {
				total += Number(this.problemas_al_facturar.length)
			}
			
			total += Number(this.articles_stock_minimo.length)

			total += Number(this.deposit_movements_en_curso.length)
			

			return  total
		}
	}
}