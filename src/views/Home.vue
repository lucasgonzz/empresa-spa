<template>
	<div
	class="home">
		<b-row
		class="row-first row-full-heigth">
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
		class="row-dark row-full-heigth">
			<b-col
			cols="12"
			xl="9">
				<features></features>
			</b-col>
		</b-row>
		<b-row
		class="row-dark-2">
			<b-col
			cols="12"
			xl="9">
				<clients></clients>
			</b-col>
		</b-row>
		<b-row
		class="row-dark row-full-heigth">
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
		Clients: () => import('@/components/home/components/clients/Index'),
		Plans: () => import('@/components/home/components/plans/Index'),
	}
}
</script>
<style lang="sass">
.home 
	.row-dark
		background: #F7F7F7

	.row-dark-2
		background: #F1F1F1

	.row-full-heigth
		align-items: start
		min-height: 100vh !important


	.titles 
		margin-bottom: 50px
		h4 
			font-size: 55px 
			// font-weight: bold 
			margin: 60px 0
		h6 
			font-size: 30px 
			// font-weight: bold 
			margin: 40px 0
			color: rgba(0,0,0,.7)
		h5 
			font-size: 25px
			// margin-bottom: 15px 
			color: rgba(0,0,0,.7)
</style>