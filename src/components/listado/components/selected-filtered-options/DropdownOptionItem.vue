<template>
	<b-dropdown-item
	:class="option_classes"
	:data-tour="data_tour"
	@click="on_click">
		<span class="article-dropdown-option__content">
			<span class="article-dropdown-option__icon-wrap">
				<i :class="icon"></i>
			</span>
			<span class="article-dropdown-option__label">
				<slot></slot>
			</span>
		</span>
	</b-dropdown-item>
</template>
<script>
/**
 * Ítem de menú con ícono alineado y label legible para el dropdown de artículos.
 */
export default {
	props: {
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
		/**
		 * Ancla `data-tour` del contrato de la demo, cuando este ítem es un paso de un tour.
		 *
		 * Se declara como prop (y no se deja caer como atributo suelto) porque `b-dropdown-item`
		 * tiene `inheritAttrs: false`: los atributos sueltos igual llegan, pero al `<a>` de
		 * adentro y no al `<li>`. Pasandolo explicito queda claro donde termina.
		 *
		 * `null` por defecto a proposito: con `''` Vue dibuja el atributo vacio y el validador del
		 * contrato lo cuenta como un anclaje puesto.
		 */
		data_tour: {
			type: String,
			default: null,
		},
	},
	computed: {
		/**
		 * Clases CSS del ítem según variante.
		 *
		 * @return {Array}
		 */
		option_classes() {
			const classes = ['article-dropdown-option']
			if (this.variant) {
				classes.push('article-dropdown-option--' + this.variant)
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
