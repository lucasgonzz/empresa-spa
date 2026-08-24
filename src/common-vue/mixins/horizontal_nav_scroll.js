/**
 * Detecta overflow horizontal en un contenedor `.horizontal-nav` y activa la clase
 * `has_horizontal_scroll` para reservar espacio al hacer hover/focus sin tapar los ítems.
 *
 * Requiere `ref="horizontal_nav"` en el elemento scrollable del template.
 * Opcional: prop/computed `items` en el host para recalcular al cambiar pestañas.
 */
export default {
	data() {
		return {
			/* true cuando el ancho de los ítems supera el contenedor y hace falta scroll horizontal */
			has_horizontal_scroll: false,
		}
	},
	watch: {
		/**
		 * Recalcula si hace falta scroll cuando cambia la cantidad o el texto de los ítems.
		 */
		items: {
			handler() {
				this.schedule_horizontal_scroll_check()
			},
			deep: true,
		},
	},
	mounted() {
		this.schedule_horizontal_scroll_check()
		window.addEventListener('resize', this.on_window_resize_for_horizontal_nav)
		this.init_horizontal_nav_resize_observer()
	},
	beforeDestroy() {
		window.removeEventListener('resize', this.on_window_resize_for_horizontal_nav)
		if (this.horizontal_scroll_check_timeout) {
			clearTimeout(this.horizontal_scroll_check_timeout)
		}
		this.destroy_horizontal_nav_resize_observer()
	},
	methods: {
		/**
		 * Devuelve el nodo DOM scrollable del horizontal nav.
		 * Los hosts pueden sobreescribirlo si usan otro nombre de ref.
		 *
		 * @returns {HTMLElement|null}
		 */
		get_horizontal_nav_scroll_element() {
			return this.$refs.horizontal_nav
		},
		/**
		 * Programa la verificación de overflow tras el próximo render del DOM.
		 */
		schedule_horizontal_scroll_check() {
			this.$nextTick(() => {
				this.update_horizontal_scroll_state()
			})
		},
		/**
		 * Revalida el overflow cuando cambia el tamaño de la ventana.
		 */
		on_window_resize_for_horizontal_nav() {
			if (this.horizontal_scroll_check_timeout) {
				clearTimeout(this.horizontal_scroll_check_timeout)
			}
			/* Evita recalcular en cada pixel del resize */
			this.horizontal_scroll_check_timeout = setTimeout(() => {
				this.update_horizontal_scroll_state()
			}, 100)
		},
		/**
		 * Detecta si los ítems desbordan el contenedor y activa espacio para la barra de scroll.
		 */
		update_horizontal_scroll_state() {
			let horizontal_nav = this.get_horizontal_nav_scroll_element()
			if (!horizontal_nav) {
				this.has_horizontal_scroll = false
				return
			}
			/* Tolerancia de 1px por redondeos de subpíxeles en distintos navegadores */
			this.has_horizontal_scroll = horizontal_nav.scrollWidth > (horizontal_nav.clientWidth + 1)
		},
		/**
		 * Observa cambios de tamaño del contenedor (badges, fuentes, layout flex, etc.).
		 */
		init_horizontal_nav_resize_observer() {
			if (typeof ResizeObserver === 'undefined') {
				return
			}
			let horizontal_nav = this.get_horizontal_nav_scroll_element()
			if (!horizontal_nav) {
				return
			}
			let self = this
			this.horizontal_nav_resize_observer = new ResizeObserver(function () {
				self.update_horizontal_scroll_state()
			})
			this.horizontal_nav_resize_observer.observe(horizontal_nav)
		},
		/**
		 * Libera el observer al destruir el componente.
		 */
		destroy_horizontal_nav_resize_observer() {
			if (this.horizontal_nav_resize_observer) {
				this.horizontal_nav_resize_observer.disconnect()
				this.horizontal_nav_resize_observer = null
			}
		},
	},
}
