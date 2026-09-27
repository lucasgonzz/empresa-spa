<template>
<div
class="img-det-barra"
data-testid="imagenes-barra">

	<div class="img-det-barra__buscador">
		<i
		class="bi bi-search img-det-barra__lupa"
		aria-hidden="true"></i>
		<b-form-input
		type="search"
		data-testid="imagenes-buscador"
		placeholder="Buscar por nombre o código"
		autocomplete="off"
		:value="value"
		@input="$emit('input', $event)"></b-form-input>
	</div>

	<!--
		Mientras la busqueda corre, los articulos nuevos no se meten solos en la lista (le
		moverian las filas a quien esta revisando): se avisa que hay y se actualiza con un clic.
	-->
	<button
	v-if="hay_novedades"
	type="button"
	class="img-det-barra__novedades"
	data-testid="imagenes-actualizar-lista"
	@click="$emit('actualizar')">
		<i class="bi bi-arrow-repeat"></i>
		Hay artículos nuevos: actualizar
	</button>

	<!-- Aprobar o rechazar de a muchos: solo en "A revisar" y solo si hay algo en la pagina. -->
	<div
	v-if="solapa === 'a_revisar' && cantidad_en_pagina > 0"
	class="img-det-barra__lote">
		<b-form-checkbox
		class="img-det-barra__todos"
		data-testid="imagenes-seleccionar-pagina"
		:checked="todos_seleccionados"
		:indeterminate="algunos_seleccionados"
		:disabled="ocupado"
		@change="$emit('seleccionar_pagina', $event)">
			Seleccionar la página
		</b-form-checkbox>

		<template v-if="cantidad_seleccionados > 0">
			<b-button
			class="btn-modulo"
			variant="outline-danger"
			data-testid="imagenes-lote-rechazar"
			:disabled="ocupado"
			@click="$emit('rechazar_seleccionadas')">
				Rechazar seleccionadas ({{ cantidad_seleccionados }})
			</b-button>
			<!--
				Ayuda a la izquierda: es el ultimo de la barra, pegado al borde derecho del modal
				(ver FilaARevisar.vue). "Rechazar seleccionadas" queda lejos del borde y no lo
				necesita.
			-->
			<b-button
			class="btn-modulo"
			variant="success"
			data-testid="imagenes-lote-aprobar"
			data-ayuda-placement="left"
			:disabled="ocupado"
			@click="$emit('aprobar_seleccionadas')">
				Aprobar seleccionadas ({{ cantidad_seleccionados }})
			</b-button>
		</template>
	</div>

</div>
</template>
<script>
/**
 * Barra de una solapa del detalle de una búsqueda: el buscador por nombre o código, el aviso de
 * "hay artículos nuevos" mientras la búsqueda corre y, en "A revisar", la selección de la página
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
		/** no_asignadas | a_revisar | asignadas */
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
		/** true si la búsqueda sigue corriendo y la solapa ya tiene más de lo que se ve. */
		hay_novedades: {
			type: Boolean,
			default: false,
		},
	},
}
</script>
<style lang="sass">
// Sin scope: vive adentro del b-modal del detalle. Prefijo img-det-barra; colores por token.
.img-det-barra
	display: flex
	flex-direction: row
	align-items: center
	flex-wrap: wrap
	gap: 10px 12px
	margin: 14px 0 12px

.img-det-barra__buscador
	position: relative
	display: flex
	align-items: center
	flex: 1 1 260px
	max-width: 380px
	min-width: 0

.img-det-barra__lupa
	position: absolute
	left: 12px
	font-size: 0.875rem
	color: var(--color-text-secondary, #6c757d)
	pointer-events: none

// El input lleva el pill del buscador del sistema (altura de barra, radio = altura / 2). El id
// del modal adelante le gana a los selectores de etiqueta de _inputs.sass sin !important, que es
// el patron de la guia de estilo para los inputs de un modal.
#imagenes-asignacion-detalle .img-det-barra__buscador .form-control
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

.img-det-barra__novedades
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

.img-det-barra__lote
	display: flex
	flex-wrap: wrap
	align-items: center
	gap: 8px 10px
	margin-left: auto

.img-det-barra__todos
	margin-right: 4px
	font-size: 0.875rem
	color: var(--color-text-primary, #212529)

// Telefono: el buscador y el lote a lo ancho, uno debajo del otro.
@media (max-width: 575px)
	.img-det-barra__buscador
		max-width: none
		flex-basis: 100%

	.img-det-barra__lote
		margin-left: 0
		width: 100%

		// "Rechazar seleccionadas (12)" no entra en media pantalla de telefono: el boton crece
		// a dos renglones en vez de cortar el texto (el alto fijo de .btn-modulo lo recortaba).
		// Tres clases a proposito: .btn-modulo.btn es (0,2,0) y vive en una hoja global.
		.btn.btn-modulo
			flex: 1 1 0
			height: auto
			min-height: var(--toolbar-control-h, 36px)
			padding: 6px 10px
			line-height: 1.2
			white-space: normal
</style>
