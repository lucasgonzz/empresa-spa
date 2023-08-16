export default {
	namespaced: true,
	state: {
		model_to_add: null,
		prop: null,
		model: null,
		model_name: null,
	},
	mutations: {
		setModelToAdd(state, value) {
			state.model_to_add = value 
		},
		setProp(state, value) {
			state.prop = value 
		},
		setModel(state, value) {
			state.model = value 
		},
		setModelName(state, value) {
			state.model_name = value 
		},
	},
}
