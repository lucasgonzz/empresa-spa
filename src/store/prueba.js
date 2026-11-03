import axios from 'axios'
axios.defaults.withCredentials = true

/**
 * Estado de la prueba gratuita de 7 días (misión prueba-experiencia-empresa, 3/11/2026).
 *
 * Lo que el negocio en prueba necesita saber viaja adentro del usuario (`user.prueba`, lo arma la API
 * en el login y en GET /api/user: activa, vence_at, vencida, video_url, whatsapp_soporte, modal_visto,
 * semilla_presente). Este módulo guarda lo poco que no cabe ahí:
 *
 *  - `vencida` + `whatsapp_soporte`: lo que trae el 403 `prueba_vencida` (interceptor de main.js y el
 *    login), para que la pantalla «Tu prueba terminó» tenga el número aunque ya no haya usuario.
 *  - `refrescar`: vuelve a pedir `user.prueba` después de una importación, para esconder el botón de
 *    importar cuando ya no quedan datos de ejemplo.
 *
 * Para un cliente real no hace nada: `user.prueba` es null y nadie despacha nada de acá.
 */
export default {
	namespaced: true,
	state: {
		vencida: false,
		whatsapp_soporte: null,
		/*
			El dueño llegó al Listado por el link de WhatsApp «ya leí tu Excel» (`?importacion=<uuid>`, lo
			manda Martín desde el admin, M4): el modal de Importar con IA se abre solo en ese análisis y el de
			primer ingreso no se muestra, porque ya decidió importar.
		*/
		importacion_por_link: false,
	},
	mutations: {
		set_vencida(state, whatsapp_soporte) {
			state.vencida = true
			if (whatsapp_soporte) {
				state.whatsapp_soporte = whatsapp_soporte
			}
		},
		set_importacion_por_link(state, valor) {
			state.importacion_por_link = !!valor
		},
		limpiar(state) {
			state.vencida = false
			state.whatsapp_soporte = null
		},
	},
	actions: {
		/**
		 * Vuelve a pedir el estado de la prueba y lo deja en `user.prueba`. Nunca rechaza: un fallo acá no
		 * puede romper la pantalla que lo pidió.
		 *
		 * @returns {Promise<void>}
		 */
		refrescar({ commit, rootState }) {
			if (!rootState.auth.user || !rootState.auth.user.prueba) {
				return Promise.resolve()
			}
			return axios.get('/api/prueba/estado', { skip_global_error_event: true })
			.then(res => {
				commit('auth/setPrueba', res.data.prueba, { root: true })
			})
			.catch(err => {
				console.log('prueba/refrescar', err)
			})
		},
	},
}
