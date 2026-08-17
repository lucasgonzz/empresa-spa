import axios from 'axios'
axios.defaults.withCredentials = true
axios.defaults.baseURL = process.env.VUE_APP_API_URL
export default {
	namespaced: true,
	state: {
		authenticated: null,
		user: null,

		delete_image: null,

		message: '',
		loading: false,
	},
	mutations: {
		setAuthenticated(state, value) {
			state.authenticated = value
		},
		setUser(state, value) {
			state.user = value
			window.localStorage.setItem('user_id', state.user.id)
			console.log(state.user)
		},
		setLoading(state, value) {
			state.loading = value
		},
		setMessage(state, value) {
			state.message = value
		},
		setDeleteImage(state, value) {
			state.delete_image = value
		},
	},
	actions: {
		/**
		 * 🔴 OJO AL LEER ESTE ARCHIVO: en `empresa-spa` este módulo NO es el que se registra.
		 *
		 * `src/store/index.js` importa `@/store/auth`, y es ese el que responde a
		 * `dispatch('auth/me')`. Esta copia de `common-vue` no la importa nadie (verificado el
		 * 17/8/2026 con `git grep "common-vue/store/auth"`: cero resultados). Dos verificadores
		 * independientes diagnosticaron sobre este archivo creyendo que era el vivo, así que
		 * queda escrito.
		 *
		 * Se agrega igual el `return` que le faltaba —es el mismo que `src/store/auth.js` ya
		 * tiene desde el 27/7/2026— para que quien encadene un `.then()` sobre el dispatch sepa
		 * cuándo terminaron de verdad las dos llamadas HTTP, y no antes.
		 */
		me({commit}) {
			commit('setMessage', 'Iniciando')
			commit('setLoading', true)
			return axios.get('/sanctum/csrf-cookie')
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
			// return axios.delete(`/api/delete-current-image/user/${state.user.id}`)
			return axios.delete(`/api/delete-image-prop/user/${state.user.id}/image_url`)
			.then((res) => {
				commit('setUser', res.data.model)
			})
			.catch((err) => {
				console.log(err)
			})
		},
	},
}
