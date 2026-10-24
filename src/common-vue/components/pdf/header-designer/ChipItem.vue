<template>
	<div
	class="header-designer-chip"
	:class="{ 'header-designer-chip--locked': locked }"
	:title="locked ? 'Campo obligatorio del perfil fiscal: se puede mover de cuadrante pero no quitar' : label">
		<i class="icon-list header-designer-chip__handle"></i>
		<span
		class="header-designer-chip__label"
		:class="{ 'header-designer-chip__label--negrita': bold }">{{ label }}</span>
		<!--
			Misión pdf-negrita-perfil: el VALOR de este dato sale en negrita en el PDF (el rótulo del
			encabezado ya es negrita). Solo en un dato colocado; la paleta de datos sin colocar no lo lleva.
			Mismo botón B que el de los campos del diseñador (bi-type-bold, aria-pressed). La clase
			header-designer-chip__bold es el `filter` de Sortable en QuadrantList: apretarlo no arranca
			un arrastre.
		-->
		<button
		v-if="can_bold"
		type="button"
		class="header-designer-chip__bold"
		:class="{ 'header-designer-chip__bold--activo': bold }"
		:aria-pressed="bold ? 'true' : 'false'"
		:title="bold ? 'Valor en negrita: tocá para volver a letra normal' : 'Poner el valor en negrita'"
		:aria-label="'Negrita en ' + label"
		:data-testid="'negrita-chip-' + chip_key"
		@click.stop="$emit('toggle_bold')">
			<i class="bi bi-type-bold"></i>
		</button>
		<span
		v-if="locked"
		class="header-designer-chip__lock"
		title="Obligatorio (fiscal)">🔒</span>
	</div>
</template>

<script>
/**
 * Chip individual arrastrable del diseñador de header (prompt 441).
 *
 * Representa un campo del header (ej. "Razón Social") dentro de un cuadrante o de
 * la paleta de campos no colocados. Es puramente presentacional: el drag & drop lo
 * maneja el `<draggable>` (vuedraggable) del componente padre (QuadrantList/ChipPalette);
 * este componente solo define cómo se ve cada chip.
 */
export default {
	name: 'HeaderDesignerChipItem',
	props: {
		/**
		 * Texto legible del chip (ej. "Razón Social").
		 */
		label: {
			type: String,
			required: true,
		},
		/**
		 * Si es true, el chip es un campo fiscal obligatorio: se puede reordenar o
		 * mover de cuadrante, pero no se puede quitar del header (ver
		 * header_designer_catalog.js -> FISCAL_REQUIRED_EMISOR_KEYS).
		 */
		locked: {
			type: Boolean,
			default: false,
		},
		/**
		 * Clave del chip (ej. 'cuit'); solo se usa para el data-testid del botón de negrita.
		 */
		chip_key: {
			type: String,
			default: '',
		},
		/**
		 * Si el valor de este dato sale en negrita en el PDF (header_layout.bold).
		 */
		bold: {
			type: Boolean,
			default: false,
		},
		/**
		 * Si se ofrece el botón B de negrita. Solo los datos colocados en un cuadrante lo llevan;
		 * quien no lo pida (la paleta) ve el chip como siempre. Al tocarlo emite `toggle_bold`.
		 */
		can_bold: {
			type: Boolean,
			default: false,
		},
	},
}
</script>

<style lang="sass" scoped>
.header-designer-chip
	display: flex
	align-items: center
	gap: 6px
	padding: 4px 8px
	margin-bottom: 6px
	background: var(--bg-section, #fff)
	border: 1px solid rgba(0, 0, 0, .15)
	border-radius: 4px
	font-size: 12px
	cursor: grab
	user-select: none

	&:active
		cursor: grabbing

.header-designer-chip--locked
	background: rgba(255, 193, 7, .12)
	border-color: rgba(255, 193, 7, .5)

.header-designer-chip__handle
	color: var(--color-text-secondary, rgba(0, 0, 0, .35))

.header-designer-chip__label
	flex: 1 1 auto
	white-space: nowrap
	overflow: hidden
	text-overflow: ellipsis

// Con el valor en negrita, el chip lo muestra en negrita (es la vista previa del dato)
.header-designer-chip__label--negrita
	font-weight: 700

// Botón B de negrita: chiquito, a la derecha del chip
.header-designer-chip__bold
	display: inline-flex
	align-items: center
	justify-content: center
	flex: 0 0 auto
	width: 22px
	height: 22px
	padding: 0
	border: 1px solid var(--color-border, rgba(0, 0, 0, .2))
	border-radius: 6px
	background: var(--bg-card, #fff)
	color: var(--color-text-primary, inherit)
	font-size: 13px
	line-height: 1
	cursor: pointer

	&:hover
		border-color: var(--color-primary)

	&:focus
		outline: none

	&:focus-visible
		box-shadow: 0 0 0 3px var(--metodo-pago-focus-ring)

.header-designer-chip__bold--activo
	border-color: var(--color-primary)
	background: var(--bg-nav-hover)
	color: var(--color-primary)

.header-designer-chip__lock
	font-size: 11px
</style>
