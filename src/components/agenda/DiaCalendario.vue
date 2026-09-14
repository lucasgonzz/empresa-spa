<template>
	<div
	class="dia-calendario"
	:class="{
		'dia-calendario--hoy': dia.es_hoy,
		'dia-calendario--otro-mes': dia.es_otro_mes,
		'dia-calendario--seleccionado': seleccionado,
		'dia-calendario--con-tareas': dia.ocurrencias.length > 0,
	}"
	role="button"
	tabindex="0"
	:aria-label="'Día ' + dia.numero + (dia.ocurrencias.length ? ', ' + dia.ocurrencias.length + ' tareas' : '')"
	:data-testid="'agenda-dia-' + dia.fecha"
	@click="$emit('seleccionar', dia.fecha)"
	@keydown.enter.prevent="$emit('seleccionar', dia.fecha)"
	@keydown.space.prevent="$emit('seleccionar', dia.fecha)">

		<span class="dia-calendario__numero">
			{{ dia.numero }}
		</span>

		<!-- Escritorio y tablet: chips con el detalle truncado. -->
		<div class="dia-calendario__chips">
			<button
			v-for="ocurrencia in visibles"
			:key="ocurrencia.key"
			type="button"
			class="dia-calendario__chip"
			:class="clase_estado(ocurrencia)"
			:title="ocurrencia.detalle"
			:data-testid="'agenda-chip-' + ocurrencia.key"
			@click.stop="$emit('abrir', ocurrencia)">
				<i
				v-if="ocurrencia.expense_concept_id"
				class="bi bi-cash-coin"></i>
				<span class="dia-calendario__chip-texto">
					{{ ocurrencia.detalle }}
				</span>
			</button>
			<span
			v-if="ocultas > 0"
			class="dia-calendario__mas">
				+{{ ocultas }} más
			</span>
		</div>

		<!-- Telefono: hasta tres puntos de color, como el calendario de iOS. -->
		<div class="dia-calendario__puntos">
			<span
			v-for="ocurrencia in puntos"
			:key="'punto-' + ocurrencia.key"
			class="dia-calendario__punto"
			:class="clase_estado(ocurrencia)"></span>
		</div>
	</div>
</template>
<script>
/*
	Una celda de la grilla mensual. Recibe el dia ya armado por Calendario.vue ({ fecha, numero,
	es_hoy, es_otro_mes, ocurrencias }) y solo dibuja: el clic en la celda selecciona el dia, el
	clic en un chip abre la tarea.
*/
export default {
	props: {
		dia: {
			type: Object,
			required: true,
		},
		seleccionado: {
			type: Boolean,
			default: false,
		},
		max_chips: {
			type: Number,
			default: 3,
		},
	},
	computed: {
		visibles() {
			return this.dia.ocurrencias.slice(0, this.max_chips)
		},
		ocultas() {
			return Math.max(0, this.dia.ocurrencias.length - this.max_chips)
		},
		puntos() {
			return this.dia.ocurrencias.slice(0, 3)
		},
	},
	methods: {
		/**
		 * Estado visual de un chip o punto: hecha (tachada, gris), vencida (rojo suave) o
		 * pendiente (acento).
		 *
		 * @param {Object} ocurrencia
		 * @returns {Object}
		 */
		clase_estado(ocurrencia) {
			return {
				'dia-calendario__estado--hecha': !!ocurrencia.completado,
				'dia-calendario__estado--vencida': !ocurrencia.completado && !!ocurrencia.vencida,
			}
		},
	},
}
</script>
<style lang="sass">
.dia-calendario
	min-height: 104px
	padding: 6px
	border-right: 1px solid var(--color-border-secondary)
	border-bottom: 1px solid var(--color-border-secondary)
	background: var(--bg-card)
	cursor: pointer
	display: flex
	flex-direction: column
	gap: 4px
	min-width: 0
	transition: background 0.12s ease
	&:nth-child(7n)
		border-right: 0
	&:nth-last-child(-n+7)
		border-bottom: 0
	&:hover
		background: var(--bg-hover)
	&:focus
		outline: none
	&:focus-visible
		box-shadow: inset 0 0 0 2px var(--color-primary)

	&__numero
		align-self: flex-start
		width: 26px
		height: 26px
		border-radius: 50%
		display: inline-flex
		align-items: center
		justify-content: center
		font-size: 0.85rem
		font-weight: 500
		color: var(--color-text-primary)

	// Hoy: el numero en un circulo con el acento. Es el UNICO acento fuerte de la grilla. El
	// numero va blanco en los dos modos: es un glifo sobre el color de accion, no texto sobre
	// una superficie.
	&--hoy
		.dia-calendario__numero
			background: var(--color-primary)
			color: #fff
			font-weight: 600

	&--otro-mes
		.dia-calendario__numero
			color: var(--color-text-secondary)
			opacity: 0.55
		.dia-calendario__chip, .dia-calendario__punto
			opacity: 0.6

	&--seleccionado
		background: var(--bg-section)
		box-shadow: inset 0 0 0 2px var(--color-primary)

	&__chips
		display: flex
		flex-direction: column
		gap: 3px
		min-width: 0

	&__chip
		display: flex
		align-items: center
		gap: 4px
		width: 100%
		min-width: 0
		border: 0
		padding: 2px 6px
		border-radius: 6px
		font-size: 0.75rem
		line-height: 1.3
		text-align: left
		cursor: pointer
		// Pendiente: el acento diluido de fondo y el acento en el texto.
		background: var(--bg-nav-hover)
		color: var(--color-primary)
		transition: filter 0.12s ease
		&:hover
			filter: brightness(0.95)
		&:focus
			outline: none
		&:focus-visible
			box-shadow: 0 0 0 2px var(--color-primary)
		i
			flex: none
			font-size: 0.7rem

	&__chip-texto
		flex: 1
		min-width: 0
		white-space: nowrap
		overflow: hidden
		text-overflow: ellipsis

	&__mas
		font-size: 0.7rem
		color: var(--color-text-secondary)
		padding-left: 6px

	// Los puntos solo existen en telefono.
	&__puntos
		display: none
		gap: 3px
		flex-wrap: wrap

	&__punto
		width: 6px
		height: 6px
		border-radius: 50%
		background: var(--color-primary)

	// Estados. Nombres compartidos por chips y puntos para que un color signifique lo mismo en
	// los dos anchos.
	&__estado--vencida
		&.dia-calendario__chip
			background: var(--btn-peligro-fondo)
			color: var(--btn-peligro-texto)
		&.dia-calendario__punto
			background: var(--btn-peligro-borde)

	&__estado--hecha
		&.dia-calendario__chip
			background: var(--bg-section)
			color: var(--color-text-secondary)
			text-decoration: line-through
		&.dia-calendario__punto
			background: var(--color-border)

@media (max-width: 1024px)
	.dia-calendario
		min-height: 88px
		padding: 5px 4px
		&__chip
			font-size: 0.7rem
			padding: 2px 5px

@media (max-width: 575px)
	.dia-calendario
		min-height: 54px
		padding: 4px 2px
		align-items: center
		&__numero
			width: 24px
			height: 24px
			font-size: 0.8rem
		&__chips
			display: none
		&__puntos
			display: flex
			justify-content: center
</style>
