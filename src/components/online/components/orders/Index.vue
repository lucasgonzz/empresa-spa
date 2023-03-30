<template>
	<div>
		<cancel-order></cancel-order>
		<view-component
		v-if="view == 'pedidos'"
		show_previus_days
		:show_btn_delete="false"
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
		CancelOrder: () => import('@/components/online/modals/orders/CancelOrder'),  
		BtnStatus: () => import('@/components/online/components/orders/BtnStatus'), 
		BtnCancel: () => import('@/components/online/components/orders/BtnCancel'),
	},
}
</script>