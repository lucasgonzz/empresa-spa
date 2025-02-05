<template> 
	<div>
		<nav-component></nav-component>
		<articles></articles>
	</div>
</template>
<script>
export default {
	components: {
		NavComponent: () => import('@/components/papelera/components/Nav'),
		Articles: () => import('@/components/papelera/components/articles/Index'),
	}
}
</script>