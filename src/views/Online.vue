<template>
	<div>
		<nav-component></nav-component>

		<orders></orders>
		<buyers></buyers>
		<messages></messages>
		<cupons></cupons>
	</div>
</template>
<script>
export default {
	components: {
		NavComponent: () => import('@/components/online/components/NavComponent'),
		Orders: () => import('@/components/online/components/orders/Index'),
		Buyers: () => import('@/components/online/components/buyer/Index'),
		Messages: () => import('@/components/online/components/messages/Index'),
		Cupons: () => import('@/components/online/components/cupons/Index'),
	}
}
</script>