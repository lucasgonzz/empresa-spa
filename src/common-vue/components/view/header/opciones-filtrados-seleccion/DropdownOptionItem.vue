<template>
	<b-dropdown-item
	v-b-tooltip.hover.noninteractive.right.viewport
	:title="tooltip"
	:class="option_classes"
	:data-testid="testid"
	data-ayuda-placement="right"
	data-ayuda-no-interactiva
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
 *
 * 🔴 El globo de un ítem deshabilitado va `noninteractive` y a la derecha (5/10/2026). BootstrapVue
 * 2.23 arma los tooltips INTERACTIVOS por defecto: si el mouse pasa del ítem al globo, el globo no
 * se cierra y recibe el clic. Sin lugar arriba, el globo de "Eliminar" caía abajo, justo encima de
 * "Hacer Factura" en el menú de seleccionados de Ventas: el clic le pegaba al globo, el menú se
 * cerraba y "Emitir facturas" no se abría nunca. Con `noninteractive` el globo lleva
 * `pointer-events: none` (el clic pasa al ítem de abajo) y se cierra apenas el mouse sale del ítem.
 * `right` + `viewport` lo sacan al costado del menú (o al otro costado, si no entra): sin `viewport`
 * el límite de popper es el `.dropdown-menu`, que tiene `overflow-y: auto`, y el globo terminaba
 * empujado ADENTRO del menú tapando el label del propio ítem y del de abajo. En un teléfono no entra
 * a ningún costado y se superpone igual, pero ya no intercepta nada.
 *
 * 🔴 La ayuda de DescripcionDeControl también se pide a la derecha (`data-ayuda-placement="right"`).
 * Es un popover INTERACTIVO (el `mouseenter` sobre él cancela el cierre) y por defecto se abre
 * abajo: en este menú quedaba encima de las opciones de abajo del ítem y podía comerse su clic,
 * la misma clase de defecto que el globo de arriba. Además se pide no interactiva
 * (`data-ayuda-no-interactiva`) porque en tablet/teléfono puede no haber lugar a ningún costado y
 * se superpone igual: con `pointer-events: none` no intercepta nada y se cierra al salir del ítem.
 * BootstrapVue pasa los dos atributos al `<a class="dropdown-item">`, que es el mismo elemento
 * que lleva el `data-testid` que `DescripcionDeControl` encuentra con `closest('[data-testid]')`.
 * Misión ayuda-eliminar-individual-y-masivo, 5/10/2026.
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
		 * `data-testid` del item. Va como prop y no como atributo suelto porque este componente se
		 * dibuja mas de una vez por pantalla y quien lo usa necesita poder distinguir cada
		 * instancia (ver OptionsDropdown.vue, que dibuja el mismo menu para "filtrados" y para
		 * "seleccion").
		 */
		testid: {
			type: String,
			default: null,
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
		 * general en vez del filtro de columnas.
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
