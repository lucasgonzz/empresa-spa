<template>
	<b-row
	v-if="user">
		<b-col 
		cols="12"
		class="col-nav">
			<nav-component></nav-component>
		</b-col>
	</b-row>
</template>
<script>
export default {
	components: {
		NavComponent: () => import('@/components/reportes/components/nav-component/NavComponent'),
	},
}
</script>