<template>
	<div
	class="left-title">
		<h1>
			Organizamos y automatizamos tu empresa en menos de 2 meses
		</h1>
		<h3>
			Nos encargamos de implementar y poner en marcha una version personalizada de nuestro sistema. Desde el sistema ERP para gestion interna, paneles de control y un e-commerce, TODO AUTOMATIZADO. 
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
		font-weight: bold 
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
		text-align: left
		color: rgba(255, 255, 255, .8)
		font-weight: 500
		line-height: 25px
		font-weight: bold

		@media screen and (max-width: 992px)
			font-size: 16px
			text-align: center
		@media screen and (min-width: 992px)
			font-size: 18px
			text-align: left
</style>