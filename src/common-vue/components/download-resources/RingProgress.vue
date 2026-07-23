<template>
<div class="recursos-ring">
	<svg
	class="recursos-ring__svg"
	width="34"
	height="34"
	viewBox="0 0 34 34">
		<circle
		class="recursos-ring__track"
		cx="17"
		cy="17"
		r="14"></circle>
		<circle
		class="recursos-ring__valor"
		cx="17"
		cy="17"
		r="14"
		:style="estilo_valor"></circle>
		<circle
		v-if="!terminado"
		class="recursos-ring__arco"
		cx="17"
		cy="17"
		r="14"></circle>
	</svg>

	<span
	v-if="!terminado"
	class="recursos-ring__numero">
		{{ porcentaje }}
	</span>
	<i
	v-else
	class="icon-check recursos-ring__check"></i>
</div>
</template>
<script>
export default {
	props: {
		porcentaje: {
			type: Number,
			default: 0,
		},
		terminado: {
			type: Boolean,
			default: false,
		},
	},
	computed: {
		/**
		 * Recorta el arco de progreso segun el porcentaje. La circunferencia se calcula con el
		 * radio del circulo del template (14), que es fijo: si se cambia ahi, cambiarlo aca.
		 */
		estilo_valor() {
			let circunferencia = 2 * Math.PI * 14
			let offset = circunferencia - (this.porcentaje / 100) * circunferencia
			return {
				strokeDasharray: circunferencia,
				strokeDashoffset: offset,
			}
		},
	},
}
</script>
<style lang="sass">
@import '@/sass/_custom.scss'

.recursos-ring
	position: relative
	width: 34px
	height: 34px
	flex: 0 0 34px

.recursos-ring__svg
	// Arranca desde arriba en vez de desde la derecha.
	transform: rotate(-90deg)

	circle
		fill: none

.recursos-ring__track
	stroke: rgba(0, 0, 0, .08)
	stroke-width: 3

.recursos-ring__valor
	stroke: $blue
	stroke-width: 3
	stroke-linecap: round
	transition: stroke-dashoffset .45s cubic-bezier(.22, .61, .36, 1)

// Arco corto que gira siempre: es la señal de que el sistema sigue trabajando aunque el
// porcentaje se quede quieto un rato en un recurso pesado.
.recursos-ring__arco
	stroke: $blue
	stroke-width: 3
	stroke-linecap: round
	stroke-dasharray: 10 78
	opacity: .45
	transform-origin: 17px 17px
	animation: recursos-ring-girar 1.4s linear infinite

.recursos-ring__numero
	position: absolute
	top: 50%
	left: 50%
	transform: translate(-50%, -50%)
	font-size: 10px
	font-weight: 600
	color: $blue
	font-variant-numeric: tabular-nums

.recursos-ring__check
	position: absolute
	top: 50%
	left: 50%
	transform: translate(-50%, -50%)
	font-size: 12px
	color: $blue
	animation: recursos-ring-check .3s cubic-bezier(.22, .61, .36, 1)

@keyframes recursos-ring-girar
	from
		transform: rotate(0deg)
	to
		transform: rotate(360deg)

@keyframes recursos-ring-check
	from
		opacity: 0
		transform: translate(-50%, -50%) scale(.5)
	to
		opacity: 1
		transform: translate(-50%, -50%) scale(1)

@if ($theme == 'dark')
	.recursos-ring__track
		stroke: rgba(255, 255, 255, .16)
</style>
