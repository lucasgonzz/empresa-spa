<template>
	<div class="catalog-source-palette">
		<p class="catalog-source-palette__title small text-muted m-b-5">
			Datos del negocio sin colocar
		</p>

		<!-- pull: 'clone' deja el chip en la paleta y mete en la columna destino lo que devuelve
		clone_source (una fila nueva). put: false evita que se suelte una fila acá; sort: false,
		que se reordene la paleta. Al soltar, la fuente desaparece sola de la paleta porque
		`available_sources` es un computed del padre que excluye las fuentes ya colocadas. -->
		<draggable
		class="catalog-source-palette__list"
		:list="available_sources"
		:group="{ name: 'catalog-rows', pull: 'clone', put: false }"
		:clone="clone_source"
		:sort="false"
		:animation="150"
		:disabled="disabled"
		:delay="150"
		:delay-on-touch-only="true"
		ghost-class="catalog-source-chip--ghost">
			<div
			v-for="source in available_sources"
			:key="source.key"
			class="catalog-source-chip"
			:title="disabled ? source.label : 'Arrastrá a la hoja, o tocá para agregarlo a la columna izquierda'"
			@click="add_source(source)">
				<i class="icon-list catalog-source-chip__handle"></i>
				<span class="catalog-source-chip__label">{{ source.label }}</span>
				<span class="catalog-source-chip__value">{{ source.value }}</span>
			</div>
		</draggable>

		<p
		v-if="!available_sources.length"
		class="small text-muted font-italic m-b-10">
			{{ empty_text }}
		</p>

		<b-button
		size="sm"
		variant="outline-primary"
		:disabled="disabled"
		@click="$emit('add-free-row')">
			<i class="icon-plus"></i>
			Agregar renglón libre
		</b-button>
	</div>
</template>

<script>
import draggable from 'vuedraggable'
import { new_row } from '@/common-vue/components/pdf/catalog-header-designer/catalog_header_designer_catalog'

/**
 * Paleta de datos del negocio del diseñador del encabezado del catálogo: chips
 * arrastrables con las fuentes que tienen valor y todavía no están en ninguna columna.
 *
 * Arrastrar un chip a una columna de la hoja agrega ahí un renglón con el título (label)
 * y el valor actual, atado a la fuente (`source`): al imprimir, la API vuelve a leer el
 * dato del negocio. Tocar el chip lo agrega al final de la columna izquierda, para que
 * en teléfono no dependa del arrastre entre zonas que scrollean.
 */
export default {
	name: 'CatalogHeaderDesignerSourcePalette',
	components: {
		draggable,
	},
	props: {
		/**
		 * Fuentes con valor que todavía no están colocadas: [{ key, label, value }].
		 * Es un computed del padre; acá no se muta (pull: 'clone', put: false).
		 */
		available_sources: {
			type: Array,
			required: true,
		},
		/**
		 * Cantidad total de fuentes con valor (colocadas o no), para el texto de la paleta vacía.
		 */
		total_sources: {
			type: Number,
			default: 0,
		},
		/**
		 * Apaga el arrastre y el botón (vista de la hoja 2).
		 */
		disabled: {
			type: Boolean,
			default: false,
		},
	},
	computed: {
		/**
		 * Texto de la paleta sin chips: distingue "no hay datos cargados" de "ya están todos
		 * en la hoja".
		 *
		 * @return {string}
		 */
		empty_text() {
			if (!this.total_sources) {
				return 'No hay datos del negocio con valor para arrastrar. Cargalos en Mi negocio.'
			}
			return 'Todos los datos del negocio ya están en la hoja.'
		},
	},
	methods: {
		/**
		 * Lo que vuedraggable inserta en la columna destino al soltar un chip (pull: 'clone'):
		 * una fila nueva con uid propio, atada a la fuente.
		 *
		 * @param {Object} source Fuente original de la paleta ({ key, label, value }).
		 * @return {Object} Fila nueva para la columna.
		 */
		clone_source(source) {
			return new_row(source.label, source.value, source.key)
		},
		/**
		 * Alternativa al arrastre (teléfono): avisa al padre para que agregue la fuente al
		 * final de la columna izquierda.
		 *
		 * @param {Object} source Fuente tocada.
		 * @return {void}
		 */
		add_source(source) {
			if (this.disabled) {
				return
			}
			this.$emit('add-source', source)
		},
	},
}
</script>

<style lang="sass">
.catalog-source-palette
	width: 100%

.catalog-source-palette__title
	text-transform: uppercase
	letter-spacing: .03em
	font-size: 10px

.catalog-source-palette__list
	min-height: 40px
	border: 1px dashed var(--color-border)
	border-radius: 4px
	padding: 6px
	background: var(--bg-section)
	margin-bottom: 10px

.catalog-source-chip
	display: flex
	align-items: center
	gap: 6px
	padding: 4px 8px
	margin-bottom: 6px
	background: var(--bg-card)
	border: 1px solid var(--color-border)
	border-radius: 4px
	font-size: 12px
	color: var(--color-text-primary)
	cursor: grab
	user-select: none

	&:last-child
		margin-bottom: 0

	&:active
		cursor: grabbing

.catalog-source-chip__handle
	color: var(--color-text-secondary)

.catalog-source-chip__label
	flex: 0 0 auto
	font-weight: 600
	white-space: nowrap

.catalog-source-chip__value
	flex: 1 1 auto
	min-width: 0
	color: var(--color-text-secondary)
	white-space: nowrap
	overflow: hidden
	text-overflow: ellipsis
	text-align: right

.catalog-source-chip--ghost
	opacity: .4
</style>
