<template>
	<div
	v-if="sub_view == 'cuotas-pagas'">
		<view-component
		:show_previus_days="false"
		:show_btn_create="false"
		:show_view_header="false"
		model_name="payment_plan_cuota"> 

			<template #header>
				<menu-fechas
				model_name="payment_plan_cuota"></menu-fechas>
			</template>

			<template v-slot:table_left_options="slotProps">
				<sale-btn
				:payment_plan_cuota="slotProps.model"></sale-btn>
			</template>

		</view-component>
	</div>
</template>
<script>
export default {
	components: {
		MenuFechas: () => import('@/common-vue/components/menu-fechas/Index'),
		SaleBtn: () => import('@/components/client/components/payment-plan/SaleBtn'),
		ViewComponent: () => import('@/common-vue/components/view/Index'),
	},
}
</script>