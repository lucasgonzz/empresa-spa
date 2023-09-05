<template>
	<div
	class="home">
		<b-row>
			<b-col
			cols="12"
			xl="9">
				<nav-component></nav-component>
			</b-col>
		</b-row>
		<b-row
		class="row-banner">
			<b-col
			cols="12"
			lg="5"
			md="6">
				<left-title></left-title>
			</b-col>
			<b-col
			cols="12"
			lg="5"
			md="6">
				<right-video></right-video>
			</b-col>
		</b-row>
		<b-row
		class="row-first row-full-heigth">
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
			lg="9"
			xl="7">
				<clients></clients>
			</b-col>
		</b-row>
		<b-row
		class="row-dark row-full-heigth">
			<b-col
			cols="12"
			xl="10">
				<plans></plans>
			</b-col>
		</b-row>

		<btn-whats-app></btn-whats-app>			
	</div>
</template>
<script>
export default {
	components: {
		LeftTitle: () => import('@/components/home/components/banner/LeftTitle'),
		RightVideo: () => import('@/components/home/components/banner/RightVideo'),
		NavComponent: () => import('@/components/home/components/nav/Index'),
		LeftVideo: () => import('@/components/home/components/LeftVideo'),
		RightForm: () => import('@/components/home/components/RightForm'),
		Features: () => import('@/components/home/components/features/Index'),
		Clients: () => import('@/components/home/components/clients/Index'),
		Plans: () => import('@/components/home/components/plans/Index'),
		BtnWhatsApp: () => import('@/components/home/components/BtnWhatsApp'),
	}
}
</script>
<style lang="sass">
.home 

	.row-banner
		// background: #007bff
		background: rgb(0,123,255)
		background: linear-gradient(90deg, rgba(0,123,255,1) 0%, rgba(0,123,255,1) 27%, rgba(155,203,255,1) 100%)
		@media screen and (max-width: 992px)
			height: calc(100vh - 100px)
		@media screen and (min-width: 992px)
			height: calc(100vh - 100px - 200px)

	.row-dark
		background: #F7F7F7

	.row-dark-2
		background: #F1F1F1

	.row-full-heigth
		align-items: center
		min-height: 100vh !important


	.titles 
		margin-bottom: 50px
		h4 
			font-size: 2em 
			margin: 60px 0
		h5 
			font-size: 1.5em
			color: rgba(0,0,0,.7)
		h6 
			font-size: 1.3em
			margin: 40px 0
			color: rgba(0,0,0,.7)
</style>