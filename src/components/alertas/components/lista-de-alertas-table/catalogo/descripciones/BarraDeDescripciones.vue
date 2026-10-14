<template>
<div
class="desc-rev-barra"
data-testid="descripciones-barra">

	<div class="desc-rev-barra__buscador">
		<i
		class="bi bi-search desc-rev-barra__lupa"
		aria-hidden="true"></i>
		<b-form-input
		type="search"
		data-testid="descripciones-buscador"
		placeholder="Buscar por nombre o código"
		aria-label="Buscar por nombre o código"
		autocomplete="off"
		:value="value"
		@input="$emit('input', $event)"></b-form-input>
	</div>

	<!-- Aprobar o descartar de a muchas: solo en "A revisar" y solo si hay algo en la pagina. -->
	<div
	v-if="solapa === 'a_revisar' && cantidad_en_pagina > 0"
	class="desc-rev-barra__lote">
		<b-form-checkbox
		class="desc-rev-barra__todos"
		data-testid="descripciones-seleccionar-pagina"
		:checked="todos_seleccionados"
		:indeterminate="algunos_seleccionados"
		:disabled="ocupado"
		@change="$emit('seleccionar_pagina', $event)">
			Seleccionar la página
		</b-form-checkbox>

		<!--
			Cada boton trae dos etiquetas y se ve una sola: la larga, y en telefono la corta
			("Descartar (25)"), igual que la barra de categorias. La cantidad va ADENTRO de cada span:
			.btn-modulo es inline-flex y un texto suelto entre hijos flex pierde el espacio de adelante.
		-->
		<template v-if="cantidad_seleccionados > 0">
			<b-button
			class="btn-modulo"
			variant="outline-danger"
			data-testid="descripciones-lote-descartar"
			:disabled="ocupado"
			@click="$emit('descartar_seleccionadas')">
				<span class="desc-rev-barra__etiqueta-larga">Descartar seleccionadas ({{ cantidad_seleccionados }})</span>
				<span class="desc-rev-barra__etiqueta-corta">Descartar ({{ cantidad_seleccionados }})</span>
			</b-button>
			<b-button
			class="btn-modulo"
			variant="success"
			data-testid="descripciones-lote-aprobar"
			:disabled="ocupado"
			@click="$emit('aprobar_seleccionadas')">
				<span class="desc-rev-barra__etiqueta-larga">Aprobar seleccionadas ({{ cantidad_seleccionados }})</span>
				<span class="desc-rev-barra__etiqueta-corta">Aprobar ({{ cantidad_seleccionados }})</span>
			</b-button>
		</template>
	</div>

</div>
</template>
<script>
/**
 * Barra de una solapa de la revisión de descripciones: el buscador por nombre o código y, en "A
 * revisar", la selección de la página con aprobar / descartar seleccionadas. Es la barra de la
 * revisión de categorías (categorias/BarraDeRevision.vue) con sus propios testids, clases y verbos
 * (acá se descarta, no se rechaza, y lo que se cuenta son descripciones: "seleccionadas").
 *
 * El texto del buscador va con v-model (`value` + `input`): la espera antes de pedir la lista la hace
 * la sección, que es quien pide.
 */
export default {
	props: {
		/** Texto del buscador (v-model). */
		value: {
			type: String,
			default: '',
		},
		/** a_revisar | publicadas */
		solapa: {
			type: String,
			default: null,
		},
		/** Artículos de la página visible. */
		cantidad_en_pagina: {
			type: Number,
			default: 0,
		},
		/** Artículos tildados de la página. */
		cantidad_seleccionados: {
			type: Number,
			default: 0,
		},
		/** true si están todos los de la página tildados. */
		todos_seleccionados: {
			type: Boolean,
			default: false,
		},
		/** true si hay algunos tildados pero no todos (la tilde queda a medias). */
		algunos_seleccionados: {
			type: Boolean,
			default: false,
		},
		/** true mientras viaja una acción en lote: los controles se apagan. */
		ocupado: {
			type: Boolean,
			default: false,
		},
	},
}
</script>
<style lang="sass">
// Sin scope: prefijo desc-rev-barra, colores por token con el literal de :root como respaldo. Es la
// misma barra que la de categorias (que vive en otro chunk y puede no estar cargada).
.desc-rev-barra
	display: flex
	flex-direction: row
	align-items: center
	flex-wrap: wrap
	gap: 10px 14px
	margin: 14px 0 12px

.desc-rev-barra__buscador
	position: relative
	display: flex
	align-items: center
	flex: 1 1 260px
	max-width: 380px
	min-width: 0

.desc-rev-barra__lupa
	position: absolute
	left: 12px
	font-size: 0.875rem
	color: var(--color-text-secondary, #6c757d)
	pointer-events: none

// El pill del buscador del sistema. Dos clases a proposito: le gana a las reglas globales de
// _inputs.sass (`input` y `input.form-control`) sin !important.
.desc-rev-barra__buscador .form-control
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

.desc-rev-barra__lote
	display: flex
	flex-wrap: wrap
	align-items: center
	gap: 8px 10px

.desc-rev-barra__todos
	margin-right: 4px
	font-size: 0.875rem
	color: var(--color-text-primary, #212529)

// La etiqueta corta de los botones de lote solo se ve en telefono (ver el @media de abajo).
.desc-rev-barra__etiqueta-corta
	display: none

// Telefono: el buscador y el lote a lo ancho, uno debajo del otro.
@media (max-width: 575px)
	.desc-rev-barra__buscador
		max-width: none
		flex-basis: 100%

	.desc-rev-barra__lote
		width: 100%

		// "Seleccionar la pagina" en su propio renglon y los dos botones juntos, mitad y mitad.
		.desc-rev-barra__todos
			flex-basis: 100%
			margin-right: 0

		.desc-rev-barra__etiqueta-larga
			display: none

		.desc-rev-barra__etiqueta-corta
			display: inline

		// Tres clases a proposito: .btn-modulo.btn es (0,2,0) y vive en una hoja global.
		.btn.btn-modulo
			flex: 1 1 0
			height: auto
			min-height: var(--toolbar-control-h, 36px)
			padding: 6px 10px
			line-height: 1.2
			white-space: normal
</style>
