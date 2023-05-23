import axios from 'axios'
axios.defaults.withCredentials = true
axios.defaults.baseURL = process.env.VUE_APP_API_URL
export default {
	namespaced: true,
	state: {
		error: {},
		loading: false,
	},
	mutations: {
		setLoading(state, value) {
			state.loading = value
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
