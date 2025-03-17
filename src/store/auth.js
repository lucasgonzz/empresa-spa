import axios from 'axios'
axios.defaults.withCredentials = true
axios.defaults.baseURL = process.env.VUE_APP_API_URL
// axios.defaults.baseURL = 'https://micovid.online'
// axios.defaults.baseURL = 'http://localhost:8000'
export default {
	namespaced: true,
	state: {
		authenticated: null,
		permissions: [],
		user: null,
		selected_address: null,
		schedule_edit: {},
		loading: false,
		message: '',
	},
	getters: {
		authenticated(state) {
			return state.authenticated
		},
		user(state) {
			return state.user
		},
	},
	mutations: {
		setAuthenticated(state, value) {
			state.authenticated = value
		},
		setUser(state, user) {
			if (user && user.owner_id) {
				user.addresses = user.owner_addresses
				window.localStorage.setItem('user_id', user.owner_id)
			} else if (user) {
				window.localStorage.setItem('user_id', user.id)
			}
			if (!user) {
				window.localStorage.clear()
			}
			state.user = user
		},
		setSelectedAddress(state, value) {
			state.selected_address = value
		},
		addAddress(state, value) {
			state.user.addresses.push(value)
		},
		deleteAddress(state, value) {
			let index = state.user.addresses.findIndex(address => {
				return address.id == value.id
			})
			state.user.addresses.splice(index, 1)
		},
		setUserWorkdaysId(state) {
			state.user.workdays_id = []
			state.user.workdays.forEach(workday => {
				state.user.workdays_id.push(workday.id)
			})
		},
		setLoading(state, value) {
			state.loading = value
		},
		setMessage(state, value) {
			state.message = value
		},
		setScheduleEdit(state, value) {
			state.schedule_edit = value
		},
		incrementFilterPage(state) {
			state.filter_page++
		},
		setFilterPage(state, value) {
			state.filter_page = value 
		},
		setTotalFilterPages(state, value) {
			state.total_filter_pages = value 
		},
		setTotalFilterResults(state, value) {
			state.total_filter_results = value 
		},
		addFiltered(state, value) {
			state.filtered = state.filtered.concat(value)
		},
		setLoadingFiltered(state, value) {
			state.loading_filtered = value 
		},
	},
	actions: {
		me({commit}) {
			commit('setLoading', true)
			axios.get('/sanctum/csrf-cookie')
			.then(() => {
				return axios.get('/api/user')
				.then(res => {
					commit('setLoading', false)
					
					console.log('auth/me::')
					console.log(res)
					console.log(typeof res.data.user)
					console.log(res.data.user)
					if (res && res.data.user) {
						console.log('authenticado')
						commit('setUser', res.data.user)
						commit('setAuthenticated', true)
					} else {
						console.log('NO autenticado')
					}
					// commit('setUserWorkdaysId')
				})
				.catch(err => {
					console.log('NO ESTA AUTH')
					commit('setLoading', false)
					commit('setAuthenticated', false)
					commit('setUser', null)
				})
			})
		},
		logout({ commit }) {
			commit('setLoading', true)
			return axios.post('/logout')
            .then(() => {
                commit('setLoading', false)
                commit('setAuthenticated', false)
                commit('setUser', null)
            })
            .catch(err => {
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
	modules: {
	}
}
