<template>
	<b-dropdown-item
	:link-class="link_classes"
	:id="id"
	:data-tour="data_tour"
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
		data_tour: {
			type: String,
			default: null,
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
			// El hover tambien va con tokens: con el rgba(0,0,0,0.1) de antes, sobre fondo oscuro
			// el hover OSCURECIA la celda en vez de destacarla.
			background-color: var(--bg-card)
			border-color: var(--color-text-primary)
			color: var(--color-text-primary)

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
	// Antes: fondo rgba(0,0,0,0.06) con icono #495057, o sea un gris medio sobre un gris casi
	// blanco -- a un metro de la pantalla la celda se leia vacia.
	//
	// Lo que sube el contraste es el ICONO, y las cifras estan medidas sobre el fondo real de la
	// celda: en claro pasa de #495057 sobre #f0f0f0 (7,2:1) a #212529 sobre #f1f3f5 (13,9:1). La
	// ganancia grande es en OSCURO, donde el hex fijo era directamente ilegible: #495057 sobre
	// #1e2127 da 2:1, y con el token queda #e6e8eb sobre #23272e, o sea 12,2:1. Por eso van tokens
	// y no hexadecimales.
	//
	// El fondo queda practicamente igual a proposito (rgba(0,0,0,0.06) sobre blanco da ~#f0f0f0 y
	// --bg-hover es #f1f3f5): si alguien lee esto buscando por que "no se ve mas oscuro el fondo",
	// no tiene que verse. El borde aporta forma mas que contraste -- #dee2e6 contra la celda es
	// apenas 1,2:1.
	//
	// Va con tokens y no con hexadecimales: estos valores viven adentro de un menu que tambien se
	// ve en html.dark-mode, y un #495057 fijo ahi desaparece contra el fondo oscuro.
	background-color: var(--bg-hover)
	border: 1px solid var(--color-border)
	color: var(--color-text-primary)
	font-size: 1rem
	transition: background-color 0.15s ease, color 0.15s ease

	i.bi
		line-height: 1

.excel-dropdown-option__label
	flex: 1 1 auto
	font-size: 0.9rem
	font-weight: 500
	line-height: 1.35
	color: var(--color-text-primary)
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
