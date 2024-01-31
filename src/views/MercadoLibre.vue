<template>
	<div>
		<nav-component></nav-component>

		<orders></orders>
	</div>
</template>
<script>
export default {
	components: {
		NavComponent: () => import('@/components/mercado-libre/components/Nav'),
		Orders: () => import('@/components/mercado-libre/components/Orders'),
	}
}
</script>