<template>
	<div
	class="catalog-row-list"
	:class="{
		'catalog-row-list--right': align === 'right',
		'catalog-row-list--disabled': disabled,
	}">
		<draggable
		class="catalog-row-list__drop"
		:list="rows"
		:group="{ name: 'catalog-rows' }"
		handle=".catalog-row__handle"
		:animation="150"
		:disabled="disabled"
		:delay="150"
		:delay-on-touch-only="true"
		ghost-class="catalog-row--ghost">
			<div
			v-for="(row, index) in rows"
			:key="row.uid"
			class="catalog-row"
			:class="{ 'catalog-row--source': !!row.source }">
				<span
				class="catalog-row__handle"
				title="Arrastrá para mover o reordenar el renglón">
					<i class="icon-list"></i>
				</span>

				<b-form-input
				v-model="row.title"
				size="sm"
				placeholder="Título"
				maxlength="60"
				class="catalog-row__input catalog-row__title"
				:disabled="disabled"></b-form-input>

				<!-- Con source, el valor lo pone el negocio al imprimir: acá se ve el actual, sin editar -->
				<b-form-input
				v-model="row.value"
				size="sm"
				placeholder="Valor"
				maxlength="200"
				class="catalog-row__input catalog-row__value"
				:class="{ 'catalog-row__value--negrita': row.bold }"
				:disabled="disabled || !!row.source"
				:title="row.source ? 'Se toma de los datos del negocio' : ''"></b-form-input>

				<!--
					Misión pdf-negrita-perfil: el VALOR del renglón sale en negrita en el PDF (el título ya es
					negrita), sea texto libre o dato del negocio. Mismo botón B que el diseñador de cajas
					(bi-type-bold, aria-pressed). Escribe row.bold, que viaja en catalog_header_layout.
				-->
				<button
				type="button"
				class="catalog-row__bold"
				:class="{ 'catalog-row__bold--activo': row.bold }"
				:aria-pressed="row.bold ? 'true' : 'false'"
				:title="row.bold ? 'Valor en negrita: tocá para volver a letra normal' : 'Poner el valor en negrita'"
				:aria-label="'Negrita en el valor de ' + (row.title || 'este renglón')"
				:data-testid="'negrita-renglon-catalogo-' + align + '-' + index"
				:disabled="disabled"
				@click="toggle_bold(row)">
					<i class="bi bi-type-bold"></i>
				</button>
				<button
				type="button"
				class="catalog-row__remove"
				title="Quitar renglón"
				:disabled="disabled"
				@click="remove_row(index)">
					<i class="icon-trash"></i>
				</button>
			</div>
		</draggable>

		<p
		v-if="!rows.length"
		class="catalog-row-list__empty small m-b-0">
			{{ empty_text }}
		</p>
	</div>
</template>

<script>
import draggable from 'vuedraggable'

/**
 * Lista de renglones de una columna del encabezado del catálogo (izquierda o derecha),
 * con drag & drop entre columnas y reorden dentro de la misma.
 *
 * Recibe `rows` (filas con uid/title/value/source) y lo muta DIRECTAMENTE: vuedraggable
 * inserta/saca/reordena vía `:list`, los inputs escriben en cada fila y el tacho hace
 * `splice`. El array vive en el estado de trabajo del diseñador (Index.vue), así que
 * todo se refleja por referencia, igual que hace QuadrantList.vue en el diseñador de
 * ventas. El drag arranca SOLO desde la manija (`handle`), por eso los inputs de adentro
 * se pueden usar normal.
 */
export default {
	name: 'CatalogHeaderDesignerRowList',
	components: {
		draggable,
	},
	props: {
		/**
		 * Renglones de esta columna, en el orden visual actual. Se mutan por referencia.
		 */
		rows: {
			type: Array,
			required: true,
		},
		/**
		 * Alineación del texto: 'left' para la columna izquierda, 'right' para la derecha
		 * (el PDF imprime la derecha alineada a la derecha).
		 */
		align: {
			type: String,
			default: 'left',
		},
		/**
		 * Apaga el drag & drop y los inputs (vista de la hoja 2).
		 */
		disabled: {
			type: Boolean,
			default: false,
		},
		/**
		 * Texto cuando la columna no tiene renglones.
		 */
		empty_text: {
			type: String,
			default: 'Arrastrá datos acá',
		},
	},
	methods: {
		/**
		 * Prende o apaga la negrita del valor de un renglón (mutando la fila por referencia).
		 *
		 * @param {Object} row Renglón de esta columna.
		 * @return {void}
		 */
		toggle_bold(row) {
			if (this.disabled) {
				return
			}
			row.bold = !row.bold
		},
		/**
		 * Quita el renglón de la columna, mutando el array por referencia.
		 *
		 * @param {number} index Posición del renglón.
		 * @return {void}
		 */
		remove_row(index) {
			if (this.disabled) {
				return
			}
			this.rows.splice(index, 1)
		},
	},
}
</script>

<style lang="sass">
// Solo la disposición de los renglones: los colores de la hoja (papel, inputs, manija,
// tacho) los declara CatalogHeaderPreview.vue, que es el dueño de la simulación de papel.
.catalog-row-list
	width: 100%
	min-width: 0

.catalog-row-list__drop
	min-height: 36px
	border: 1px dashed transparent
	border-radius: 4px
	padding: 2px

.catalog-row
	display: flex
	align-items: center
	gap: 3px
	margin-bottom: 4px

	&:last-child
		margin-bottom: 0

.catalog-row__handle
	flex: 0 0 auto
	display: flex
	align-items: center
	justify-content: center
	width: 14px
	height: 26px
	cursor: grab
	user-select: none

	&:active
		cursor: grabbing

// Los inputs van más chicos que un form-control-sm: la hoja está a escala (2,5px por mm) y la
// columna derecha mide el 40% de un A4, o sea que cada px de padding es texto que no se ve.
.catalog-row .catalog-row__input
	min-width: 0
	height: 26px
	padding: 2px 5px
	font-size: 11px
	line-height: 1.4

.catalog-row__title
	flex: 0 0 36%

.catalog-row__value
	flex: 1 1 0

// Valor en negrita: el input lo muestra en negrita (es la vista previa del renglón)
.catalog-row .catalog-row__input.catalog-row__value--negrita
	font-weight: 700

// Botón B: layout solamente; sus colores son los del papel y los declara CatalogHeaderPreview.vue
.catalog-row__bold
	flex: 0 0 auto
	display: flex
	align-items: center
	justify-content: center
	width: 20px
	height: 26px
	padding: 0
	border: 1px solid transparent
	border-radius: 4px
	background: transparent
	font-size: 12px
	line-height: 1
	cursor: pointer
	&:disabled
		cursor: default
		opacity: .4
.catalog-row__remove
	flex: 0 0 auto
	width: 20px
	height: 26px
	padding: 0
	border: 0
	background: transparent
	cursor: pointer
	line-height: 1

	&:disabled
		cursor: default
		opacity: .4

.catalog-row--ghost
	opacity: .4

.catalog-row-list--right
	.catalog-row__input
		text-align: right

.catalog-row-list--disabled
	.catalog-row__handle
		cursor: default
		opacity: .4
	// En la hoja 2 (solo para mirar) el B muestra el estado pero no se toca
	.catalog-row__bold--activo
		opacity: .7

.catalog-row-list__empty
	font-style: italic
	padding: 2px 4px
</style>
