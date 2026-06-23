<template>
	<b-dropdown-item
	:link-class="link_classes"
	:id="id"
	@click="on_click"
	@mousedown.native.stop>
		<span class="excel-dropdown-option__inner">
			<span class="excel-dropdown-option__icon-wrap">
				<i :class="icon"></i>
			</span>
			<span class="excel-dropdown-option__label">
				<slot></slot>
			</span>
		</span>
	</b-dropdown-item>
</template>
<script>
/**
 * Ítem de menú con ícono en celda y label para el dropdown Crear (excel / import / export).
 */
export default {
	props: {
		/**
		 * Identificador opcional del botón (p. ej. para pruebas o referencias en DOM).
		 */
		id: {
			type: String,
			default: '',
		},
		/**
		 * Clase del ícono a mostrar a la izquierda del texto.
		 */
		icon: {
			type: String,
			required: true,
		},
		/**
		 * Variante visual opcional (`danger` para acciones destructivas).
		 */
		variant: {
			type: String,
			default: '',
		},
	},
	computed: {
		/**
		 * Clases CSS del enlace interno según variante.
		 *
		 * @return {string}
		 */
		link_classes() {
			let classes = 'excel-dropdown-option dropdown-item'
			if (this.variant) {
				classes += ' excel-dropdown-option--' + this.variant
			}
			return classes
		},
	},
	methods: {
		/**
		 * Reenvía el click al padre para mantener el mismo contrato que `b-dropdown-item`.
		 *
		 * @return {void}
		 */
		on_click() {
			this.$emit('click')
		},
	},
}
</script>
<style lang="sass">
.excel-create-dropdown-menu .excel-dropdown-option.dropdown-item,
.excel-dropdown-submenu__menu .excel-dropdown-option.dropdown-item
	padding: 8px 1.25rem !important
	text-align: left
	white-space: normal

	&:hover,
	&:focus,
	&:active
		.excel-dropdown-option__icon-wrap
			background-color: rgba(0, 0, 0, 0.1)
			color: #343a40

.excel-dropdown-option__inner
	display: flex
	flex-direction: row
	align-items: center
	gap: 12px
	width: 100%
	min-height: 26px

.excel-dropdown-option__icon-wrap
	display: flex
	align-items: center
	justify-content: center
	flex-shrink: 0
	width: 32px
	height: 32px
	border-radius: 8px
	background-color: rgba(0, 0, 0, 0.06)
	color: #495057
	font-size: 1rem
	transition: background-color 0.15s ease, color 0.15s ease

	i.bi
		line-height: 1

.excel-dropdown-option__label
	flex: 1 1 auto
	font-size: 0.9rem
	font-weight: 500
	line-height: 1.35
	color: #212529
	text-align: left

.excel-dropdown-option--danger
	.excel-dropdown-option__icon-wrap
		background-color: rgba(220, 53, 69, 0.12)
		color: #c82333

	.excel-dropdown-option__label
		color: #c82333

	&:hover,
	&:focus
		.excel-dropdown-option__icon-wrap
			background-color: rgba(220, 53, 69, 0.2)
</style>
