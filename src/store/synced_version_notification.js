import axios from 'axios'
axios.defaults.withCredentials = true
axios.defaults.baseURL = process.env.VUE_APP_API_URL

export default {
	namespaced: true,
	state: {
		pending: [],
		current_index: 0,
		loading: false,
	},
	mutations: {
		set_pending(state, value) {
			state.pending = Array.isArray(value) ? value : []
			state.current_index = 0
		},
		set_loading(state, value) {
			state.loading = value
		},
		set_current_index(state, value) {
			state.current_index = value
		},
		remove_at_current(state) {
			if (state.current_index < state.pending.length) {
				state.pending.splice(state.current_index, 1)
				if (state.current_index >= state.pending.length) {
					state.current_index = Math.max(0, state.pending.length - 1)
				}
			}
		},
	},
	actions: {
		get_pending({ commit }) {
			commit('set_loading', true)
			return axios.get('/api/synced-version-notification/pending')
				.then(res => {
					commit('set_loading', false)
					commit('set_pending', res.data.models)
					return res.data.models
				})
				.catch(err => {
					commit('set_loading', false)
					console.log(err)
					return []
				})
		},
		mark_read({ commit, state }) {
			const notification = state.pending[state.current_index]
			if (!notification) {
				return Promise.resolve()
			}
			commit('set_loading', true)
			return axios.post('/api/synced-version-notification/' + notification.id + '/mark-read')
				.then(() => {
					commit('set_loading', false)
					commit('remove_at_current')
				})
				.catch(err => {
					commit('set_loading', false)
					console.log(err)
				})
		},
	},
	getters: {
		current(state) {
			return state.pending[state.current_index] || null
		},
		has_pending(state) {
			return state.pending.length > 0
		},
	},
}
