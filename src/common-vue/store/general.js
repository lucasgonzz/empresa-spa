import axios from 'axios'
axios.defaults.withCredentials = true
axios.defaults.baseURL = process.env.VUE_APP_API_URL
export default {
	namespaced: true,
	state: {
		model_name_to_update: 'user',
		image_crop_width: 1000,
		image_crop_height: 1000,
	},
	mutations: {
		setModelNameToUpdate(state, value) {
			state.model_name_to_update = value 
		},
		setImageCropWidth(state, value) {
			state.image_crop_width = value 
		},
		setImageCropHeight(state, value) {
			state.image_crop_height = value 
		},
	},
	actions: {
	},
}
