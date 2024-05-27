import alert_infos from '@/mixins/alert_infos'
export default {
	mixins: [alert_infos],
	methods: {
		alerts_count() {
			return this.unconfirmed_orders.length + this.messages_not_read + this.provider_order_days_to_advise.length + this.ventas_sin_cobrar.length
		}
	}
}