<template>
	<div>
		<nav-component></nav-component>

		<general></general>	
		<custom></custom>	
		<password></password>	
	</div>
</template>
<script>
export default {
	components: {
		NavComponent: () => import('@/common-vue/components/configuration/Nav'),
		General: () => import('@/common-vue/components/configuration/general/Index'),
		Custom: () => import('@/common-vue/components/configuration/custom/Index'),
		Password: () => import('@/common-vue/components/configuration/password/Index'),
	}
}
</script>