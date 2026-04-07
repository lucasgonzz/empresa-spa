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
		/** Flag usado por el buscador de artículos para selección. */
		add_buscador_to_selected: false,

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
	},
	mutations: {
		/**
		 * Guarda explicación/steps del precio final (usado en UI).
		 */
		set_final_price_description(state, value) {
			state.final_price_description = value
		},
		/**
		 * Controla si el buscador agrega artículos a seleccionados.
		 */
		set_add_buscador_to_selected(state, value) {
			state.add_buscador_to_selected = value
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

