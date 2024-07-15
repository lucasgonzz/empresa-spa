export default {
	namespaced: true,
	state: {
		current_page: 0,
		per_page: 10,
		order_by: 'mayor-a-menor',
	},
	mutations: {
		setCurrentPage(state, value) {
			state.current_page = value
		},
		incrementCurrentPage(state, value) {
			state.current_page++
		},
		decrementCurrentPage(state, value) {
			state.current_page--
		},
		setOrderBy(state, value) {
			state.order_by = value
		},
		setPerPage(state, value) {
			state.per_page = value
		},
	},
}
