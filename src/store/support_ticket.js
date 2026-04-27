import __base_store from '@/store/__base_store'
import axios from 'axios'
axios.defaults.withCredentials = true
axios.defaults.baseURL = process.env.VUE_APP_API_URL

export default __base_store({
	/**
	 * Estado principal del módulo de tickets de soporte.
	 */
	state: {
		model_name: 'support_ticket',
		use_per_page: false,
	},
	actions: {
		/**
		 * Cierra o reabre un ticket desde la UI de soporte.
		 */
		updateStatus({ dispatch }, payload) {
			// Construye payload de actualización con nombre opcional.
			let request_payload = {
				status: payload.status,
				name: payload.name,
			}
			// Persiste cambios de ticket vía endpoint dedicado.
			return axios.put('/api/support-ticket/' + payload.id, request_payload)
			.then(() => {
				// Refresca bandeja completa para mantener estados consistentes.
				return dispatch('getModels')
			})
			.catch(error => {
				console.log(error)
			})
		},
	},
})

