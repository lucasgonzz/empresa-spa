import alert_infos from '@/mixins/alert_infos'
export default {
	mixins: [alert_infos],
	methods: {
		alerts_count() {
			let total = 0
			
			if (this.can('alerts.provider_orders')) {
				total += Number(this.provider_order_days_to_advise.length)
			}
			
			if (this.can('alerts.orders')) {
				total += Number(this.unconfirmed_orders.length)
			}
			
			if (this.can('alerts.messages')) {
				total += Number(this.messages_not_read)
			}

			return  total
		}
	}
}