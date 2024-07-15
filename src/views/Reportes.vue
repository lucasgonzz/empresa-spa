<template>
	<div>
		<general></general>	

		<nav-component></nav-component>

		<graficos></graficos>	
	</div>
</template>
<script>
export default {
	components: {
		NavComponent: () => import('@/components/reportes/components/Nav'),
		General: () => import('@/components/reportes/components/general/Index'),
		Graficos: () => import('@/components/reportes/components/graficos/Index'),
	},
}
</script>