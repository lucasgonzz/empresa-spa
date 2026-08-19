<template>
	<div
	v-if="sub_view == 'cuotas-pendientes'">
		<view-component
		:show_previus_days="false"
		:show_btn_create="false"
		:show_btn_props_to_show="false"
		model_name="payment_plan_cuota"> 

			<template v-slot:table_left_options="slotProps">
				<pagar-btn
				:payment_plan_cuota="slotProps.model"></pagar-btn>

				<sale-btn
				:payment_plan_cuota="slotProps.model"></sale-btn>
			</template>

		</view-component>
	</div>
</template>
<script>
export default {
	components: {
		ViewComponent: () => import('@/common-vue/components/view/Index'),
		PagarBtn: () => import('@/components/client/components/payment-plan/cuotas-pendientes/PagarBtn'),
		SaleBtn: () => import('@/components/client/components/payment-plan/SaleBtn'),
	},
}
</script>