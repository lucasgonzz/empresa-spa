<template> 
	<div>
		<nav-component></nav-component>
		<articles></articles>
		<sales></sales>
	</div>
</template>
<script>
export default {
	components: {
		NavComponent: () => import('@/components/papelera/components/Nav'),
		Articles: () => import('@/components/papelera/components/articles/Index'),
		Sales: () => import('@/components/papelera/components/sales/Index'),
	},
	created() {
		this.$store.dispatch('papelera/article/getModels')
	}
}
</script>