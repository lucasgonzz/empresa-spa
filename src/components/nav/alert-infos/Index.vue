<template>
	<div
	class="j-end p-t-10 p-b-10 p-r-5"
	v-if="authenticated && alerts > 0">
		<modal-alert></modal-alert>
		<div
		v-b-modal="'modal-alert'" 
		class="route">
			Alertas
			<b-button 
			variant="danger"
			class="apretable">
				<strong>
					{{ alerts }} 
				</strong>
			</b-button>
		</div>
	</div>
</template>
<script>
import alert_infos from '@/mixins/alert_infos'
export default {
	mixins: [alert_infos],
	components: {
		ModalAlert: () => import('@/components/nav/alert-infos/ModalAlert')
	},
	computed: {
		alerts() {
			return this.unconfirmed_orders.length + this.messages_not_read.length + this.provider_order_days_to_advise.length
		}
	},
}
</script>
