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
 *
 * No tiene `<style>` propio: el diseño del ítem lo declara `src/sass/_menus_desplegables.sass`,
 * que es el mismo para los tres menús desplegables del listado (misión 28).
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
