import axios from 'axios'
axios.defaults.withCredentials = true
axios.defaults.baseURL = process.env.VUE_APP_API_URL

/*
 * Estado del análisis de Excel con IA que corre en segundo plano.
 *
 * Antes este estado no existía porque no hacía falta: el análisis vivía adentro
 * del modal de importación, con el usuario esperando frente a la pantalla, y
 * cerrar el modal lo cancelaba. Desde que el usuario puede irse a trabajar a
 * otra parte mientras el análisis corre, la corrida le sobrevive al modal — y
 * necesita vivir en algún lado que le sobreviva también.
 *
 * Guarda dos cosas distintas que conviene no confundir:
 *
 *  - `corrida`: la corrida abierta del usuario (la que está procesando, o la que
 *    terminó y todavía no fue a ver). Es lo que alimenta el aviso.
 *  - `abrir_en`: una orden puntual — "abrí el modal de importación en el estado
 *    de esta corrida". La deja el modal de aviso al apretar "Ver resultado" y la
 *    consume el modal de importación; se limpia apenas se consume.
 */
export default {
	namespaced: true,
	state: {
		/*
		 * Corrida abierta del usuario, tal como la devuelve la API:
		 * { uuid, tipo, estado, progreso, paso, error, contexto }.
		 * Null cuando no hay ninguna.
		 */
		corrida: null,

		/*
		 * Orden de apertura para el modal de importación:
		 * { uuid, tipo, model, analysis_uuid }. Null cuando no hay nada pendiente
		 * de abrir. No es lo mismo que `corrida`: puede haber una corrida lista y
		 * el usuario no querer verla nunca.
		 */
		abrir_en: null,

		/*
		 * uuid de la corrida que el usuario está mirando en vivo, con el modal de
		 * importación abierto. Sirve para no dispararle un aviso de "terminó el
		 * análisis" sobre la misma pantalla que se lo acaba de mostrar. Null cuando
		 * no está mirando ninguna.
		 */
		siguiendo_uuid: null,
	},
	getters: {
		/*
		 * True si hay una corrida todavía trabajando. Lo usa el modal de
		 * importación para no dejar arrancar dos análisis a la vez del mismo
		 * usuario, que competirían por el mismo worker.
		 */
		hay_corrida_en_curso(state) {
			if (!state.corrida) {
				return false
			}
			return state.corrida.estado === 'pendiente' || state.corrida.estado === 'procesando'
		},
	},
	mutations: {
		set_corrida(state, value) {
			state.corrida = value || null
		},
		/*
		 * Limpia la corrida solo si es la que se pasa por parámetro. Evita que el
		 * "ya la vi" de una corrida vieja borre una corrida nueva que el usuario
		 * arrancó mientras tanto.
		 */
		limpiar_corrida_si_es(state, uuid) {
			if (state.corrida && state.corrida.uuid === uuid) {
				state.corrida = null
			}
		},
		set_abrir_en(state, value) {
			state.abrir_en = value || null
		},
		set_siguiendo_uuid(state, value) {
			state.siguiendo_uuid = value || null
		},
	},
	actions: {
		/*
		 * Recupera la corrida abierta del usuario. Se llama al iniciar la SPA: el
		 * aviso de "terminó" viaja por broadcast, y un broadcast solo le llega a
		 * quien está conectado en ese momento. Si el usuario encoló el análisis y
		 * cerró la pestaña, el evento pasó sin nadie que lo escuche; esto es lo que
		 * lo recupera.
		 */
		get_en_curso({ commit }) {
			return axios.get('/api/ai-excel-import/analysis-en-curso')
				.then(res => {
					commit('set_corrida', res.data.run)
					return res.data.run
				})
				.catch(err => {
					console.log(err)
					return null
				})
		},
		/*
		 * Marca la corrida como vista para que no se vuelva a ofrecer en la próxima
		 * carga. Se llama tanto al abrir el resultado como al descartar el aviso:
		 * en los dos casos el usuario ya se enteró.
		 */
		marcar_visto({ commit }, uuid) {
			if (!uuid) {
				return Promise.resolve()
			}

			commit('limpiar_corrida_si_es', uuid)

			return axios.post('/api/ai-excel-import/analysis/' + uuid + '/visto')
				.catch(err => {
					/*
					 * Que falle no rompe nada de lo que el usuario está haciendo: en el
					 * peor caso la próxima carga le vuelve a ofrecer un análisis que ya
					 * miró, y lo descarta de nuevo.
					 */
					console.log(err)
				})
		},
	},
}
