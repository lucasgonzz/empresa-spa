<template>
<div
class="proceso-anillo"
:class="'proceso-anillo--' + status"
:style="{ width: tamano + 'px', height: tamano + 'px' }"
:data-porcentaje="medible ? porcentaje : null">
	<svg
	class="proceso-anillo__svg"
	:width="tamano"
	:height="tamano"
	viewBox="0 0 100 100">
		<circle
		class="proceso-anillo__pista"
		cx="50"
		cy="50"
		:r="radio"
		:stroke-width="grosor_relativo"></circle>
		<circle
		v-if="medible || terminado"
		class="proceso-anillo__valor"
		cx="50"
		cy="50"
		:r="radio"
		:stroke-width="grosor_relativo"
		:style="estilo_valor"></circle>
		<!--
			Arco corto que gira mientras el proceso sigue vivo: es la señal de que el sistema
			trabaja aunque el porcentaje se quede quieto un rato (o no exista). Mismo lenguaje
			que download-resources/RingProgress.vue.
		-->
		<circle
		v-if="activo"
		class="proceso-anillo__arco"
		cx="50"
		cy="50"
		:r="radio"
		:stroke-width="grosor_relativo"
		:style="estilo_arco"></circle>
	</svg>

	<span
	v-if="activo && medible && mostrar_numero"
	class="proceso-anillo__numero"
	:style="{ fontSize: tamano_numero + 'px' }">
		{{ porcentaje }}<small class="proceso-anillo__por-ciento">%</small>
	</span>
	<i
	v-else-if="status === 'completado'"
	class="bi bi-check-lg proceso-anillo__icono"
	:style="{ fontSize: tamano_icono + 'px' }"></i>
	<i
	v-else-if="status === 'fallo'"
	class="bi bi-exclamation-lg proceso-anillo__icono"
	:style="{ fontSize: tamano_icono + 'px' }"></i>
</div>
</template>
<script>
/**
 * Anillo de progreso escalable para los procesos en segundo plano.
 *
 * Existe porque download-resources/RingProgress.vue --el molde visual-- esta clavado en 34 px
 * (ancho, alto y radio escritos a mano) y sirve para la pildora, no para el hero del detalle ni
 * para la tarjeta flotante, que necesitan un anillo grande. Se dibuja con el mismo lenguaje: una
 * pista tenue, el arco de valor en el color primario, y un arco corto que gira mientras el proceso
 * este vivo. Cuando el porcentaje es null (proceso no medible) no hay arco de valor ni numero, y
 * queda solo el arco girando: eso es "esta trabajando, no se cuanto le falta".
 *
 * Todo en viewBox 0 0 100, asi `tamano` solo escala.
 */
export default {
	props: {
		/** Lado del anillo en px. */
		tamano: {
			type: Number,
			default: 72,
		},
		/** Grosor del trazo en px (se traduce a unidades del viewBox). */
		grosor: {
			type: Number,
			default: 5,
		},
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
		/** false para un anillo sin numero adentro (por ejemplo, uno muy chico). */
		mostrar_numero: {
			type: Boolean,
			default: true,
		},
	},
	computed: {
		medible() {
			return this.porcentaje !== null && typeof this.porcentaje !== 'undefined'
		},
		activo() {
			return this.status === 'pendiente' || this.status === 'en_proceso'
		},
		terminado() {
			return this.status === 'completado' || this.status === 'fallo'
		},
		/** Grosor en unidades del viewBox (100 = tamano px). */
		grosor_relativo() {
			return this.grosor * 100 / this.tamano
		},
		/** El radio deja lugar al trazo para que no se recorte en el borde. */
		radio() {
			return 50 - this.grosor_relativo / 2
		},
		circunferencia() {
			return 2 * Math.PI * this.radio
		},
		/**
		 * Recorta el arco de valor segun el porcentaje. Un terminado se dibuja completo aunque
		 * el porcentaje no haya llegado (un fallo a mitad de camino muestra el anillo entero en
		 * rojo, que es lo que se lee de un vistazo).
		 */
		estilo_valor() {
			let porcentaje = this.terminado ? 100 : Math.max(0, Math.min(100, Number(this.porcentaje) || 0))
			return {
				strokeDasharray: this.circunferencia,
				strokeDashoffset: this.circunferencia - (porcentaje / 100) * this.circunferencia,
			}
		},
		/** Arco corto (13 % de la vuelta) para el giro. */
		estilo_arco() {
			let largo = this.circunferencia * 0.13
			return {
				strokeDasharray: largo + ' ' + (this.circunferencia - largo),
			}
		},
		tamano_numero() {
			return Math.round(this.tamano * 0.26)
		},
		tamano_icono() {
			return Math.round(this.tamano * 0.42)
		},
	},
}
</script>
<style lang="sass">
.proceso-anillo
	position: relative
	flex: 0 0 auto
	// El rojo del sistema, con su contraparte oscura ya declarada en _dark_theme.sass (es el
	// mismo par que usa el boton destructivo suave; el nombre es generico a proposito).
	--proceso-anillo-rojo: var(--btn-peligro-borde, #b4443f)

.proceso-anillo__svg
	display: block
	// Arranca desde arriba en vez de desde la derecha.
	transform: rotate(-90deg)

	circle
		fill: none

.proceso-anillo__pista
	// Pista translucida sobre la superficie de atras: no hay token de superficie que sirva para
	// el stroke de un <circle>, por eso lleva contraparte en html.dark-mode mas abajo (mismo
	// criterio que RingProgress.vue).
	stroke: rgba(0, 0, 0, .08)

.proceso-anillo__valor
	stroke: var(--color-primary, #007bff)
	stroke-linecap: round
	transition: stroke-dashoffset .45s cubic-bezier(.22, .61, .36, 1)

.proceso-anillo__arco
	stroke: var(--color-primary, #007bff)
	stroke-linecap: round
	opacity: .45
	transform-origin: 50px 50px
	animation: proceso-anillo-girar 1.4s linear infinite

.proceso-anillo__numero
	position: absolute
	top: 50%
	left: 50%
	transform: translate(-50%, -50%)
	font-weight: 600
	line-height: 1
	color: var(--color-text-primary)
	font-variant-numeric: tabular-nums
	letter-spacing: -0.02em

.proceso-anillo__por-ciento
	font-size: .55em
	font-weight: 500
	margin-left: 1px
	color: var(--color-text-secondary)

.proceso-anillo__icono
	position: absolute
	top: 50%
	left: 50%
	transform: translate(-50%, -50%)
	line-height: 1
	color: var(--color-primary, #007bff)
	// Aparece con un escalado corto al terminar: es el unico momento animado del anillo.
	animation: proceso-anillo-aparecer .3s cubic-bezier(.22, .61, .36, 1)

.proceso-anillo--fallo
	.proceso-anillo__valor, .proceso-anillo__arco
		stroke: var(--proceso-anillo-rojo)

	.proceso-anillo__icono
		color: var(--proceso-anillo-rojo)

@keyframes proceso-anillo-girar
	from
		transform: rotate(0deg)
	to
		transform: rotate(360deg)

@keyframes proceso-anillo-aparecer
	from
		opacity: 0
		transform: translate(-50%, -50%) scale(.5)
	to
		opacity: 1
		transform: translate(-50%, -50%) scale(1)

@media (prefers-reduced-motion: reduce)
	.proceso-anillo__arco
		animation: none
		opacity: .25

html.dark-mode
	.proceso-anillo__pista
		stroke: rgba(255, 255, 255, .16)
</style>
