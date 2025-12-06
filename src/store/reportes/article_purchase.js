import axios from 'axios'
axios.defaults.withCredentials = true
axios.defaults.baseURL = process.env.VUE_APP_API_URL

export default {
	namespaced: true,
	state: {
		client_id: null,
		provider_id: null,
		category_id: null,
		address_id: null,

		cantidad_resultados: 10,
		orden: 'mayor-menor',
		sale_channel_id: 0,

		articles: [],
		categories: [],
		providers: [],

		loading: false,
	},
	mutations: {
		set_sale_channel_id(state, value) {
			state.sale_channel_id = value 
		},
		set_orden(state, value) {
			state.orden = value 
		},
		set_client_id(state, value) {
			state.client_id = value 
		},
		set_provider_id(state, value) {
			state.provider_id = value 
		},
		set_category_id(state, value) {
			state.category_id = value 
		},
		set_address_id(state, value) {
			state.address_id = value 
		},
		set_cantidad_resultados(state, value) {
			state.cantidad_resultados = value 
		},
		set_articles(state, value) {
			state.articles = value 
		},
		set_categories(state, value) {
			state.categories = value 
		},
		set_providers(state, value) {
			state.providers = value 
		},
		set_loading(state, value) {
			state.loading = value 
		},
	},
}