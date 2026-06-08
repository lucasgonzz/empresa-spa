<template>
	<b-dropdown-item
	:class="option_classes"
	:id="id"
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
 * Ítem de menú con ícono alineado y label legible para dropdowns de seleccionados/filtrados.
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
