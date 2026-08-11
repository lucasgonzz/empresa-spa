<template>
	<!--
		Chip de total comprado. Reusa la estructura del chip de la barra de caja
		(caja/components/horizontal-nav-center/Total.vue): icon-wrap cuadrado con el icono tintado
		sobre fondo del mismo tono al 12%, etiqueta chica en mayusculas y el numero grande abajo.
		No es una variante nueva de chip: es el mismo, aplicado aca.
	-->
	<div class="compras-total__chip">
		<div class="compras-total__icon-wrap">
			<i
			class="bi bi-cart-check"
			aria-hidden="true"></i>
		</div>
		<div class="compras-total__body">
			<span class="compras-total__label">Total comprado</span>
			<span class="compras-total__value">{{ price(total) }}</span>
		</div>
	</div>
</template>
<script>
import models_to_show from '@/mixins/provider_order/models_to_show'
export default {
	mixins: [models_to_show],
}
</script>
<style scoped lang="sass">
// Mismo ambar que el chip de pesos de caja y que el estado de seleccion de la barra: es el
// lenguaje que ya usa el sistema, no un color nuevo.
$accent-compras: #d97706

.compras-total__chip
	display: flex
	align-items: center
	gap: 10px
	padding: 8px 12px
	border-radius: 10px
	// Tokens en vez de los #fff / #e2e8f0 del chip de caja: el fondo es el mismo blanco y el borde
	// queda en #dee2e6 en vez de #e2e8f0 --un gris practicamente indistinguible al lado--, y a
	// cambio los dos tienen contraparte en html.dark-mode, asi que el chip no queda blanco sobre
	// oscuro como le pasa al de caja.
	border: 1px solid var(--color-border)
	background: var(--bg-card)
	box-shadow: 0 1px 3px rgba(15, 23, 42, 0.06)
	min-width: 0

.compras-total__icon-wrap
	flex-shrink: 0
	width: 34px
	height: 34px
	border-radius: 8px
	display: flex
	align-items: center
	justify-content: center
	background: rgba($accent-compras, 0.12)
	color: $accent-compras

	i
		font-size: 1rem
		line-height: 1

.compras-total__body
	display: flex
	flex-direction: column
	min-width: 0
	gap: 1px

.compras-total__label
	font-size: 0.68rem
	font-weight: 600
	color: #64748b
	text-transform: uppercase
	letter-spacing: 0.04em
	line-height: 1.2
	white-space: nowrap

.compras-total__value
	font-size: 1.15rem
	font-weight: 700
	line-height: 1.2
	white-space: nowrap
	color: #b45309

// En tema oscuro el ambar oscurecido queda casi negro contra el fondo de la tarjeta: se aclara
// el numero y se levanta la opacidad del fondo del icono, que sobre oscuro rinde menos.
html.dark-mode
	.compras-total__value
		color: #f59e0b

	.compras-total__icon-wrap
		background: rgba($accent-compras, 0.2)
		color: #f59e0b
</style>
