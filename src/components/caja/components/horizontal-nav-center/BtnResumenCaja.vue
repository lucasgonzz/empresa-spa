<template>
	<!--
		Mismo chasis de chip que BtnMovimientosEntreCajas.vue (borde 1px, radio 10px, sombra
		suave, cajita de icono de 34px), pero de una sola linea: aca no hay una etiqueta chica
		arriba ni un subtitulo porque el boton no informa ningun valor, solo abre el modal.
	-->
	<button
	v-if="hasExtencion('resumen_caja')"
	type="button"
	class="caja-resumen-btn m-l-15"
	v-b-modal="'resumen-caja'">
		<div class="caja-resumen-btn__icon-wrap">
			<i
			class="bi bi-clipboard-data"
			aria-hidden="true"></i>
		</div>
		<span class="caja-resumen-btn__texto">Resúmenes</span>
	</button>
</template>
<style scoped lang="sass">
@import '@/sass/_custom.scss'

// El mismo cian que Total.vue usa para el chip de dolares: no se mete un color nuevo en la
// barra. El sass del chip queda duplicado por tercera vez en el modulo (Total.vue y
// BtnMovimientosEntreCajas.vue ya lo repiten) a proposito: extraerlo a un parcial compartido
// es un cambio de alcance mayor, con riesgo de cascada de especificidad sobre una barra que
// se ve en todas las cajas.
$accent-action: #0891b2

.caja-resumen-btn
	display: flex
	align-items: center
	gap: 10px
	padding: 8px 12px
	border-radius: 10px
	border: 1px solid #e2e8f0
	background: #fff
	box-shadow: 0 1px 3px rgba(15, 23, 42, 0.06)
	transition: transform 0.2s ease, box-shadow 0.2s ease, border-color 0.2s ease, background-color 0.2s ease
	min-width: 0
	cursor: pointer
	text-align: left

	&:hover
		transform: translateY(-1px)
		box-shadow: 0 6px 16px rgba(15, 23, 42, 0.08)
		border-color: rgba($accent-action, 0.35)
		background: rgba($accent-action, 0.03)

	&:focus
		outline: none
		box-shadow: 0 0 0 3px rgba($accent-action, 0.2), 0 1px 3px rgba(15, 23, 42, 0.06)

	&:active
		transform: translateY(0)
		box-shadow: 0 2px 6px rgba(15, 23, 42, 0.08)

	&__icon-wrap
		flex-shrink: 0
		width: 34px
		height: 34px
		border-radius: 8px
		display: flex
		align-items: center
		justify-content: center
		background: rgba($accent-action, 0.12)
		color: $accent-action

		i
			font-size: 1rem
			line-height: 1

	&__texto
		font-size: 0.92rem
		font-weight: 700
		line-height: 1.2
		color: darken($accent-action, 8%)
		white-space: nowrap

	@media screen and (max-width: 576px)
		margin-left: 0
		width: 100%
</style>
