<template>
<div
class="med-barra"
data-testid="medidas-barra">

	<div class="med-barra__buscador">
		<i
		class="bi bi-search med-barra__lupa"
		aria-hidden="true"></i>
		<b-form-input
		type="search"
		data-testid="medidas-buscador"
		placeholder="Buscar por nombre o código"
		autocomplete="off"
		:value="value"
		@input="$emit('input', $event)"></b-form-input>
	</div>

	<!--
		Mientras la corrida avanza, los artículos nuevos no se meten solos en la lista (le
		moverían las filas a quien está revisando): se avisa que hay y se actualiza con un clic.
	-->
	<button
	v-if="hay_novedades"
	type="button"
	class="med-barra__novedades"
	data-testid="medidas-actualizar-lista"
	@click="$emit('actualizar')">
		<i class="bi bi-arrow-repeat"></i>
		Hay artículos nuevos: actualizar
	</button>

	<!-- Aprobar o rechazar de a muchos: solo en "A revisar" y solo si hay algo en la pagina. -->
	<div
	v-if="solapa === 'a_revisar' && cantidad_en_pagina > 0"
	class="med-barra__lote">
		<b-form-checkbox
		class="med-barra__todos"
		data-testid="medidas-seleccionar-pagina"
		:checked="todos_seleccionados"
		:indeterminate="algunos_seleccionados"
		:disabled="ocupado"
		@change="$emit('seleccionar_pagina', $event)">
			Seleccionar la página
		</b-form-checkbox>

		<!--
			Cada boton trae dos etiquetas y se ve una sola: la larga, y en telefono la corta
			("Rechazar (25)"), porque "Rechazar seleccionadas (25)" se partia en tres renglones.
			La cantidad va ADENTRO de cada span y no suelta despues: .btn-modulo es inline-flex, y
			un texto suelto entre hijos flex pierde el espacio de adelante ("Rechazar(25)").
		-->
		<template v-if="cantidad_seleccionados > 0">
			<b-button
			class="btn-modulo"
			variant="outline-danger"
			data-testid="medidas-lote-rechazar"
			:disabled="ocupado"
			@click="$emit('rechazar_seleccionadas')">
				<span class="med-barra__etiqueta-larga">Rechazar seleccionadas ({{ cantidad_seleccionados }})</span>
				<span class="med-barra__etiqueta-corta">Rechazar ({{ cantidad_seleccionados }})</span>
			</b-button>
			<!--
				Ayuda a la izquierda: es el ultimo de la barra, pegado al borde derecho del modal
				(ver FilaARevisar.vue). "Rechazar seleccionadas" queda lejos del borde y no lo
				necesita.
			-->
			<b-button
			class="btn-modulo"
			variant="success"
			data-testid="medidas-lote-aprobar"
			data-ayuda-placement="left"
			:disabled="ocupado"
			@click="$emit('aprobar_seleccionadas')">
				<span class="med-barra__etiqueta-larga">Aprobar seleccionadas ({{ cantidad_seleccionados }})</span>
				<span class="med-barra__etiqueta-corta">Aprobar ({{ cantidad_seleccionados }})</span>
			</b-button>
		</template>
	</div>

</div>
</template>
<script>
/**
 * Barra de una solapa del detalle de una búsqueda de medidas: el buscador por nombre o código, el aviso de
 * "hay artículos nuevos" mientras la corrida avanza y, en "A revisar", la selección de la página
 * con aprobar / rechazar seleccionadas.
 *
 * El texto del buscador va con v-model (`value` + `input`): la espera antes de pedir la lista
 * (debounce) la hace el detalle, que es quien pide.
 */
