<template>
	<div class="header-designer-quadrant">
		<p class="header-designer-quadrant__title text-muted small m-b-5">{{ title }}</p>

		<draggable
		class="header-designer-quadrant__list"
		:list="items"
		:group="group"
		:animation="150"
		filter=".header-designer-chip__bold"
		:prevent-on-filter="false"
		ghost-class="header-designer-quadrant__ghost">
			<chip-item
			v-for="key in items"
			:key="key"
			:chip_key="key"
			:label="chip_label(key)"
			:locked="is_locked(key)"
			:bold="is_bold(key)"
			:can_bold="!!bold_keys"
			:data-chip-locked="is_locked(key)"
			@toggle_bold="toggle_bold(key)"></chip-item>
		</draggable>

		<p
		v-if="!items.length"
		class="header-designer-quadrant__empty text-muted small m-b-0">
			{{ empty_text }}
		</p>
	</div>
</template>

<script>
import draggable from 'vuedraggable'
import ChipItem from '@/common-vue/components/pdf/header-designer/ChipItem.vue'
import { chip_label } from '@/common-vue/components/pdf/header-designer/header_designer_catalog'

/**
 * Cuadrante arrastrable del diseñador de header (prompt 441): emisor izquierda,
 * emisor derecha o receptor izquierda.
 *
 * Recibe `items` (Array de claves de chip) y lo muta DIRECTAMENTE vía vuedraggable
 * (`:list`), igual que el patrón ya usado en `ColumnsPreferencesConfigModal.vue` para
 * `config_rows`. El array vive en el componente padre (Index.vue del diseñador), así
 * que el reordenamiento y el drag & drop entre cuadrantes del mismo `group` se
 * reflejan solos por referencia, sin necesidad de emitir eventos.
 */
export default {
	name: 'HeaderDesignerQuadrantList',
	components: {
		draggable,
		ChipItem,
	},
	props: {
		/**
		 * Título visible del cuadrante (ej. "Emisor · Izquierda").
		 */
		title: {
			type: String,
			required: true,
		},
		/**
		 * Claves de chips colocados en este cuadrante, en el orden visual actual.
		 * Se muta directamente por vuedraggable (drag & drop y reorden).
		 */
		items: {
			type: Array,
			required: true,
		},
		/**
		 * Nombre del grupo de drag & drop de vuedraggable. Cuadrantes y paleta que
		 * comparten el mismo `group` permiten arrastrar chips entre ellos (ej. todos
		 * los cuadrantes/paleta de "emisor" comparten group="emisor").
		 */
		group: {
			type: String,
			required: true,
		},
		/**
		 * Claves de chips que no se pueden quitar (campos fiscales obligatorios).
		 * Solo aplica al bloque emisor en perfiles fiscales.
		 */
		locked_keys: {
			type: Array,
			default() {
				return []
			},
		},
		/**
		 * Texto a mostrar cuando el cuadrante no tiene chips colocados.
		 */
		empty_text: {
			type: String,
			default: 'Arrastrá campos acá',
		},
		/**
		 * Misión pdf-negrita-perfil: claves de los chips cuyo VALOR sale en negrita (header_layout.bold,
		 * una sola lista para todo el encabezado). Se muta directamente, como `items`. Opcional: sin
		 * ella (null) los chips no llevan el botón B y se ven como siempre.
		 */
		bold_keys: {
			type: Array,
			default: null,
		},
	},
	methods: {
		/**
		 * Si el valor de un chip sale en negrita.
		 *
		 * @param {string} key Clave del chip.
		 * @return {boolean}
		 */
		is_bold(key) {
			return !!this.bold_keys && this.bold_keys.indexOf(key) !== -1
		},
		/**
		 * Prende o apaga la negrita del valor de un chip, mutando la lista del padre por referencia.
		 *
		 * @param {string} key Clave del chip.
		 * @return {void}
		 */
		toggle_bold(key) {
			if (!this.bold_keys) {
				return
			}
			const index = this.bold_keys.indexOf(key)
			if (index === -1) {
				this.bold_keys.push(key)
			} else {
				this.bold_keys.splice(index, 1)
			}
		},
		/**
		 * Label legible de un chip según el catálogo compartido. Las sucursales del store dan el
		 * nombre de un chip 'sucursal_<id>' (misión pdf-direccion-sucursales).
		 *
		 * @param {string} key Clave del chip.
		 * @return {string}
		 */
		chip_label(key) {
			return chip_label(key, this.$store.state.address ? this.$store.state.address.models : [])
		},
		/**
		 * Indica si el chip es obligatorio (no se puede quitar) en este cuadrante.
		 *
		 * @param {string} key Clave del chip.
		 * @return {boolean}
		 */
		is_locked(key) {
			return this.locked_keys.indexOf(key) !== -1
		},
	},
}
</script>

<style lang="sass" scoped>
.header-designer-quadrant
	width: 100%
	min-height: 60px

.header-designer-quadrant__title
	text-transform: uppercase
	letter-spacing: .03em
	font-size: 10px

.header-designer-quadrant__list
	min-height: 40px
	border: 1px dashed rgba(0, 0, 0, .2)
	border-radius: 4px
	padding: 6px

.header-designer-quadrant__ghost
	opacity: .4
	background: rgba(0, 123, 255, .08) !important

.header-designer-quadrant__empty
	font-style: italic
</style>
