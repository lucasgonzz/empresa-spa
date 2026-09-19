<template>
<div
class="proceso-barra"
:class="clases"
role="progressbar"
:aria-valuenow="medible ? porcentaje : null"
aria-valuemin="0"
aria-valuemax="100">
	<div
	v-if="medible || terminado"
	class="proceso-barra__relleno"
	:style="{ width: ancho }"></div>
	<div
	v-else
	class="proceso-barra__franja"></div>
</div>
</template>
<script>
/**
 * Barra de progreso de un proceso en segundo plano.
 *
 * Medible (porcentaje 0..100): relleno proporcional. No medible (porcentaje null): una franja
 * suave que recorre la pista, que es la version calma de "esta trabajando" -- no un spinner
 * gigante. Un terminado se dibuja llena, en primario si completo y en el rojo del tema si fallo.
 */
export default {
	props: {
		/** 0..100, o null si el proceso no es medible. */
		porcentaje: {
			type: Number,
			default: null,
		},
		/** pendiente | en_proceso | completado | fallo */
		status: {
			type: String,
			default: 'en_proceso',
		},
	},
	computed: {
		medible() {
			return this.porcentaje !== null && typeof this.porcentaje !== 'undefined'
		},
		terminado() {
			return this.status === 'completado' || this.status === 'fallo'
		},
		ancho() {
			if (this.terminado) {
				return '100%'
			}
			return Math.max(0, Math.min(100, Number(this.porcentaje) || 0)) + '%'
		},
		clases() {
			return {
				'proceso-barra--indeterminada': !this.medible && !this.terminado,
				'proceso-barra--fallo': this.status === 'fallo',
				'proceso-barra--completado': this.status === 'completado',
			}
		},
	},
}
</script>
<style lang="sass">
.proceso-barra
	position: relative
	height: 4px
	border-radius: 999px
	overflow: hidden
	// Pista translucida sobre la tarjeta: contraparte oscura mas abajo.
	background: rgba(0, 0, 0, .07)

.proceso-barra__relleno
	height: 100%
	border-radius: 999px
	background: var(--color-primary, #007bff)
	transition: width .4s cubic-bezier(.22, .61, .36, 1)

// Franja que recorre la pista de punta a punta, con un degradado para que entre y salga suave.
.proceso-barra__franja
	position: absolute
	top: 0
	bottom: 0
	left: 0
	width: 38%
	border-radius: 999px
	background: linear-gradient(90deg, transparent 0%, var(--color-primary, #007bff) 50%, transparent 100%)
	opacity: .7
	animation: proceso-barra-recorrer 1.6s ease-in-out infinite

.proceso-barra--fallo
	.proceso-barra__relleno
		background: var(--btn-peligro-borde, #b4443f)

@keyframes proceso-barra-recorrer
	from
		transform: translateX(-100%)
	to
		transform: translateX(265%)

@media (prefers-reduced-motion: reduce)
	.proceso-barra__franja
		animation: none
		width: 100%
		opacity: .35

html.dark-mode
	.proceso-barra
		background: rgba(255, 255, 255, .12)
</style>
