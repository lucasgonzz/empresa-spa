<template>
	<b-row
	v-if="user">
		<b-col 
		cols="6"
		class="col-nav">
			<nav-component></nav-component>
		</b-col>
		<b-col 
		cols="6"
		class="col-nav">
			<font-control></font-control>
		</b-col>
	</b-row>
</template>
<script>
export default {
	components: {
		NavComponent: () => import('@/components/reportes/components/nav/NavComponent'),
		FontControl: () => import('@/components/reportes/components/nav/FontControl'),
	},
}
</script>