export default {
	props: {
		/** Texto del buscador (v-model). */
		value: {
			type: String,
			default: '',
		},
		/** asignadas | a_revisar | sin_datos */
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
		/** true si la corrida sigue avanzando y la solapa ya tiene más de lo que se ve. */
		hay_novedades: {
			type: Boolean,
			default: false,
		},
	},
}
</script>
<style lang="sass">
// Sin scope: vive adentro del b-modal del detalle. Prefijo med-barra; colores por token.
.med-barra
	display: flex
	flex-direction: row
	align-items: center
	flex-wrap: wrap
	gap: 10px 12px
	margin: 14px 0 12px

.med-barra__buscador
	position: relative
	display: flex
	align-items: center
	flex: 1 1 260px
	max-width: 380px
	min-width: 0

.med-barra__lupa
	position: absolute
	left: 12px
	font-size: 0.875rem
	color: var(--color-text-secondary, #6c757d)
	pointer-events: none

// El input lleva el pill del buscador del sistema (altura de barra, radio = altura / 2). El id
// del modal adelante le gana a los selectores de etiqueta de _inputs.sass sin !important, que es
// el patron de la guia de estilo para los inputs de un modal.
#medidas-corrida-detalle .med-barra__buscador .form-control
	height: var(--toolbar-control-h, 36px)
	padding-left: 34px
	padding-right: 12px
	border-width: 1px
	border-radius: calc(var(--toolbar-control-h, 36px) / 2)
	font-size: 0.875rem
	background-color: var(--bg-section, #f8f9fa)

	&:focus
		border-color: var(--color-primary, #007bff)
		box-shadow: 0 0 0 3px var(--metodo-pago-focus-ring, rgba(0, 123, 255, .15))

.med-barra__novedades
	display: inline-flex
	align-items: center
	gap: 6px
	height: 30px
	padding: 0 12px
	border: 0
	border-radius: 999px
	font-size: 0.8125rem
	font-weight: 500
	// Mismo celeste que el chip de "en curso" (--bg-nav-hover ya trae su variante oscura). El hover
	// no oscurece el fondo (no hay token para ese escalon): marca el borde con el color del texto.
	background: var(--bg-nav-hover, #e7f1ff)
	color: var(--color-primary, #007bff)
	box-shadow: none
	cursor: pointer

	&:hover,
	&:focus-visible
		outline: none
		box-shadow: inset 0 0 0 1px currentColor

.med-barra__lote
	display: flex
	flex-wrap: wrap
	align-items: center
	gap: 8px 10px
	margin-left: auto

.med-barra__todos
	margin-right: 4px
	font-size: 0.875rem
	color: var(--color-text-primary, #212529)

// La etiqueta corta de los botones de lote solo se ve en telefono (ver el @media de abajo).
.med-barra__etiqueta-corta
	display: none

// Telefono: el buscador y el lote a lo ancho, uno debajo del otro.
@media (max-width: 575px)
	.med-barra__buscador
		max-width: none
		flex-basis: 100%

	.med-barra__lote
		margin-left: 0
		width: 100%

		// "Seleccionar la página" en su propio renglón: si compartia el primero con "Rechazar",
		// ese boton quedaba en el hueco que sobraba y "Aprobar" solo y a lo ancho abajo. Asi los
		// dos botones van juntos, mitad y mitad.
		.med-barra__todos
			flex-basis: 100%
			margin-right: 0

		// Etiquetas cortas: "Rechazar seleccionadas (25)" se partia en tres renglones.
		.med-barra__etiqueta-larga
			display: none

		.med-barra__etiqueta-corta
			display: inline

		// Con la etiqueta corta entran en un renglón; el alto automatico y el corte de linea
		// quedan de red por si la cantidad es larga en la pantalla mas angosta (el alto fijo de
		// .btn-modulo recortaba el texto). Tres clases a proposito: .btn-modulo.btn es (0,2,0) y
		// vive en una hoja global.
		.btn.btn-modulo
			flex: 1 1 0
			height: auto
			min-height: var(--toolbar-control-h, 36px)
			padding: 6px 10px
			line-height: 1.2
			white-space: normal
</style>
