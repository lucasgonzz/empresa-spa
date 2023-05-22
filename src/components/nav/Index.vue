<template>
	<div>
		<nav-component>
			<template #right_dropdown>
				<tasks-button></tasks-button>
			</template>
		</nav-component>
		<tasks></tasks>	
		<payment-expire></payment-expire>
		<order-info></order-info>
	</div>
</template>
<script>
export default {
	components: {
		NavComponent: () => import('@/common-vue/components/nav/Index'),
		TasksButton: () => import('@/components/nav/tasks/TasksButton'),
		Tasks: () => import('@/components/nav/tasks/modal/Index'),
		OrderInfo: () => import('@/components/nav/OrderInfo'),
		PaymentExpire: () => import('@/components/nav/PaymentExpire'),
	},
}
</script>