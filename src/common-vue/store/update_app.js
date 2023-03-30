export default {
	namespaced: true,
	state: {
		there_is_update: false,
		progress: 0,
	},
	mutations: {
		setThereIsUpdate(state, value) {
			state.there_is_update = value
		},
		setProgress(state, value) {
			state.progress = value
		},
		incrementProgress(state, value) {
			state.progress += value
		},
	},
}
