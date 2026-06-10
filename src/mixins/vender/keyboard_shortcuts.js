import {
	VENDER_KEYBOARD_SHORTCUT_ACTIONS,
	VENDER_KEYBOARD_SHORTCUT_KEYS,
} from '@/constants/vender_keyboard_shortcuts'

/**
 * Mixin de atajos de teclado globales para el módulo Vender.
 * Lee la configuración desde el store vender (persistida por usuario en la API).
 * Se debe agregar a Vender.vue y registrar el listener en mounted / beforeDestroy.
 */
export default {
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
		 * Expandir Etapa 1 y posicionar el foco en el método de pago.
		 */
		_shortcut_foco_payment_method() {
			this.$root.$emit('vender:expand-stage1', 'payment_method')
		},

		/**
		 * Expandir Etapa 1 y posicionar el foco en el selector de cliente.
		 */
		_shortcut_foco_client() {
			this.$root.$emit('vender:expand-stage1', 'client')
		},

		/**
		 * Hacer foco en el buscador de artículo por nombre (BuscadorArticulos).
		 */
		_shortcut_foco_article_name() {
			const input = document.getElementById('search-article')

			if (input) {
				input.focus()
			}
		},

		/**
		 * Hacer foco en el input de código de barras.
		 */
		_shortcut_foco_barcode() {
			const input = document.getElementById('article-bar-code')

			if (input) {
				input.focus()
				input.select()
			}
		},
	},
}
