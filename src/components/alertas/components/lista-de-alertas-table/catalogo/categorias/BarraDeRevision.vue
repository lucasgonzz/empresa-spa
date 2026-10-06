<template>
<div
class="cat-rev-barra"
data-testid="categorias-barra">

	<div class="cat-rev-barra__buscador">
		<i
		class="bi bi-search cat-rev-barra__lupa"
		aria-hidden="true"></i>
		<b-form-input
		type="search"
		data-testid="categorias-buscador"
		placeholder="Buscar por nombre o código"
		autocomplete="off"
		:value="value"
		@input="$emit('input', $event)"></b-form-input>
	</div>

	<!-- Aprobar o rechazar de a muchos: solo en "A revisar", solo si hay algo en la pagina y solo quien puede gestionar. -->
	<div
	v-if="puede_gestionar && solapa === 'a_revisar' && cantidad_en_pagina > 0"
	class="cat-rev-barra__lote">
		<b-form-checkbox
		class="cat-rev-barra__todos"
		data-testid="categorias-seleccionar-pagina"
		:checked="todos_seleccionados"
		:indeterminate="algunos_seleccionados"
		:disabled="ocupado"
		@change="$emit('seleccionar_pagina', $event)">
			Seleccionar la página
		</b-form-checkbox>

		<!--
			Cada boton trae dos etiquetas y se ve una sola: la larga, y en telefono la corta
			("Rechazar (25)"), porque "Rechazar seleccionados (25)" se partia en tres renglones.
			La cantidad va ADENTRO de cada span y no suelta despues: .btn-modulo es inline-flex, y
			un texto suelto entre hijos flex pierde el espacio de adelante ("Rechazar(25)").
		-->
		<template v-if="cantidad_seleccionados > 0">
			<b-button
			class="btn-modulo"
			variant="outline-danger"
			data-testid="categorias-lote-rechazar"
			:disabled="ocupado"
			@click="$emit('rechazar_seleccionados')">
				<span class="cat-rev-barra__etiqueta-larga">Rechazar seleccionados ({{ cantidad_seleccionados }})</span>
				<span class="cat-rev-barra__etiqueta-corta">Rechazar ({{ cantidad_seleccionados }})</span>
			</b-button>
			<b-button
			class="btn-modulo"
			variant="success"
			data-testid="categorias-lote-aprobar"
			:disabled="ocupado"
			@click="$emit('aprobar_seleccionados')">
				<span class="cat-rev-barra__etiqueta-larga">Aprobar seleccionados ({{ cantidad_seleccionados }})</span>
				<span class="cat-rev-barra__etiqueta-corta">Aprobar ({{ cantidad_seleccionados }})</span>
			</b-button>
		</template>
	</div>

</div>
</template>
<script>
/**
 * Barra de una solapa de la revisión de categorías: el buscador por nombre o código y, en "A
 * revisar", la selección de la página con aprobar / rechazar seleccionados. Es la misma barra que la
 * del detalle de imágenes (imagenes/detalle/BarraDeSolapa.vue), sin el aviso de "hay artículos
 * nuevos" (acá nada corre en segundo plano) y con sus propios testids y clases.
 *
 * El texto del buscador va con v-model (`value` + `input`): la espera antes de pedir la lista
 * (debounce) la hace la revisión, que es quien pide.
 */
export default {
	props: {
		/** Texto del buscador (v-model). */
		value: {
			type: String,
			default: '',
		},
		/** a_revisar | asignados | sin_categoria */
		solapa: {
			type: String,
			default: null,
		},
		/** Artículos de la página visible. */
		cantidad_en_pagina: {
			type: Number,
			default: 0,
		},
		/** Artículos seleccionados de la página. */
		cantidad_seleccionados: {
			type: Number,
			default: 0,
		},
		/** true si están todos los de la página seleccionados. */
		todos_seleccionados: {
			type: Boolean,
			default: false,
		},
		/** true si hay algunos seleccionados pero no todos (la tilde queda a medias). */
		algunos_seleccionados: {
			type: Boolean,
			default: false,
		},
		/** true mientras viaja una acción: los controles de lote se apagan. */
		ocupado: {
			type: Boolean,
			default: false,
		},
		/** false si quien mira no puede aprobar ni rechazar: no se ofrece el lote. */
		puede_gestionar: {
			type: Boolean,
			default: true,
		},
	},
}
</script>
<style lang="sass">
// Sin scope: prefijo cat-rev-barra, colores por token con el literal de :root como respaldo.
.cat-rev-barra
	display: flex
	flex-direction: row
	align-items: center
	flex-wrap: wrap
	gap: 10px 12px
	margin: 14px 0 12px

.cat-rev-barra__buscador
	position: relative
	display: flex
	align-items: center
	flex: 1 1 260px
	max-width: 380px
	min-width: 0

.cat-rev-barra__lupa
	position: absolute
	left: 12px
	font-size: 0.875rem
	color: var(--color-text-secondary, #6c757d)
	pointer-events: none

// El input lleva el pill del buscador del sistema (altura de barra, radio = altura / 2). Va con dos
// clases a proposito: le gana a las reglas globales de _inputs.sass (`input` y `input.form-control`)
// sin !important. Es el mismo patron del buscador del detalle de imagenes.
.cat-rev-barra__buscador .form-control
	height: var(--toolbar-control-h, 36px)
	padding-left: 34px
	padding-right: 12px
	border-width: 1px
	border-radius: calc(var(--toolbar-control-h, 36px) / 2)
	font-size: 0.875rem
	background-color: var(--bg-section, #f8f9fa)

	&:focus
		border-width: 1px
		border-color: var(--color-primary, #007bff)
		box-shadow: 0 0 0 3px var(--metodo-pago-focus-ring, rgba(0, 123, 255, .15))

.cat-rev-barra__lote
	display: flex
	flex-wrap: wrap
	align-items: center
	gap: 8px 10px
	margin-left: auto

.cat-rev-barra__todos
	margin-right: 4px
	font-size: 0.875rem
	color: var(--color-text-primary, #212529)

// La etiqueta corta de los botones de lote solo se ve en telefono (ver el @media de abajo).
.cat-rev-barra__etiqueta-corta
	display: none

// Telefono: el buscador y el lote a lo ancho, uno debajo del otro.
@media (max-width: 575px)
	.cat-rev-barra__buscador
		max-width: none
		flex-basis: 100%

	.cat-rev-barra__lote
		margin-left: 0
		width: 100%

		// "Seleccionar la pagina" en su propio renglon: si compartia el primero con "Rechazar",
		// ese boton quedaba en el hueco que sobraba y "Aprobar" solo y a lo ancho abajo. Asi los
		// dos botones van juntos, mitad y mitad.
		.cat-rev-barra__todos
			flex-basis: 100%
			margin-right: 0

		// Etiquetas cortas: "Rechazar seleccionados (25)" se partia en tres renglones.
		.cat-rev-barra__etiqueta-larga
			display: none

		.cat-rev-barra__etiqueta-corta
			display: inline

		// Con la etiqueta corta entran en un renglon; el alto automatico y el corte de linea
		// quedan de red por si la cantidad es larga en la pantalla mas angosta. Tres clases a
		// proposito: .btn-modulo.btn es (0,2,0) y vive en una hoja global.
		.btn.btn-modulo
			flex: 1 1 0
			height: auto
			min-height: var(--toolbar-control-h, 36px)
			padding: 6px 10px
			line-height: 1.2
			white-space: normal
</style>
