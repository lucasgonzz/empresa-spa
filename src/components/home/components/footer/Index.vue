<template>
	<footer>
		<b-row>
			<b-col
			cols="11"
			lg="4"
			xl="3">
				<h6 class="footer-title">
					Compania
				</h6>
				<div 
				@click="scrollTo('#plans')"
				class="item">
					Precios
				</div>
				<div 
				@click="scrollTo('#features')"
				class="item">
					Funcionalidades
				</div>
				<div 
				@click="scrollTo('#clients')"
				class="item">
					Clientes
				</div>
			</b-col>
			<b-col
			cols="11"
			lg="4"
			xl="3">
				<h6 class="footer-title">
					Encontranos
				</h6>
				<div class="item">
					<i class="icon-location"></i>
					Pellegrini 1876, Rosario, Sante Fe, Argentina.
				</div>
				<div class="redes">
					<img 
					src="@/assets/whastapp.png"
					@click="toWhatsapp">
					<img 
					src="@/assets/facebook.png"
					@click="toFacebook">
					<img src="@/assets/instagram.png"
					@click="toInstagram">
					<img src="@/assets/youtube.png"
					@click="toYoutube">
				</div>
			</b-col>
			<b-col
			cols="11"
			lg="4"
			xl="3">
				<h6 class="footer-title">
					Servicios de Calidad
				</h6>
				<div class="imagenes">
					<div class="cont-hostinger-img">
						<img 
						src="@/assets/hostinger.png">
					</div>
					<img
					class="m-l-15" 
					src="@/assets/ssl.png">
				</div>
			</b-col>
			<b-col
			class="last-column"
			cols="12">
				<img src="@/assets/logo.jpg" alt="">
				ComercioCity - Todos los derechos reservados
			</b-col>
		</b-row>
	</footer>
</template>
<script>
export default {
	components: {
        ScrollButtons: () => import('@/components/home/components/nav/ScrollButtons'),
	},
	methods: {
		toWhatsapp() {
			window.open('https://api.whatsapp.com/send?phone=3444622139')
		},
		toFacebook() {
			window.open('https://www.facebook.com/profile.php?id=61550702650795')
		},
		toInstagram() {
			window.open('https://www.instagram.com/comerciocity_com/')
		},
		toYoutube() {
			window.open('https://www.youtube.com/channel/UC77T-EMzfQz-8xsf92hszBQ')
		},
		scrollTo(element) {
			this.$scrollTo(element)
		}
	}
}
</script>
<style lang="sass">
@import '@/sass/_custom'
footer 
	.row 
		margin: 0 -15px
		background: $blue

		[class^='col-']
			display: flex 
			flex-direction: column
			justify-content: flex-start
			padding: 35px 0 

		.footer-title 
			font-size: 20px
			color: #FFF
			text-align: left 
			font-weight: bold 

		// Scroll buttons 
		.scroll-buttons 
			display: flex
			flex-direction: column
			.scroll-button
				text-align: left
				font-size: 16px
				color: rgba(255,255,255,.9)
				margin: 7px 0
				padding: 0

		.item 
			color: rgba(255,255,255,.9)
			font-size: 16px
			text-align: left
			margin: 7px 0

		.redes 
			display: flex 
			flex-direction: row 
			justify-content: start 
			align-items: center
			margin: 15px 0
			img 
				width: 60px
				padding: 0 10px
				transition: all .2s
				cursor: pointer
				&:hover 
					transform: scale(1.2)


		.imagenes
			display: flex 
			flex-direction: row 
			justify-content: flex-start 
			align-items: center
			img 
				width: 100px
			.cont-hostinger-img 
				background: rgba(255,255,255,.9)
				border-radius: 10px
				display: flex 
				flex-direction: row
				justify-content: center 
				align-items: center
				padding: 10px


	.last-column			
		background: darken($blue, 20)
		color: #FFF
		display: flex 
		flex-direction: row 
		justify-content: center
		align-items: center
		padding: 15px 0
		img 
			border-radius: 50%
			width: 50px
			margin-right: 10px
</style>