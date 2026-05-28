/**
 * Valida si hay un artículo o combo seleccionado en cabecera que aún no se agregó al remito
 * (flujo con ask_amount_in_vender: cantidad pendiente antes de Enter).
 */
export default {
	methods: {

		/**
		 * Indica si existe un ítem en cabecera esperando cantidad y confirmación.
		 *
		 * @returns {boolean}
		 */
		tiene_articulo_pendiente_de_agregar() {
			if (!this.user || !this.user.ask_amount_in_vender) {
				return false
			}

			const item = this.$store.state.vender.item

			if (!item || !item.id) {
				return false
			}

			return !!(item.is_article || item.is_combo)
		},

		/**
		 * Bloquea guardar/actualizar si hay artículo a medio agregar e informa al usuario.
		 *
		 * @returns {boolean} true si puede continuar; false si debe completar la carga del ítem
		 */
		check_articulo_pendiente_de_agregar() {
			if (!this.tiene_articulo_pendiente_de_agregar()) {
				return true
			}

			this.$toast.error(
				'Termine de agregar el articulo seleccionado: indique la cantidad y presione Enter antes de guardar la venta'
			)

			const input_amount = document.getElementById('article-amount')

			if (input_amount) {
				setTimeout(() => {
					input_amount.focus()
				}, 100)
			}

			return false
		},
	},
}
