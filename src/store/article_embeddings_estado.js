import axios from 'axios'

/**
 * Estado de los embeddings del catalogo (whatsapp-dashboard, mision
 * embeddings-estado-whatsapp-dashboard, 15/9/2026): cuantos articulos nunca tuvieron un embedding
 * generado, cuantos lo tienen desactualizado y cuantos le faltan a la tanda de generacion en
 * curso, si hay una viva.
 *
 * No usa el factory __base_store: no hay ningun "modelo" que listar ni crear, son tres numeros
 * de un endpoint de solo lectura (GET api/article-embeddings/estado). Un store a medida, chico,
 * es mas claro que forzar el molde de un listado sobre algo que no lo es.
 */
export default {
	namespaced: true,
	state: {
		sin_generar: 0,
		pendiente: 0,
		generandose: 0,
		// true recien despues del primer pedido exitoso: evita mostrar "0" como si fuera un dato
		// real mientras todavia no se pidio nada (el tablero lo usa para no parpadear tarjetas
		// en 0 antes de tener la respuesta).
		cargado: false,
	},
	mutations: {
		/**
		 * @param {Object} state
		 * @param {{sin_generar: Number, pendiente: Number, generandose: Number}} estado
		 */
		set_estado(state, estado) {
			state.sin_generar = estado.sin_generar
			state.pendiente = estado.pendiente
			state.generandose = estado.generandose
			state.cargado = true
		},
	},
	actions: {
		/**
		 * Pide los tres contadores. Contra una API anterior a esta mision el endpoint no existe
		 * (404): cae al catch, se loguea y el tablero simplemente no muestra las tarjetas nuevas
		 * (cargado se queda en false).
		 *
		 * @param {Object} context commit
		 * @returns {Promise}
		 */
		get_estado({commit}) {
			return axios.get('/api/article-embeddings/estado')
			.then(res => {
				commit('set_estado', res.data)
			})
			.catch(err => {
				console.log(err)
			})
		},
	},
}
