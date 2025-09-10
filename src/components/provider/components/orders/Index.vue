<template>
	<div>
		<!-- <edit-article></edit-article> -->
		<import></import>

		<view-component 
		v-if="view == 'pedidos'"
		model_name="provider_order"
		order_list_by="provider_order_status"
		change_from_dates_option
		:show_previus_days="show_previus_days"
		:props_to_send_on_save="props_to_send_on_save"
		show_filter_modal>


			<template v-slot:table_left_options="props">
				<btn-export :model="props.model" />	
				<btn-import :model="props.model" />	
			</template>
		</view-component>
	</div>
</template>
<script>
export default {
	components: {
		Import: () => import('@/components/provider/modals/orders/Import'),
		ViewComponent: () => import('@/common-vue/components/view/Index'),
		BtnExport: () => import('@/components/provider/components/orders/BtnExport'),
		BtnImport: () => import('@/components/provider/components/orders/BtnImport'),
	},
	computed: {
		show_previus_days() {
			return this.$store.state.provider_order.from_dates
		},
		total() {
			return this.$store.state.provider_order.totales.total 
		},
		props_to_send_on_save() {
			return [
				{
					key: 'total',
					value: this.total
				}
			]
		}
	},
}
</script>