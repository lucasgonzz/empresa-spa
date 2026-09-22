import axios from 'axios'
import { env } from '@/runtime_config'
axios.defaults.withCredentials = true
axios.defaults.baseURL = env('VUE_APP_API_URL')
import call_methods from '@/mixins/call_methods'
export default {
	namespaced: true,
	state: {
		models_to_download: [],
		visibility: false,
		start_download: false,
		/**
		 * true mientras la tarjeta de progreso de la descarga (download-resources/Progress.vue) esta
		 * en pantalla. Lo commitea esa tarjeta cada vez que cambia su `visible`, y lo lee la pildora
		 * de procesos en segundo plano (components/common/procesos-en-segundo-plano/Tarjeta.vue),
		 * que comparte la misma esquina de arriba a la derecha y se corre para abajo mientras esta
		 * este visible (mision procesos-en-segundo-plano, 18/9/2026).
		 */
		tarjeta_visible: false,
	},
	mutations: {
		setVisibility(state) {
			state.visibility = !state.visibility
		},
		/**
		 * Publica si la tarjeta de progreso de la descarga esta en pantalla.
		 *
		 * @param {object} state
		 * @param {boolean} valor
		 * @return {void}
		 */
		set_tarjeta_visible(state, valor) {
			state.tarjeta_visible = !!valor
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
