<template> 
	<div>
		<nav-component></nav-component>
		<providers></providers>
		<orders></orders>
	</div>
</template>
<script>
export default {
	components: {
		NavComponent: () => import('@/components/provider/components/Nav'),
		Providers: () => import('@/components/provider/components/providers/Index'),
		Orders: () => import('@/components/provider/components/orders/Index'),
	}
}
</script>