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
 *
 * El submenú se posiciona con `position: fixed` y coordenadas de viewport, y —esto es lo
 * importante— **vive donde Vue lo puso**. Antes se movía a `document.body` con appendChild, más un
 * hook `updated()` que lo devolvía ahí cada vez que Vue lo reinsertaba. Eso rompía el menú entero al
 * pasar el mouse por Importación: Vue 2 parchea comparando el DOM real contra su árbol virtual, y un
 * nodo movido por afuera deja al algoritmo trabajando con referencias a hermanos que ya no están
 * donde cree, así que se perdían opciones del menú padre.
 *
 * El motivo original de mudarlo era escapar del `overflow-y: auto` del menú padre, y era un motivo
 * real: Popper 1.16 posiciona el `.dropdown-menu` con `transform: translate3d(...)` por defecto, y
 * un ancestro transformado se vuelve el bloque contenedor de sus descendientes `fixed` —o sea que el
 * fixed no servía de nada—. Se resuelve en el origen: `ExcelDropDown.vue` le pasa a Popper
 * `gpuAcceleration: false`, con lo cual posiciona con top/left, no hay transform, y este submenú
 * fixed vuelve a anclarse al viewport sin necesidad de escaparse del árbol.
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
	},
	methods: {
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
			// El nextTick queda porque la posicion se calcula a partir del rect del toggle y del
			// tamano ya renderizado del submenu: hay que esperar a que Vue lo pinte. No es un parche
			// de timing contra otro proceso -- eso era lo que hacia falta cuando el nodo se movia a
			// body y competia con el patching.
			this.$nextTick(() => {
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
				// 1001 y no 1070: alcanza para quedar arriba del menu padre (.dropdown-menu de
				// Bootstrap es 1000) y se queda en la franja que le corresponde, en vez de meterse
				// en la de los tooltips.
				//
				// Precision, porque el comentario anterior afirmaba de mas: ahora que el submenu
				// vive DENTRO del menu -- que es fixed con z-index 1000 y por lo tanto crea su
				// propio contexto de apilamiento -- su z-index se resuelve adentro de ese contexto
				// y no podria pintar sobre un modal ni con 1070. Ese riesgo era real mientras el
				// nodo estaba teleportado a body; hoy es solo higiene.
				zIndex: 1001,
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

	// El padding, el borde y el hover de la celda del icono son los del item comun y viven en
	// src/sass/_menus_desplegables.sass: este toggle lleva `dropdown-item excel-dropdown-option`
	// igual que los demas. Aca queda solo lo que es propio de ser un <button> y no un <a>.
	&__toggle
		width: 100%
		outline: none
		background: transparent
		text-align: left
		appearance: none
		-webkit-appearance: none

		&:hover,
		&:focus,
		&:active
			background-color: var(--bg-hover)
			outline: none

		.excel-dropdown-option__inner
			width: 100%

.excel-dropdown-submenu__menu
	display: none
	margin: 0
	padding: 0.35rem 0
	// Tokens en vez de #fff pelado: el submenu flota sobre lo que haya debajo, asi que en tema
	// oscuro un fondo blanco fijo lo dejaba como un recorte de papel sobre la pantalla.
	background-color: var(--bg-card)
	// Tenia border: none y box-shadow: none, o sea que flotaba sin ningun limite visual sobre el
	// contenido de atras y no se entendia donde terminaba.
	border: 1px solid var(--color-border)
	border-radius: 0.25rem
	box-shadow: 0 6px 16px rgba(15, 23, 42, 0.12)
	min-width: 280px
	width: max-content
	max-width: calc(100vw - 24px)

	&.show
		display: block

// La sombra clara es azul-oscura al 12%: sobre el #1e2127 del tema oscuro no se ve nada, y el
// submenu vuelve a quedar sin limite contra lo que tenga atras. En oscuro se apoya en negro con
// mas opacidad, que es lo que separa dos superficies oscuras.
html.dark-mode .excel-dropdown-submenu__menu
	box-shadow: 0 6px 16px rgba(0, 0, 0, 0.45)
</style>
