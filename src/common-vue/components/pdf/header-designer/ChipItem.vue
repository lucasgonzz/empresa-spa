<template>
	<div
	class="header-designer-chip"
	:class="{ 'header-designer-chip--locked': locked }"
	:title="locked ? 'Campo obligatorio del perfil fiscal: se puede mover de cuadrante pero no quitar' : label">
		<i class="icon-list header-designer-chip__handle"></i>
		<span class="header-designer-chip__label">{{ label }}</span>
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
	background: #fff
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
	color: rgba(0, 0, 0, .35)

.header-designer-chip__label
	flex: 1 1 auto
	white-space: nowrap
	overflow: hidden
	text-overflow: ellipsis

.header-designer-chip__lock
	font-size: 11px
</style>
