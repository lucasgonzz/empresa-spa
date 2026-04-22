<template>
	<b-row
	id="prices"
	class="row-full-heigth prices">
		<b-col
		cols="12"
		md="6"
		lg="5">
			<img 
			class="image-premium p-t-50 p-md-t-0"
			src="@/assets/layout.jpg" alt=""> 
		</b-col>
		<b-col
		class="p-b-100"
		cols="12"
		md="6"
		lg="5">
			<div 
			class="cont-price-description">
				<div class="cont-title-img">
					<img src="@/assets/premium2.png" alt="">
					<h4>Servicio Premium</h4>
				</div>
				<p>
					Brindamos un servicio totalmente personalizado para nuestros clientes, cada empresa es un mundo, y nuestra mision es adaptar nuestro software a la empresa y sus empleados.
				</p>
				<p>
					Tenemos un trato personalizado y una versión del sistema única para cada uno de nuestros clientes.
				</p>
				<p>
					Del mismo modo que cada empresa requiere un sistema a medida, lo mismo ocurre con los precios. Dependiendo el perfil de la empresa, que varia en función de la cantidad de empleados - sucursales - clientes - inventario, ofrecemos un precio que corresponda a sus requerimientos.
				</p>
				<p>
					Solicita una reunión con nuestros especialistas para que podamos asesorarte y ofrecerte un precio a medida.
				</p>

				<div 
				@click="toWhatsApp"
				class="btn-whatsapp s-1 m-t-25">
					<img src="@/assets/whastapp.png">
					<p
					class="m-l-15">
						Solicitar Presupuesto
					</p>
				</div>
			</div>
		</b-col>
	</b-row>
</template>
<script>
export default {
	methods: {
		toWhatsApp() {
			window.open('https://api.whatsapp.com/send?phone=3444622139')
		}
	}
}
</script>
<style lang="sass">
.prices 
	background: #fdfdfd
	.image-premium 
		width: 100%

	.cont-title-img
		display: flex 
		flex-direction: row 
		align-items: center 
		justify-content: flex-start
		img 
			width: 80px
			margin-right: 15px
		h4 
			font-size: 2.5em
			font-weight: bold
			text-align: left
			margin: 1em 0

		@media screen and (max-width: 768px)
			img 
				width: 60px
			h4 
				font-size: 2em

	.cont-price-description
		display: flex 
		// flex-direction: row
		flex-direction: column
		align-items: flex-start
		justify-content: center
		p 
			text-align: left
			color: rgba(0, 0, 0, .6)
			font-weight: bold
			strong 	
				color: #000

		.btn-whatsapp
			justify-content: flex-start
</style>