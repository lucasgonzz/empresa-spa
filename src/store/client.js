import axios from 'axios'
import __base_store from '@/store/__base_store'

/**
 * Store de clientes construido desde el factory común.
 */
const client_store = __base_store({
	state: {
		model_name: 'client',
		from_dates: false,
		not_download_on_mobile: true,
		use_per_page: true,
		per_page: 100,
	},
	getters: {
		cuerpo_extra_de_busqueda() {
			return { clientes_acopio_pendiente: true }
		},
	},
	actions: {
		/**
		 * Trae UN cliente por id, con todas sus relaciones (`Client::scopeWithAll()`:
		 * `credit_accounts.moneda`, `iva_condition`, `price_type`, `location`, etc.) — el
		 * mismo `GET /api/client/{id}` que usa el ABM. No toca `state.models` ni `state.model`
		 * a propósito: es para un caller puntual (hoy, el header del sidebar de WhatsApp, para
		 * los botones de cuenta corriente y el modal del cliente vinculado) que necesita el
		 * modelo completo sin pisar la lista ni el modelo que el ABM tenga seleccionado.
		 *
		 * @param {number} id
		 * @returns {Promise<Object>}
		 */
		getModel(context, id) {
			return axios.get('/api/client/' + id)
				.then(res => {
					return res.data.model
				})
		},
	},
})

const agregar_cliente = client_store.mutations.add
client_store.mutations.add = function (state, cliente) {
	// Editar la ficha o el límite de crédito reemplaza la fila, pero no modifica el acopio.
	// Si esa respuesta no trae el dato, mantenemos el de la página hasta que se vuelva a pedir.
	if (typeof cliente.tiene_acopio_pendiente === 'undefined') {
		const filas_visibles = state.is_filtered ? state.filtered : state.models
		const fila = filas_visibles.find(model => model.id == cliente.id)
		if (fila && typeof fila.tiene_acopio_pendiente === 'boolean') {
			cliente = { ...cliente, tiene_acopio_pendiente: fila.tiene_acopio_pendiente }
		}
	}

	agregar_cliente(state, cliente)
}

export default client_store

