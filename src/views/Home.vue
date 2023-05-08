<template>
	<div
	class="home">
		<b-row
		class="row-first">
			<b-col
			class="m-lg-b-50"
			cols="12"
			xl="9">
				<nav-component></nav-component>
			</b-col>
			<b-col
			cols="12"
			lg="7" 
			xl="5">
				<left-video></left-video>
			</b-col>
			<b-col
			cols="12"
			lg="5"
			xl="4">
				<right-form></right-form>
			</b-col>
		</b-row>
		<b-row
		class="row-features">
			<b-col
			cols="12"
			xl="9">
				<features></features>
			</b-col>
		</b-row>
		<b-row
		class="">
			<b-col
			cols="12"
			xl="9">
				<plans></plans>
			</b-col>
		</b-row>
	</div>
</template>
<script>
export default {
	components: {
		NavComponent: () => import('@/components/home/components/nav/Index'),
		LeftVideo: () => import('@/components/home/components/LeftVideo'),
		RightForm: () => import('@/components/home/components/RightForm'),
		Features: () => import('@/components/home/components/features/Index'),
		Plans: () => import('@/components/home/components/plans/Index'),
	}
}
</script>
<style lang="sass">
.home 
	.row 
		@media screen and (min-width: 992px)
			height: 100vh !important
	.row-features 
		background: #F7F7F7
</style>