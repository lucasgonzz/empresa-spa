<template>
	<li
	role="presentation"
	class="excel-dropdown-submenu"
	@mouseenter="open_submenu"
	@mouseleave="schedule_close_submenu">
		<button
		ref="toggle"
		type="button"
		class="dropdown-item excel-dropdown-option excel-dropdown-submenu__toggle"
		tabindex="-1"
		@click.stop.prevent="toggle_submenu">
			<span class="excel-dropdown-option__inner">
				<span
				v-if="icon"
				class="excel-dropdown-option__icon-wrap">
					<i :class="icon"></i>
				</span>
				<span class="excel-dropdown-option__label">{{ label }}</span>
			</span>
		</button>
		<ul
		ref="submenu_menu"
		role="menu"
		class="dropdown-menu excel-dropdown-submenu__menu"
		:class="{ show: submenu_open }"
		:style="menu_style"
		@mouseenter="cancel_close_submenu"
		@mouseleave="schedule_close_submenu"
		@click="on_submenu_click">
			<slot></slot>
		</ul>
	</li>
</template>
<script>
/**
 * Ítem de menú con submenú lateral para el dropdown Crear (exportación / importación).
 * El submenú se renderiza en body con posición fija para no quedar recortado
 * por el overflow del menú principal.
 */
