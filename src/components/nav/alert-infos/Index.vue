<template>
	<div
	v-if="authenticated">
		<modal-alert></modal-alert>

		<div 
		v-if="alerts > 0"
		v-b-modal="'modal-alert'"
		class="button-alert-info apretable">
			{{ alerts }} Alertas
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
	}
}
</script>
<style lang="sass">
@import '@/sass/_custom'
.button-alert-info
	background: $red
	padding: 10px 20px
	border-radius: 10px
	position: fixed 
	top: 75px
	right: 20px 
	z-index: 100
	color: #FFF
	font-weight: bold
	font-size: 1em
</style>