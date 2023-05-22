import axios from 'axios'
axios.defaults.withCredentials = true
axios.defaults.baseURL = process.env.VUE_APP_API_URL
import call_methods from '@/mixins/call_methods'
export default {
	namespaced: true,
	state: {
		models_to_download: [],
		visibility: false,
		start_download: false,
	},
	mutations: {
		setVisibility(state) {
			state.visibility = !state.visibility
		},
		setStartDownload(state) {
			state.start_download = !state.start_download
			console.log('setStartDownload QUEDO EN '+state.start_download)
		},
		// setModels() {
		// 	call_methods.forEach(model => {
		// 		state.models_to_download.push({
		// 			downloaded: false,
		// 			downloading: false,
		// 			model_name: model,
		// 		})
		// 	})
		// },
	},
	// actions: {
	// 	async downloadModels(is_mobile) {
    //         for (var i = 0; i < state.models_to_download.length; i++) {
    //         	if (!is_mobile || (typeof require('@/store/'+state.models_to_download[i]).not_download_on_mobile == 'undefined' || !require('@/store/'+state.models_to_download[i]).not_download_on_mobile)) {
	// 				state.models_to_download[i].downloading = true
	//                 await this.$store.dispatch(this.models_to_download[i].model_name+'/getModels')
	// 				state.models_to_download[i].downloading = false
	// 				state.models_to_download[i].downloaded = true
    //         	}
    //         }
	// 	}
	// },
}
