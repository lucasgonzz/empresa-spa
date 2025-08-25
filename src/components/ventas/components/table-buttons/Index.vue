<template>
	<div>
		<text-info
		:model="model"></text-info>

		<afip-buttons
		:sale="model"></afip-buttons>

		<payment-plan-btn
		:sale="model"></payment-plan-btn>
	</div>
</template>
<script>
export default {
	props: {
		model: Object,
	},
	methods: {
		ver() {
			this.$bvModal.show('payment_plan')
		},
	},
	components: {
		TextInfo: () => import('@/components/ventas/components/table-buttons/TextInfo'),
		AfipButtons: () => import('@/components/ventas/components/table-buttons/AfipButtons'),
		PaymentPlanBtn: () => import('@/components/ventas/components/table-buttons/PaymentPlanBtn'),
	}
}
</script>