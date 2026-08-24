<template>
	<b-dropdown-item
	v-b-tooltip.hover
	:title="tooltip"
	:class="option_classes"
	:id="id"
	:disabled="disabled"
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
		/**
		 * Si es true, el ítem se muestra deshabilitado (no clickeable) y atenuado visualmente.
		 * Se usa, por ejemplo, cuando la acción no está disponible por venir de un buscador
		 * general en vez del buscador de filtros estructurado.
		 */
		disabled: {
			type: Boolean,
			default: false,
		},
		/**
		 * Texto del tooltip a mostrar al pasar el mouse cuando `disabled` es true. Si viene
		 * vacío, no se muestra ningún tooltip (comportamiento actual sin cambios).
		 */
		tooltip: {
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
			if (this.disabled) {
				classes.push('article-dropdown-option--disabled')
			}
			return classes
		},
	},
	methods: {
		/**
		 * Reenvía el click al padre para mantener el mismo contrato que `b-dropdown-item`.
		 * Guard defensivo: si el ítem está deshabilitado, no emite el evento (refuerza el
		 * `disabled` nativo de `b-dropdown-item`, sin depender solo de él).
		 *
		 * @return {void}
		 */
		on_click() {
			if (this.disabled) {
				return
			}
			this.$emit('click')
		},
	},
}
</script>
