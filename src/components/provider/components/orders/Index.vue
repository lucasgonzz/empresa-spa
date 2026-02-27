<template>
	<div>
		<!-- <edit-article></edit-article> -->
		<import></import>

		<price-description></price-description>

		<view-component 
		v-if="view == 'compras'"
		model_name="provider_order"
		show_models_if_empty
		order_list_by="provider_order_status"
		change_from_dates_option
		:models_to_show="provider_orders_to_show"
		:show_previus_days="show_previus_days"
		:props_to_send_on_save="props_to_send_on_save"
		show_filter_modal>

			<template #display_top>
				<nav-component></nav-component>
			</template>


			<template v-slot:table_left_options="props">
				<btn-export :model="props.model" />	
				<btn-import :model="props.model" />	
			</template>

			<template #total="props">
				<total></total>	
			</template>

			<template #iva_breakdown="props">
				<iva-breakdown></iva-breakdown>
			</template>
			
		</view-component>
	</div>
</template>
<script>
import models_to_show from '@/mixins/provider_order/models_to_show'
export default {
	mixins: [models_to_show],
	components: {
		Import: () => import('@/components/provider/modals/orders/Import'),
		ViewComponent: () => import('@/common-vue/components/view/Index'),
		BtnExport: () => import('@/components/provider/components/orders/BtnExport'),
		BtnImport: () => import('@/components/provider/components/orders/BtnImport'),
		IvaBreakdown: () => import('@/components/provider/components/orders/IvaBreakdown'),
		NavComponent: () => import('@/components/provider/components/orders/nav/Index'),
		Total: () => import('@/components/provider/components/orders/Total'),
		PriceDescription: () => import('@/components/provider/modals/orders/PriceDescription'),
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
		},
	},
}
</script>