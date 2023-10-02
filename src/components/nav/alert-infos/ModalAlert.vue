<template>
<b-modal
title="Alertas"
hide-footer
id="modal-alert">
	<div 
	v-for="order in unconfirmed_orders"
	@click="toOrders()"
	class="alert-info apretable">
		<span
		v-if="order.buyer">
			Pedido sin confirmar de {{ order.buyer.name }} en la fecha {{ date(order.created_at) }}
		</span>
	</div>
	<div 
	v-for="message in messages_not_read"
	@click="toMessages()"
	class="alert-info apretable">
		<span
		v-if="message.buyer">
			Mensaje sin leer de {{ message.buyer.name }} en la fecha {{ date(message.created_at) }}
		</span>
	</div>
	<div 
	v-for="provider_order in provider_order_days_to_advise"
	@click="toProviderOrders()"
	class="alert-info apretable">
		<span
		v-if="provider_order.provider">
			Pedido de proveedor sin recibir de {{ provider_order.provider.name }} en la fecha {{ date(provider_order.created_at) }}
		</span>
	</div>
</b-modal>
</template>
<script>
import alert_infos from '@/mixins/alert_infos'
export default {
	mixins: [alert_infos],
	methods: {
		toOrders() {
			this.$bvModal.hide('modal-alert')
			this.$router.push({name: 'online', params: {view: 'pedidos', sub_view: null}})
		},
		toMessages() {
			this.$bvModal.hide('modal-alert')
			this.$router.push({name: 'online', params: {view: 'mensajes', sub_view: null}})
		},
		toProviderOrders() {
			this.$bvModal.hide('modal-alert')
			this.$router.push({name: 'provider', params: {view: 'pedidos', sub_view: null}})
		},
	}
}
</script>
<style lang="sass">
@import '@/sass/_custom'
.alert-info 
	border: 1px solid lighten($red, 20)
	background: lighten($red, 30)
	padding: 10px 15px
	margin-bottom: 10px
	border-radius: 7px
	cursor: pointer
	&:last-child 
		margin-bottom: 0
</style>
	