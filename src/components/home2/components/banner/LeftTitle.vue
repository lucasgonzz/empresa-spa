<template>
	<div
	class="left-title">
		<h1>
			Ayudamos a DISTRIBUIDORAS a GANAR TIEMPO en la gestion de su negocio
		</h1>
		<h3>
			Nos encargamos de implementar y poner en marcha un sistema de gestion personalizado. Con desarrollos a medida para que puedas realmente delegar la gestion de todos tus procesos en un unico lugar.
		</h3>
		<!-- <h3>
			Sistema de Gestion, Facturacion y Venta Online. 
		</h3> -->
	</div>
</template>
<style lang="sass">
.left-title
	width: 100%
	height: 100%
	display: flex 
	flex-direction: column 
	justify-content: center 
	@media screen and (max-width: 992px) 
		align-items: flex-end
	@media screen and (min-width: 992px)
		align-items: flex-start

	h1 
		font-family: Arial
		font-weight: 500 
		color: #FFF
		margin: 30px 0

		@media screen and (max-width: 992px)
			font-size: 2em
			text-align: center
		@media screen and (min-width: 992px)
			text-align: left
			line-height: 54px
			font-size: 3em

	h3 
		font-family: Arial
		text-align: left
		color: rgba(255, 255, 255, .9)
		font-weight: 600
		line-height: 25px

		@media screen and (max-width: 992px)
			font-size: 18px
			text-align: center
		@media screen and (min-width: 992px)
			font-size: 20px
			text-align: left
</style>