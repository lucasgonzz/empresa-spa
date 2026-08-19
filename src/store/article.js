import __base_store from '@/store/__base_store'
import axios from 'axios'
import generals from '@/common-vue/mixins/generals'

import stock_movement from '@/store/article/stock_movement'
import edit_addresses_stock from '@/store/article/edit_addresses_stock'
import edit_variants_stock from '@/store/article/edit_variants_stock'

/**
 * Store de artículos (modelo `article`) construido desde el factory común.
 *
 * Notas:
 * - Activa la feature opcional `local_storage` (solo para este módulo).
 * - Mantiene módulos internos y state/mutations/actions extra propios de artículos.
 */
export default __base_store({
	features: {
		/**
		 * Feature: cache en localStorage.
		 * Apagada por default en `__base_store`, se habilita solo aquí.
		 */
		local_storage: true,
	},
	modules: {
		stock_movement,
		edit_addresses_stock,
		edit_variants_stock,
	},
	state: {
		model_name: 'article',
		route_prefix: 'index/from-status',
		from_dates: false,
		not_download_on_mobile: true,

		use_per_page: true,
		/** Cantidad de modelos por página en listado (artículos es pesado). */
		per_page: 200,

		/** Cantidad de filas por página en búsqueda filtrada (POST search). */
		filter_per_page: 50,

		/** Descripción auxiliar para el cálculo/explicación de precio final. */
		final_price_description: [],

		/**
		 * Feature localStorage: flags de control.
		 * `use_local_storage` se activa manualmente desde UI/acción correspondiente.
		 */
		use_local_storage: false,
		local_storage_canceled: false,

		/**
		 * true cuando `filtered` viene de búsqueda en listado sin `filters` en el store
		 * (p. ej. buscador-articulos). Oculta actualizar/eliminar masivos por filtro en UI.
		 */
		filtered_without_filter_form: false,

		/**
		 * Sucursal elegida en el select de la barra del Listado. 0 = todas las sucursales, que es
		 * el estado por defecto: entrar al Listado no filtra por sucursal.
		 *
		 * Convive con `extra_filters_de_barra` (state del factory) y no lo reemplaza: el select
		 * necesita un escalar para su v-model, y el request necesita el array con la forma
		 * { key, operator, value }. Los dos los escribe la MISMA mutation, de una sola vez, para
		 * que no puedan quedar diciendo cosas distintas.
		 */
		address_id_filtro: 0,
	},
	mutations: {
		/**
		 * Elige la sucursal por la que se filtra el Listado, y deja armado el filtro extra que
		 * `runGlobalSearch` le manda al backend en cada request.
		 *
		 * El operador `address_stock_seteado` lo entiende ExtraFiltersHelper de la API: deja pasar
		 * los artículos que tienen seteada la relación con esa sucursal, con stock 0, negativo o
		 * positivo. Con 0 no se manda ningún filtro (todas las sucursales).
		 *
		 * La `key` va en 'address_id' aunque el backend no la use para nada en este operador: el
		 * helper descarta los filtros sin `key` antes de mirar el operador, así que omitirla haría
		 * que el filtro se ignorara en silencio.
		 *
		 * @param {Object} state Estado del módulo.
		 * @param {Number} value id de la sucursal, o 0 para todas.
		 */
		set_address_id_filtro(state, value) {
			state.address_id_filtro = value

			if (!value) {
				state.extra_filters_de_barra = []
				return
			}

			state.extra_filters_de_barra = [
				{
					key: 'address_id',
					operator: 'address_stock_seteado',
					value: value,
				}
			]
		},
		/**
		 * Guarda explicación/steps del precio final (usado en UI).
		 */
		set_final_price_description(state, value) {
			state.final_price_description = value
		},
		/**
		 * Marca filtrado sin criterios en store (búsqueda rápida vs modal de filtros).
		 */
		set_filtered_without_filter_form(state, value) {
			state.filtered_without_filter_form = value
		},
		/**
		 * Al setear filtros del modal, el filtrado pasa a tener criterios persistidos.
		 */
		setFilters(state, value) {
			state.filters = value
			state.filtered_without_filter_form = false
		},
		/**
		 * Al salir del modo filtrado, limpia el flag de búsqueda sin filter_form.
		 */
		setIsFiltered(state, value) {
			state.is_filtered = value
			if (!value) {
				state.filtered_without_filter_form = false
			}
		},
		/**
		 * Descuenta stock localmente en memoria para reflejar ventas/movimientos.
		 */
		removeStock(state, articles) {
			let state_model
			let index
			let stock_resultante
			articles.forEach(article => {
				if (article.is_article) {
					state_model = state.models.find(model => {
						return model.id == article.id
					})
					index = state.models.findIndex(item => {
						return item.id == article.id
					})
					if (typeof state_model != 'undefined' && state_model.stock) {
						stock_resultante = state_model.stock - article.amount
						if (stock_resultante > 0) {
							state_model.stock = stock_resultante
						} else {
							state_model.stock = 0
						}
						state.models.splice(index, 1, state_model)
					}
				}
			})
		},
	},
	actions: {
		/**
		 * En artículos, el loader de filtrado se usa en UI para paginar resultados.
		 */
		loadMoreFiltered({state, commit}) {
			commit('setLoadingFiltered', true)
			commit('incrementFilterPage')
			return axios.post(`/api/search/${generals.methods.routeString(state.model_name)}/null/1?page=${state.filter_page}`, {
				filters: state.filters,
				per_page: state.filter_per_page,
			})
				.then(res => {
					commit('setLoadingFiltered', false)
					commit('addFiltered', res.data.data)
				})
				.catch(err => {
					console.log(err)
					commit('setLoadingFiltered', false)
				})
		},
	},
})

