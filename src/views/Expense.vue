<template> 
<div>
	
	<payment-methods></payment-methods>

	<view-component
	@modelSaved="modelSaved"
	:show_btn_delete="is_admin"
	show_filter_modal
	show_previus_days
	confirm_compensar_caja
	model_name="expense">
		<template #display_top>
			<total-expenses></total-expenses>
		</template>

		<template #payment_methods>
			<btn-payment-method></btn-payment-method>
		</template>
	</view-component>
</div>
</template>
<script>
export default {
	components: {
		ViewComponent: () => import('@/common-vue/components/view/Index'),
		PaymentMethods: () => import('@/components/expenses/modals/payment-methods/Index'),
		TotalExpenses: () => import('@/components/expenses/components/TotalExpenses'),
		BtnPaymentMethod: () => import('@/components/expenses/components/BtnPaymentMethod'),
	},
	methods: {
		modelSaved(expense) {
			if (expense.caja_id) {
				this.loadModel('caja', expense.caja_id)
			}
		}
	},
}
</script>