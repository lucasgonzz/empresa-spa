<template>
	<view-component
	v-if="view == 'pedidos'"
	change_from_dates_option
	ask_selectable
	:show_btn_delete="false"
	:show_btn_create="false"
	order_list_by="tienda_nube_order_status"
	model_name="tienda_nube_order">
		<template v-slot:model_modal_header="slotProps">
			<btn-confirmar/>
		</template>

		<template #options_drop_down>
			<confirmar-pedido-drop-down/>
		</template>
	</view-component>
</template>
<script>
export default {
	components: {
		ViewComponent: () => import('@/common-vue/components/view/Index'),
		BtnConfirmar: () => import('@/components/tienda-nube/components/orders/BtnConfirmar'),
		ConfirmarPedidoDropDown: () => import('@/components/tienda-nube/components/orders/ConfirmarPedidoDropDown'),
	},
	created() {
		this.$store.dispatch('tienda_nube_order/getModels')
	}
}
</script>