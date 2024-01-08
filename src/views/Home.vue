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
			<div class="row-banner-gradient"></div>
			<b-col
			cols="12"
			md="8">
				<left-title></left-title>
			</b-col>
		</b-row>
	
		<b-row
		class="row-dark row-full-heigth">
			<b-col
			cols="12"
			xl="9">
				<como-hacemos></como-hacemos>
			</b-col>
		</b-row>
	
		<b-row
		class="row-dark-2 row-full-heigth">
			<b-col
			cols="12"
			xl="9">
				<features></features>
			</b-col>
		</b-row>
		<b-row
		class="row-dark">
			<b-col
			cols="12"
			lg="9"
			xl="7">
				<casos-de-exito></casos-de-exito>
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
		<!-- <b-row
		class="row-dark row-full-heigth">
			<b-col
			cols="12"
			xl="10">
				<plans></plans>
			</b-col>
		</b-row> -->

		<prices></prices>	

		<footer-component></footer-component>

		<btn-whats-app></btn-whats-app>			
	</div>
</template>
<script>
export default {
	components: {
		LeftTitle: () => import('@/components/home/components/banner/LeftTitle'),
		RightVideo: () => import('@/components/home/components/banner/RightVideo'),
		SomosDiferentes: () => import('@/components/home/components/banner/SomosDiferentes'),
		NavComponent: () => import('@/components/home/components/nav/Index'),
		LeftVideo: () => import('@/components/home/components/LeftVideo'),
		RightForm: () => import('@/components/home/components/RightForm'),
		ComoHacemos: () => import('@/components/home/components/como-hacemos/Index'),
		Features: () => import('@/components/home/components/features/Index'),
		CasosDeExito: () => import('@/components/home/components/casos-de-exito/Index'),
		Clients: () => import('@/components/home/components/clients/Index'),
		Plans: () => import('@/components/home/components/plans/Index'),
		Prices: () => import('@/components/home/components/prices/Index'),
		FooterComponent: () => import('@/components/home/components/footer/Index'),
		BtnWhatsApp: () => import('@/components/home/components/BtnWhatsApp'),
	}
}
</script>
<style lang="sass">
.home 

	.row-banner
		// background: #007bff
		// background: rgb(0,123,255)
		// background: linear-gradient(90deg, rgba(0,123,255,1) 0%, rgba(0,123,255,1) 27%, rgba(155,203,255,1) 100%)
		background-image: url('~@/assets/banner-programacion.jpg')
		background-repeat: no-repeat
		background-size: cover
		padding-top: 100px
		height: 100vh
		// @media screen and (max-width: 992px)
		// 	height: calc(100vh - 100px)
		// @media screen and (min-width: 992px)
			// height: calc(100vh - 100px)

	.row-banner-gradient
		// margin-top: 100px
		width: 100% 
		height: 100% 
		position: absolute 
		top: 0 
		left: 0
		background: rgb(0,0,0)
		background: radial-gradient(circle, rgba(0,0,0,0) 0%, rgba(0,0,0,0) 13%, rgba(0,0,0,0.9) 100%, rgba(0,0,0,0.9) 100%)
		background-attachment: fixed
		// background: linear-gradient(-50deg,#58c3ff 0,#004de6 40%,#003bb1 100%)


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