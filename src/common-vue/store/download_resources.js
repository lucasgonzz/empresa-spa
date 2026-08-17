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
		/**
		 * Abre el panel lateral de recursos.
		 *
		 * Existe aparte de setVisibility porque aquella es un TOGGLE: quien quiere ABRIR el panel
		 * --hoy la tarjeta de progreso de arriba a la derecha-- tendria que saber de antemano en
		 * que estado esta, y si ya estaba abierto se lo cerraria. Estas dos fijan el valor.
		 *
		 * @param {object} state
		 * @return {void}
		 */
		abrir_panel(state) {
			state.visibility = true
		},
		/**
		 * Cierra el panel lateral de recursos.
		 *
		 * @param {object} state
		 * @return {void}
		 */
		cerrar_panel(state) {
			state.visibility = false
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
