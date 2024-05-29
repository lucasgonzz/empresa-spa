import alert_infos from '@/mixins/alert_infos'
export default {
	mixins: [alert_infos],
	methods: {
		alerts_count() {
			return Number(this.unconfirmed_orders.length) + Number(this.messages_not_read) + Number(this.provider_order_days_to_advise.length) + Number(this.ventas_sin_cobrar.length)
		}
	}
}