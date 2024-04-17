<template>
<b-modal
title="Alertas"
hide-footer
id="modal-alert">
	<div 
	v-for="sale in ventas_sin_cobrar"
	class="alert-info danger apretable">
		<strong>Venta sin cobrar N° {{ sale.num }}</strong> 
		<span
		v-if="sale.client">
			, de {{ sale.client.name }} ({{ price(sale.current_acount.debe) }})
		</span>
		hace {{ since(sale.created_at) }}
		<p
		v-if="sale.employee">
			Empleado: {{ sale.employee.name }}
		</p>
	</div>

	<div 
	v-for="order in unconfirmed_orders"
	@click="toOrders()"
	v-if="order.buyer"
	class="alert-info apretable">
		<strong>Pedido</strong> sin confirmar de {{ order.buyer.name }} en la fecha {{ date(order.created_at) }}
	</div>
	<div 
	v-for="message in messages_not_read"
	@click="toMessages()"
	v-if="message.buyer"
	class="alert-info apretable">
		<strong>Mensaje</strong> sin leer de {{ message.buyer.name }} en la fecha {{ date(message.created_at) }}
	</div>
	<div 
	v-for="provider_order in provider_order_days_to_advise"
	@click="toProviderOrders()"
	v-if="provider_order.provider"
	class="alert-info apretable">
		<strong>Pedido de proveedor</strong> sin recibir de {{ provider_order.provider.name }} en la fecha {{ date(provider_order.created_at) }}
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
	