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
			<template v-slot:modal_buttons="slotProps">
				<btn-status />
				<btn-cancel />
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
	},
	created() {
		this.$store.dispatch('order/getModels')
	}
}
</script>