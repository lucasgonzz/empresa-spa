<template>
	<div>
		<nav-component></nav-component>
		
		<reports></reports>
		<!-- <charts></charts>		 -->
	</div>
</template>
<script>
export default {
	components: {
		NavComponent: () => import('@/components/caja/components/NavComponent'),
		Reports: () => import('@/components/caja/components/reports/Index'),
		// Charts: () => import('@/components/caja/components/charts/Index'),
	}
}
</script>