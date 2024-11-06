import axios from 'axios'
axios.defaults.withCredentials = true
axios.defaults.baseURL = process.env.VUE_APP_API_URL
export default {
	namespaced: true,
	state: {
		error: {},
		loading: false,

		props_to_show: [],
	},
	mutations: {
		set_props_to_show(state, value) {
			state.props_to_show = value
		},
		setLoading(state, value) {
			state.loading = value
		},
		setFilters(state, value) {
			state.filters = value
		},
		addFilter(state, filter_to_add) {
			let index = state.filters.findIndex(filter => {
				return filter.key == filter_to_add.key
			})

			if (index == -1) {
				state.filters.unshift(filter_to_add)
			} else {
				state.filters.splice(index, 1, filter_to_add)
			}
		},
		setFiltered(state, value) {
			state.filtered = value
		},
		setError(state, value) {
			state.error = value
		},
	},
	actions: {
		me({commit}) {
			commit('setMessage', 'Iniciando')
			commit('setLoading', true)
			axios.get('/sanctum/csrf-cookie')
			.then(() => {
				return axios.get('/api/user')
				.then(res => {
					commit('setMessage', '')
					commit('setLoading', false)
					commit('setAuthenticated', true)
					commit('setUser', res.data.user)
				})
				.catch(() => {
					commit('setMessage', '')
					commit('setLoading', false)
					commit('setAuthenticated', false)
					commit('setUser', null)
				})
			})
		},
		logout({ commit }) {
			commit('setMessage', 'Cerrando Sesion')
			commit('setLoading', true)
			return axios.post('/logout')
            .then(() => {
				commit('setMessage', '')
                commit('setLoading', false)
                commit('setAuthenticated', false)
                commit('setUser', null)
            })
            .catch(err => {
                commit('setLoading', false)
				commit('setMessage', '')
                console.log(err)
            })
		},
		deleteImage({ commit, state }) {
			return axios.delete(`/api/delete-current-image/user/${state.user.id}`)
			.then((res) => {
				commit('setUser', res.data.model)
			})
			.catch((err) => {
				console.log(err)
			})
		},
	},
}
