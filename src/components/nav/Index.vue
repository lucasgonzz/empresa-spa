<template>
	<div>
		<nav-component></nav-component>
		<payment-expire></payment-expire>
		<order-info></order-info>
	</div>
</template>
<script>
export default {
	components: {
		NavComponent: () => import('@/common-vue/components/nav/Index'),
		OrderInfo: () => import('@/components/nav/OrderInfo'),
		PaymentExpire: () => import('@/components/nav/PaymentExpire'),
	},
}
</script>