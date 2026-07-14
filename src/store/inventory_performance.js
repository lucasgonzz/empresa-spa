import axios from 'axios'
import __base_store from '@/store/__base_store'

/**
 * Store de rendimiento de inventario (modelo `inventory_performance`) construido desde el factory común.
 *
 * Extiende el store base con el estado necesario para el flujo "stale-while-revalidate":
 * el reporte puede estar generándose en segundo plano (job en background) y el paginado
 * de artículos bajo el stock mínimo se pide por separado (no viene junto al reporte).
 */
export default __base_store({
	state: {
		model_name: 'inventory_performance',

		// Indica si hay un job calculando el reporte en este momento (backend: ProcessInventoryPerformanceJob).
		generating: false,
		// Página actual de artículos bajo el stock mínimo (paginada, no la lista completa).
		articles_stock_minimo: [],
		// Total de artículos bajo el mínimo, informado por el paginador del backend.
		total_stock_minimo: 0,
		// Página solicitada al endpoint paginado de artículos con stock mínimo.
		page: 1,
		// Cantidad de artículos por página del mismo endpoint.
		per_page: 25,
		// Texto de búsqueda para filtrar artículos con stock mínimo.
		search: '',
		// Flag de carga específico del listado paginado (independiente del `loading` genérico del store).
		loading_articles: false,
	},
	mutations: {
		/**
		 * Marca si hay un job generando el reporte de inventario en este momento.
		 * @param {Object} state
		 * @param {Boolean} value
		 */
		set_generating(state, value) {
			state.generating = value
		},
		/**
		 * Guarda la página actual de artículos bajo el stock mínimo.
		 * @param {Object} state
		 * @param {Array} value
		 */
		set_articles_stock_minimo(state, value) {
			state.articles_stock_minimo = value
		},
		/**
		 * Guarda el total de artículos bajo el stock mínimo (para la paginación).
		 * @param {Object} state
		 * @param {Number} value
		 */
		set_total_stock_minimo(state, value) {
			state.total_stock_minimo = value
		},
		/**
		 * Setea la página solicitada al endpoint paginado.
		 * @param {Object} state
		 * @param {Number} value
		 */
		set_page(state, value) {
			state.page = value
		},
		/**
		 * Setea la cantidad de resultados por página del endpoint paginado.
		 * @param {Object} state
		 * @param {Number} value
		 */
		set_per_page(state, value) {
			state.per_page = value
		},
		/**
		 * Setea el texto de búsqueda usado para filtrar artículos con stock mínimo.
		 * @param {Object} state
		 * @param {String} value
		 */
		set_search(state, value) {
			state.search = value
		},
		/**
		 * Marca si el listado paginado de artículos con stock mínimo está cargando.
		 * @param {Object} state
		 * @param {Boolean} value
		 */
		set_loading_articles(state, value) {
			state.loading_articles = value
		},
	},
	actions: {
		/**
		 * Pide el reporte de inventario (solo contadores, sin la lista de artículos) junto con
		 * el flag `generating`, que indica si el backend está calculando el reporte en background.
		 *
		 * IMPORTANTE: el backend puede devolver `models: [null]` cuando todavía no existe ningún
		 * reporte generado para el owner. Hay que filtrar los `null` antes de commitear para que
		 * `models.length` no quede en 1 con un elemento vacío (rompería cualquier acceso a
		 * `models[0].stock_minimo`).
		 *
		 * @param {Object} context commit
		 * @returns {Promise}
		 */
		get_models_con_estado({commit}) {
			return axios.get('/api/inventory-performance')
			.then(res => {
				// Filtro los `null` que puede traer `models` cuando aún no hay reporte generado.
				let models = (res.data.models || []).filter(model => model)
				commit('setModels', models)
				commit('set_generating', !!res.data.generating)
			})
			.catch(err => {
				console.log(err)
			})
		},

		/**
		 * Pide la página actual de artículos bajo el stock mínimo (endpoint paginado).
		 * Usa `page`, `per_page` y `search` del state del propio módulo.
		 *
		 * @param {Object} context commit, state
		 * @returns {Promise}
		 */
		get_articles_stock_minimo({commit, state}) {
			commit('set_loading_articles', true)
			return axios.get('/api/inventory-performance/articles-stock-minimo', {
				params: {
					page: state.page,
					per_page: state.per_page,
					search: state.search,
				},
			})
			.then(res => {
				// Si todavía no hay reporte generado, el backend devuelve `models: []`: dejo lista vacía y total 0.
				let models = res.data.models
				if (models && models.data) {
					commit('set_articles_stock_minimo', models.data)
					commit('set_total_stock_minimo', models.total)
				} else {
					commit('set_articles_stock_minimo', [])
					commit('set_total_stock_minimo', 0)
				}
			})
			.catch(err => {
				console.log(err)
			})
			.finally(() => {
				commit('set_loading_articles', false)
			})
		},
	},
})
