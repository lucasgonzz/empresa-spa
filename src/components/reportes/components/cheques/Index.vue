<template>
	<div
	class="m-t-10"
	v-if="view == 'cheques'">
		<nav-component></nav-component>	

		<list></list>	
	</div>
</template>
<script>
export default {
	components: {
		NavComponent: () => import('@/components/reportes/components/cheques/NavComponent'),
		List: () => import('@/components/reportes/components/cheques/list/Index'),
	}
}
</script>