export default {
	props: {
		/**
		 * Texto visible del ítem padre que abre el submenú.
		 */
		label: {
			type: String,
			required: true,
		},
		/**
		 * Clase del ícono mostrado a la izquierda del label del ítem padre.
		 */
		icon: {
			type: String,
			default: '',
		},
	},
	data() {
		return {
			// Controla visibilidad del submenú (hover en desktop, click en pantallas táctiles).
			submenu_open: false,
			// Estilos inline de posicionamiento fijo del submenú en viewport.
			menu_style: {},
			// Timeout para cerrar al salir del ítem padre hacia el submenú.
			close_timeout: null,
			// True cuando el nodo del submenú ya fue movido a document.body.
			menu_appended: false,
		}
	},
	mounted() {
		window.addEventListener('scroll', this.reposition_submenu, true)
		window.addEventListener('resize', this.reposition_submenu)
	},
	beforeDestroy() {
		window.removeEventListener('scroll', this.reposition_submenu, true)
		window.removeEventListener('resize', this.reposition_submenu)
		document.removeEventListener('click', this.on_document_click, true)
		this.clear_close_timeout()
		this.remove_menu_from_body()
	},
	updated() {
		// Vue puede reinsertar el nodo en el li tras un re-render; lo devolvemos al body.
		if (this.menu_appended && this.$refs.submenu_menu && this.$refs.submenu_menu.parentNode !== document.body) {
			document.body.appendChild(this.$refs.submenu_menu)
			if (this.submenu_open) {
				this.update_menu_position()
			}
		}
	},
	methods: {
		/**
		 * Mueve el submenú al body para escapar del overflow del dropdown padre.
		 *
		 * @return {void}
		 */
		append_menu_to_body() {
			if (this.menu_appended || !this.$refs.submenu_menu) {
				return
			}
			document.body.appendChild(this.$refs.submenu_menu)
			this.menu_appended = true
		},
		/**
		 * Elimina el submenú del body al destruir el componente.
		 *
		 * @return {void}
		 */
		remove_menu_from_body() {
			if (!this.menu_appended || !this.$refs.submenu_menu) {
				return
			}
			if (this.$refs.submenu_menu.parentNode === document.body) {
				document.body.removeChild(this.$refs.submenu_menu)
			}
			this.menu_appended = false
		},
		/**
		 * Alterna la visibilidad del submenú al hacer click en el ítem padre.
		 *
		 * @return {void}
		 */
		toggle_submenu() {
			if (this.submenu_open) {
				this.close_submenu()
				return
			}
			this.open_submenu()
		},
		/**
		 * Abre el submenú y calcula su posición junto al ítem padre.
		 *
		 * @return {void}
		 */
		open_submenu() {
			this.clear_close_timeout()
			this.submenu_open = true
			this.$nextTick(() => {
				this.append_menu_to_body()
				this.update_menu_position()
				document.addEventListener('click', this.on_document_click, true)
			})
		},
		/**
		 * Cierra el submenú.
		 *
		 * @return {void}
		 */
		close_submenu() {
			this.submenu_open = false
			this.menu_style = {
				display: 'none',
			}
			document.removeEventListener('click', this.on_document_click, true)
		},
		/**
		 * Programa el cierre del submenú dejando tiempo para mover el puntero al submenú.
		 *
		 * @return {void}
		 */
		schedule_close_submenu() {
			this.clear_close_timeout()
			let that = this
			this.close_timeout = setTimeout(function () {
				that.close_submenu()
			}, 120)
		},
		/**
		 * Cancela el cierre programado al entrar al submenú.
		 *
		 * @return {void}
		 */
		cancel_close_submenu() {
			this.clear_close_timeout()
		},
		/**
		 * Limpia el timeout de cierre del submenú.
		 *
		 * @return {void}
		 */
		clear_close_timeout() {
			if (this.close_timeout) {
				clearTimeout(this.close_timeout)
				this.close_timeout = null
			}
		},
		/**
		 * Cierra el submenú al elegir una opción hija.
		 *
		 * @return {void}
		 */
		on_submenu_click() {
			this.close_submenu()
		},
		/**
		 * Cierra el submenú si el click ocurre fuera del ítem padre y del submenú.
		 *
		 * @param {Event} event
		 * @return {void}
		 */
		on_document_click(event) {
			let toggle = this.$refs.toggle
			let submenu_menu = this.$refs.submenu_menu
			if (!toggle || !submenu_menu) {
				return
			}
			if (toggle.contains(event.target) || submenu_menu.contains(event.target)) {
				return
			}
			this.close_submenu()
		},
		/**
		 * Recalcula posición del submenú en scroll o resize.
		 *
		 * @return {void}
		 */
		reposition_submenu() {
			if (!this.submenu_open) {
				return
			}
			this.update_menu_position()
		},
		/**
		 * Calcula coordenadas fixed del submenú a la derecha del ítem padre.
		 *
		 * @return {void}
		 */
		update_menu_position() {
			let toggle = this.$refs.toggle
			if (!toggle) {
				return
			}
			let rect = toggle.getBoundingClientRect()
			let viewport_padding = 8
			let menu_min_width = 240
			let left = rect.right
			let top = rect.top

			// Si no entra a la derecha, abrir hacia la izquierda del ítem padre.
			if (left + menu_min_width > window.innerWidth - viewport_padding) {
				left = rect.left - menu_min_width
			}
			if (left < viewport_padding) {
				left = viewport_padding
			}
			if (top + 120 > window.innerHeight - viewport_padding) {
				top = Math.max(viewport_padding, window.innerHeight - 120 - viewport_padding)
			}

			this.menu_style = {
				position: 'fixed',
				top: top + 'px',
				left: left + 'px',
				zIndex: 1070,
				minWidth: menu_min_width + 'px',
				width: 'max-content',
				maxWidth: 'calc(100vw - 24px)',
				display: 'block',
			}
		},
	},
}
</script>
<style lang="sass">
.excel-dropdown-submenu
	position: static
	width: 100%
	list-style: none

	&__toggle
		width: 100%
		padding: 8px 1.25rem !important
		border: none !important
		box-shadow: none !important
		outline: none
		background: transparent
		text-align: left
		appearance: none
		-webkit-appearance: none

		&:hover,
		&:focus,
		&:active
			background-color: #f8f9fa
			border: none !important
			box-shadow: none !important
			outline: none

			.excel-dropdown-option__icon-wrap
				background-color: rgba(0, 0, 0, 0.1)
				color: #343a40

		.excel-dropdown-option__inner
			width: 100%

.excel-dropdown-submenu__menu
	display: none
	margin: 0
	padding: 0.35rem 0
	background-color: #fff
	border: none
	border-radius: 0.25rem
	box-shadow: none
	min-width: 280px
	width: max-content
	max-width: calc(100vw - 24px)

	&.show
		display: block
</style>
