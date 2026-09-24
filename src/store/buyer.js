import Vue from 'vue'
import __base_store from '@/store/__base_store'

/**
 * Store de compradores (modelo `buyer`).
 * Construido desde el factory común.
 */
export default __base_store({
	state: {
		model_name: 'buyer',
		/** Mantiene el tamaño de página usado históricamente en este módulo. */
		per_page: 25,
	},
	mutations: {
		/**
		 * Refleja en el store el vínculo que se acaba de hacer entre este comprador y un cliente del
		 * sistema, sin recargar el listado de Tienda online → Clientes.
		 *
		 * Parchea SOLO los dos campos del vínculo en las tres copias del comprador que puede haber
		 * en memoria —`models`, `filtered` y `model` (el que tiene abierto el formulario)—. No se
		 * reemplaza el objeto entero con `buyer/add` y un `fullModel`: el listado de compradores
		 * trae campos agregados (`messages_count`, `last_message`…) que el modelo completo no
		 * tiene, y pisarlo lo dejaría con otra forma.
		 *
		 * 🔴 Va con `Vue.set` y no con una asignación directa: contra una API que todavía no carga
		 * la relación, la clave `comercio_city_client` no existe y una propiedad agregada por
		 * asignación no es reactiva en Vue 2.
		 *
		 * @param {Object} state Estado del módulo.
		 * @param {Object} payload
		 * @param {Number} payload.buyer_id Id del comprador que se vinculó.
		 * @param {Object|null} payload.client Cliente del sistema con el que quedó vinculado.
		 * @returns {void}
		 */
		actualizar_vinculo(state, payload) {
			/** Cliente vinculado, o null si se desvinculó. */
			let client = payload && payload.client ? payload.client : null
			/** Copias del comprador en memoria: el listado, el resultado filtrado y el modelo abierto. */
			let compradores = []

			if (Array.isArray(state.models)) {
				compradores = compradores.concat(state.models)
			}
			if (Array.isArray(state.filtered)) {
				compradores = compradores.concat(state.filtered)
			}
			if (state.model) {
				compradores.push(state.model)
			}

			compradores.forEach(buyer => {
				if (buyer && buyer.id == payload.buyer_id) {
					Vue.set(buyer, 'comercio_city_client_id', client ? client.id : null)
					Vue.set(buyer, 'comercio_city_client', client)
				}
			})
		},
	},
})

