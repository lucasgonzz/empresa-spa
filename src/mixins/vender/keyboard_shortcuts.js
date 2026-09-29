import {
	VENDER_KEYBOARD_SHORTCUT_ACTIONS,
	VENDER_KEYBOARD_SHORTCUT_KEYS,
} from '@/constants/vender_keyboard_shortcuts'
/*
	Los atajos que llevan el foco a un campo (metodo de pago, cliente, buscador, codigo de barras)
	lo piden con enfocar_elemento_de_vender(): con los diseños de Vender (mision
	diseno-vender-configurable, 28/9/2026) cada campo puede estar en cualquier etapa, y la que lo
	tiene se abre antes de enfocarlo.
*/
import diseno_de_vender from '@/mixins/vender/diseno_de_vender'

/**
 * Mixin de atajos de teclado globales para el módulo Vender.
 * Lee la configuración desde el store vender (persistida por usuario en la API).
 * Se debe agregar a Vender.vue y registrar el listener en mounted / beforeDestroy.
 */
export default {
	mixins: [diseno_de_vender],
	methods: {
		/**
		 * Mapa action => tecla activo en el store.
		 *
		 * @returns {Object<string, string>}
		 */
		_get_vender_keyboard_shortcuts() {
			return this.$store.state.vender.keyboard_shortcuts || {}
		},

		/**
		 * Lista de teclas F1-F10 actualmente asignadas a alguna acción.
		 *
		 * @returns {Array<string>}
		 */
		_get_vender_handled_keys() {
			const shortcuts = this._get_vender_keyboard_shortcuts()
			const handled_keys = []

			VENDER_KEYBOARD_SHORTCUT_ACTIONS.forEach(function (item) {
				const key = shortcuts[item.action]

				if (key && handled_keys.indexOf(key) === -1) {
					handled_keys.push(key)
				}
			})

			return handled_keys
		},

		/**
		 * Normaliza la tecla del evento (F1-F10) para comparar con la config del store.
		 *
		 * @param {KeyboardEvent} event
		 * @returns {string}
		 */
		_get_vender_key_from_event(event) {
			if (event.key && VENDER_KEYBOARD_SHORTCUT_KEYS.indexOf(event.key) !== -1) {
				return event.key
			}

			if (event.code && VENDER_KEYBOARD_SHORTCUT_KEYS.indexOf(event.code) !== -1) {
				return event.code
			}

			return event.key
		},

		/**
		 * Indica si la tecla presionada está asignada a algún atajo de Vender.
		 *
		 * @param {KeyboardEvent} event
		 * @returns {boolean}
		 */
		_is_vender_handled_keyboard_event(event) {
			const event_key = this._get_vender_key_from_event(event)
			const handled_keys = this._get_vender_handled_keys()

			return handled_keys.indexOf(event_key) !== -1
		},

		/**
		 * Bloquea el comportamiento nativo del navegador para teclas F asignadas.
		 * Algunas (p. ej. F5) requieren preventDefault también en keyup.
		 *
		 * @param {KeyboardEvent} event
		 */
		_prevent_vender_keyboard_default(event) {
			event.preventDefault()
			event.stopPropagation()
		},

		/**
		 * Receptor del keyup: refuerza el bloqueo de F5 refresh y similares.
		 *
		 * @param {KeyboardEvent} event
		 */
		handleVenderKeyboardKeyup(event) {
			if (!this._is_vender_handled_keyboard_event(event)) {
				return
			}

			this._prevent_vender_keyboard_default(event)
		},

		/**
		 * Receptor principal del evento keydown global.
		 * Previene el comportamiento del navegador para las teclas configuradas.
		 *
		 * @param {KeyboardEvent} event
		 */
		handleVenderKeyboard(event) {
			if (!this._is_vender_handled_keyboard_event(event)) {
				return
			}

			const shortcuts = this._get_vender_keyboard_shortcuts()
			const event_key = this._get_vender_key_from_event(event)

			/* Evitar refresh (F5), búsqueda (F3), ayuda (F1), etc. */
			this._prevent_vender_keyboard_default(event)

			if (event_key === shortcuts.save) {
				this._shortcut_guardar_venta()
			} else if (event_key === shortcuts.payment_method) {
				this._shortcut_foco_payment_method()
			} else if (event_key === shortcuts.print) {
				/* Imprimir lo ejecuta Print.vue escuchando vender:print-shortcut */
				this.$root.$emit('vender:print-shortcut')
			} else if (event_key === shortcuts.client) {
				this._shortcut_foco_client()
			} else if (event_key === shortcuts.search_article) {
				this._shortcut_foco_article_name()
			} else if (event_key === shortcuts.barcode) {
				this._shortcut_foco_barcode()
			}
		},

		/**
		 * Guardar venta: click programático sobre el botón dusk="btn_vender".
		 */
		_shortcut_guardar_venta() {
			const btn = document.querySelector('[dusk="btn_vender"]')

			if (btn && !btn.disabled) {
				btn.click()
			}
		},

		/**
		 * Llevar el foco al método de pago, abriendo la etapa donde esté (con el diseño
		 * predeterminado, la 1). El select lo despliega PaymentMethod.vue.
		 */
		_shortcut_foco_payment_method() {
			this.enfocar_elemento_de_vender('metodo_de_pago')
		},

		/**
		 * Llevar el foco al selector de cliente, abriendo la etapa donde esté.
		 */
		_shortcut_foco_client() {
			this.enfocar_elemento_de_vender('cliente')
		},

		/**
		 * Hacer foco en el buscador de artículo por nombre (BuscadorArticulos).
		 *
		 * Por el mismo camino que los otros atajos y no con un getElementById directo como antes:
		 * con los diseños de Vender el buscador puede estar en la etapa 1 o en la 3, que se pliegan,
		 * y un input plegado (display: none) no toma el foco. La etapa que lo tiene se abre primero.
		 * El selector apunta al input de siempre (#search-article) y no al primer input del campo.
		 */
		_shortcut_foco_article_name() {
			this.enfocar_elemento_de_vender('buscador_de_articulos', {
				selector: '#search-article',
			})
		},

		/**
		 * Hacer foco en el input de código de barras y seleccionar lo que tenga, para escanear
		 * encima. Mismo motivo que el buscador para ir por enfocar_elemento_de_vender().
		 */
		_shortcut_foco_barcode() {
			this.enfocar_elemento_de_vender('codigo_de_barras', {
				selector: '#article-bar-code',
				seleccionar: true,
			})
		},
	},
}
