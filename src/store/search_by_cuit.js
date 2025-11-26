import axios from 'axios'
axios.defaults.withCredentials = true
axios.defaults.baseURL = process.env.VUE_APP_API_URL

export default {
	namespaced: true,

	actions: {
		searchByCUIT({ commit }, cuit) {
			commit('auth/setMessage', 'Consultando a AFIP', { root: true })
			commit('auth/setLoading', true, { root: true })
			return new Promise((resolve, reject) => {
				axios.get('/api/client/get-afip-information-by-cuit/'+cuit)
				.then(res => {
					commit('auth/setLoading', false, { root: true })
					resolve(res.data)
				})
				.catch(err => {
					commit('auth/setLoading', false, { root: true })
					console.log(err)
					reject(err)
				})
			})
		}
	},
}
