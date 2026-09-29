import __base_store from '@/store/__base_store'
import axios from 'axios'

/** Identificador (caja:pagina) del último pedido de aperturas: descarta respuestas viejas. */
let ultimo_pedido = ''

/**
 * Store de apertura de caja (modelo `apertura_caja`).
 * Construido desde el factory común.
 *
 * El modal "Aperturas" de Tesorería no usa `getModels` (que descarga todo) sino
 * `cargar_pagina`: pide UNA página de la caja elegida (`route_prefix`) al endpoint
 * `GET apertura-caja/{caja_id}?page=&per_page=` y deja en `models` solo esa página.
 */
export default __base_store({
	/** Estado propio del modelo. */
	state: {
		model_name: 'apertura_caja',
		/** Página que muestra el modal de aperturas. */
		pagina_aperturas: 1,
		/** Filas por página del modal de aperturas. */
		por_pagina_aperturas: 15,
		/** Total de aperturas de la caja (todas las páginas), para la barra y el contador. */
		total_aperturas: 0,
		/** Última página disponible. */
		ultima_pagina_aperturas: 1,
	},
	mutations: {
		/**
		 * Guarda el paginador del modal de aperturas.
		 *
		 * @param {Object} state
		 * @param {Object} value {pagina, total, ultima_pagina}; cada clave es opcional.
		 */
		set_paginacion_aperturas(state, value) {
			if (typeof value.pagina != 'undefined') {
				state.pagina_aperturas = value.pagina
			}
			if (typeof value.total != 'undefined') {
				state.total_aperturas = value.total
			}
			if (typeof value.ultima_pagina != 'undefined') {
				state.ultima_pagina_aperturas = value.ultima_pagina
			}
		},
	},
	actions: {
		/**
		 * Carga una página de aperturas de la caja indicada por `route_prefix`.
		 *
		 * Compatible con una API anterior a la paginación: si la respuesta no trae `total`,
		 * se toma `models.length` como total y una sola página (la barra no se muestra).
		 *
		 * @param {Object} context
		 * @param {Number} pagina Página a pedir (por defecto la del store).
		 * @return {Promise}
		 */
		cargar_pagina({commit, state}, pagina) {
			let page = pagina || state.pagina_aperturas || 1
			let caja_id = state.route_prefix
			// Si el usuario cambia de caja o de página mientras vuela la respuesta, se descarta.
			let pedido = caja_id + ':' + page
			ultimo_pedido = pedido
			commit('setLoading', true)
			return axios.get('/api/apertura-caja/' + caja_id + '?page=' + page + '&per_page=' + state.por_pagina_aperturas)
			.then(res => {
				if (ultimo_pedido != pedido) {
					return
				}
				let models = res.data.models
				let total = typeof res.data.total != 'undefined' ? res.data.total : models.length
				let ultima = typeof res.data.last_page != 'undefined' ? res.data.last_page : 1
				commit('setModels', models)
				commit('set_paginacion_aperturas', {pagina: page, total: total, ultima_pagina: ultima})
				commit('setLoading', false)
			})
			.catch(err => {
				commit('setLoading', false)
				console.log(err)
			})
		},
	},
})
