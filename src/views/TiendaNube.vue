<template>
	<div>
		<!-- <payment-card-info></payment-card-info>
		<payment-details></payment-details>
		<cancel-order></cancel-order> -->
		<view-component
		v-if="view == 'pedidos'"
		change_from_dates_option
		:show_btn_delete="false"
		:show_btn_create="false"
		order_list_by="tienda_nube_order_status"
		model_name="tienda_nube_order">
			<template v-slot:model_modal_header="slotProps">
				<btn-confirmar/>
			</template>
		</view-component>
	</div>
</template>
<script>
export default {
	components: {
		ViewComponent: () => import('@/common-vue/components/view/Index'),
		BtnConfirmar: () => import('@/components/tienda-nube/components/BtnConfirmar'), 
	},
	created() {
		this.$store.dispatch('tienda_nube_order/getModels')
	}
}
</script>