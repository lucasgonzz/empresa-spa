import __base_store from '@/store/__base_store'
import payment_methods from './expense/payment_methods'

/**
 * Store de gastos migrado a `__base_store`.
 *
 * Se mantiene una mutation custom de `setModel` porque `expense`
 * necesita normalizar `payment_methods` desde la relación pivot.
 */
export default __base_store({
	/** Estado específico de `expense` que extiende al estado base. */
	state: {
		model_name: 'expense',
		from_dates: true,
		discount_percentage: null,
		discount_amount: null,
		selected_payment_methods: [],
	},
	mutations: {
		/**
		 * Sincroniza métodos de pago seleccionados para la UI de edición.
		 *
		 * @param {Object} state Estado del módulo.
		 * @param {Array} value Métodos de pago seleccionados.
		 * @returns {void}
		 */
		set_selected_payment_methods(state, value) {
			state.selected_payment_methods = value
		},
		/**
		 * Guarda el porcentaje de descuento aplicado al medio de pago.
		 *
		 * @param {Object} state Estado del módulo.
		 * @param {Number|null} value Porcentaje de descuento.
		 * @returns {void}
		 */
		set_payment_method_discount_percentage(state, value) {
			state.discount_percentage = value
		},
		/**
		 * Guarda el monto de descuento aplicado al medio de pago.
		 *
		 * @param {Object} state Estado del módulo.
		 * @param {Number|null} value Monto del descuento.
		 * @returns {void}
		 */
		set_payment_method_discount_amount(state, value) {
			state.discount_amount = value
		},
		/**
		 * Actualiza los métodos de pago dentro del modelo en edición.
		 *
		 * @param {Object} state Estado del módulo.
		 * @param {Array} value Métodos de pago normalizados.
		 * @returns {void}
		 */
		set_payment_methods(state, value) {
			state.model.payment_methods = value
			state.selected_payment_methods = value
			// Fuerza reactividad al reemplazar la referencia del objeto.
			state.model = { ...state.model }
		},
		/**
		 * Inicializa o actualiza el modelo de gasto para edición/alta.
		 *
		 * @param {Object} state Estado del módulo.
		 * @param {Object} value Payload con `model` opcional y `properties`.
		 * @returns {void}
		 */
		setModel(state, value) {
			/** Modelo recibido desde backend o editado por flujo interno. */
			let model = null
			/** Lista normalizada para `payment_methods` del formulario. */
			let selected_payment_methods = []
			/** Objeto nuevo para altas cuando no viene `value.model`. */
			let new_model = null

			if (value.model) {
				model = value.model
				if (value.properties.length) {
					value.properties.forEach(prop => {
						model[prop.key] = prop.value
					})
				}

				if (model.payment_methods) {
					/**
					 * Se transforma la relación many-to-many en un arreglo plano
					 * con `amount` y `caja_id` para simplificar el binding en UI.
					 */
					model.payment_methods.forEach(pm => {
						if (pm.pivot) {
							selected_payment_methods.push({
								id: pm.id,
								name: pm.name,
								amount: pm.pivot.amount,
								caja_id: pm.pivot.caja_id,
							})
						}
					})
				}

				model.payment_methods = selected_payment_methods
				state.model = model
				state.selected_payment_methods = selected_payment_methods
				return
			}

			new_model = {
				id: null,
				payment_methods: [],
			}

			require(`@/models/${state.model_name}`).default.properties.forEach(prop => {
				if (prop.value !== undefined) {
					new_model[prop.key] = prop.value
				}
			})

			if (value.properties.length) {
				value.properties.forEach(prop => {
					new_model[prop.key] = prop.value
				})
			}

			state.model = new_model
			state.selected_payment_methods = []
		},
	},
	modules: {
		payment_methods,
	},
})
