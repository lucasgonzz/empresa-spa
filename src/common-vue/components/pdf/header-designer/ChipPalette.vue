<template>
	<div class="header-designer-palette">
		<p class="header-designer-palette__section-title small text-muted m-b-5">
			Campos del emisor sin colocar
		</p>
		<draggable
		class="header-designer-palette__list"
		:list="emisor_palette"
		group="emisor"
		:move="check_move"
		:animation="150"
		ghost-class="header-designer-quadrant__ghost">
			<chip-item
			v-for="key in emisor_palette"
			:key="key"
			:label="chip_label(key)"
			:data-chip-locked="is_emisor_locked(key)"></chip-item>
		</draggable>
		<p
		v-if="!emisor_palette.length"
		class="small text-muted font-italic m-b-15">
			Todos los campos del emisor ya están colocados.
		</p>

		<template v-if="show_receptor">
			<hr class="m-t-15 m-b-15">
			<p class="header-designer-palette__section-title small text-muted m-b-5">
				Campos del receptor sin colocar
			</p>
			<draggable
			class="header-designer-palette__list"
			:list="receptor_palette"
			group="receptor"
			:animation="150"
			ghost-class="header-designer-quadrant__ghost">
				<chip-item
				v-for="key in receptor_palette"
				:key="key"
				:label="chip_label(key)"></chip-item>
			</draggable>
			<p
			v-if="!receptor_palette.length"
			class="small text-muted font-italic m-b-0">
				Todos los campos del receptor ya están colocados.
			</p>
		</template>
	</div>
</template>

<script>
import draggable from 'vuedraggable'
import ChipItem from '@/common-vue/components/pdf/header-designer/ChipItem.vue'
import { chip_label } from '@/common-vue/components/pdf/header-designer/header_designer_catalog'

/**
 * Paleta lateral del diseñador de header (prompt 441): muestra los chips todavía
 * no colocados en ningún cuadrante, separados por grupo ("emisor" / "receptor").
 *
 * Arrastrar un chip desde acá hacia un cuadrante lo agrega; arrastrar un chip desde
 * un cuadrante hacia acá lo quita del header (excepto los campos fiscales
 * obligatorios, bloqueados por `check_move`).
 */
export default {
	name: 'HeaderDesignerChipPalette',
	components: {
		draggable,
		ChipItem,
	},
	props: {
		/**
		 * Claves de chips de emisor que todavía no están en ningún cuadrante.
		 * Se muta directamente por vuedraggable (drag & drop entre paleta y cuadrantes).
		 */
		emisor_palette: {
			type: Array,
			required: true,
		},
		/**
		 * Claves de chips de receptor que todavía no están colocados (remito negro).
		 */
		receptor_palette: {
			type: Array,
			required: true,
		},
		/**
		 * Muestra la sección de receptor solo en perfiles no fiscales (remito negro).
		 */
		show_receptor: {
			type: Boolean,
			default: false,
		},
		/**
		 * Claves de chips de emisor obligatorios (no se pueden quitar) en el perfil actual.
		 */
		locked_keys: {
			type: Array,
			default() {
				return []
			},
		},
	},
	methods: {
		/**
		 * Label legible de un chip según el catálogo compartido.
		 *
		 * @param {string} key Clave del chip.
		 * @return {string}
		 */
		chip_label(key) {
			return chip_label(key)
		},
		/**
		 * Indica si un chip de emisor es obligatorio (usado solo para marcar el
		 * atributo `data-chip-locked` que lee `check_move`).
		 *
		 * @param {string} key Clave del chip.
		 * @return {boolean}
		 */
		is_emisor_locked(key) {
			return this.locked_keys.indexOf(key) !== -1
		},
		/**
		 * Handler `:move` de vuedraggable para la paleta de emisor: rechaza el
		 * movimiento cuando el chip arrastrado es un campo fiscal obligatorio, para
		 * que no se pueda "quitar" soltándolo en la paleta.
		 *
		 * @param {Object} evt Evento de vuedraggable (incluye `.dragged`, el elemento DOM arrastrado).
		 * @return {boolean} false cancela el movimiento.
		 */
		check_move(evt) {
			const dragged_el = evt.dragged
			if (dragged_el && dragged_el.dataset && dragged_el.dataset.chipLocked === 'true') {
				return false
			}
			return true
		},
	},
}
</script>

<style lang="sass" scoped>
.header-designer-palette
	width: 100%

.header-designer-palette__section-title
	text-transform: uppercase
	letter-spacing: .03em
	font-size: 10px

.header-designer-palette__list
	min-height: 40px
	border: 1px dashed rgba(0, 0, 0, .2)
	border-radius: 4px
	padding: 6px
	background: rgba(0, 0, 0, .015)
</style>
