<template>
	<div>
		<payment-card-info></payment-card-info>
		<payment-details></payment-details>
		<cancel-order></cancel-order>
		<view-component
		v-if="view == 'pedidos'"
		change_from_dates_option
		show_btn_pdf 
		:show_btn_delete="false"
		:show_btn_create="false"
		order_list_by="order_status"
		model_name="order">
			<template v-slot:modal_header="slotProps">
				<btn-status />
				<btn-cancel />
			</template>

			<!--
				El comprador viene EMBEBIDO en el pedido: Order::scopeWithAll de empresa-api ya
				trae 'buyer' en el eager loading, así que el teléfono está en memoria y no hay
				que pedir nada.

				🔴 La guarda del buyer es obligatoria: un pedido de invitado tiene buyer_id nulo
				y `slotProps.model.buyer` viene en null. Se usa un ternario y no un `&&` para que
				a la prop (que es String) le llegue siempre un String y nunca el null. Igual el
				botón se auto-protege: sin dígitos no se dibuja.
			-->
			<template v-slot:table_left_options="slotProps">
				<btn-whatsapp-chat
				:phone="slotProps.model.buyer ? slotProps.model.buyer.phone : ''"
				:display_name="slotProps.model.buyer ? slotProps.model.buyer.name : ''"></btn-whatsapp-chat>
			</template>
		</view-component>
	</div>
</template>
<script>
export default {
	components: {
		ViewComponent: () => import('@/common-vue/components/view/Index'),
		PaymentCardInfo: () => import('@/components/online/modals/orders/PaymentCardInfo'),  
		PaymentDetails: () => import('@/components/online/modals/orders/payment-details/Index'),  
		CancelOrder: () => import('@/components/online/modals/orders/CancelOrder'),  
		BtnStatus: () => import('@/components/online/components/orders/BtnStatus'), 
		BtnCancel: () => import('@/components/online/components/orders/BtnCancel'),
		BtnWhatsappChat: () => import('@/components/common/BtnWhatsappChat'),
	},
	created() {
		this.$store.dispatch('order/getModels')
	}
}
</script>