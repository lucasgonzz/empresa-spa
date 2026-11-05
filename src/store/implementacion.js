import axios from 'axios'

export function puede_ver_implementacion(auth) {
	const user = auth.user
	return !!(auth.authenticated && user && user.prueba && user.prueba.activa
		&& !user.owner_id && !user.es_acceso_maestro)
}

export default {
	namespaced: true,
	state: {
		hitos: [],
		usuario_id: null,
		cargando: false,
		disponible: null,
		error: false,
		apertura: null,
	},
	getters: {
		aviso_pendiente(state) {
			return state.hitos.find(hito => hito.avisar !== false && !hito.visto
				&& ['completado', 'parcial', 'error'].includes(hito.estado))
		},
	},
	mutations: {
		iniciar(state, usuario_id) {
			state.usuario_id = usuario_id
			state.cargando = true
		},
		recibir(state, { hitos, disponible }) {
			const anteriores = new Map(state.hitos.map(hito => [hito.id, hito]))
			state.hitos = hitos.map(hito => {
				const anterior = anteriores.get(hito.id)
				if (anterior && anterior.visto) {
					hito.visto = true
				}
				if (anterior && anterior.aprobado) {
					hito.aprobado = true
				}
				return hito
			})
			state.disponible = disponible
			state.cargando = false
			state.error = false
		},
		fallar(state, status) {
			state.disponible = status === 404 || status === 403 ? false : state.disponible
			state.cargando = false
			state.error = state.disponible !== false
		},
		abrir(state, apertura) {
			state.apertura = apertura
		},
		marcar_visto(state, id) {
			const hito = state.hitos.find(item => item.id === id)
			if (hito) {
				hito.visto = true
			}
		},
		marcar_aprobado(state, id) {
			const hito = state.hitos.find(item => item.id === id)
			if (hito) {
				hito.aprobado = true
			}
			if (state.apertura && state.apertura.hito.id === id) {
				state.apertura.hito.aprobado = true
			}
		},
		limpiar(state) {
			state.hitos = []
			state.usuario_id = null
			state.cargando = false
			state.disponible = null
			state.error = false
			state.apertura = null
		},
	},
	actions: {
		refrescar({ commit, state, rootState }) {
			if (!puede_ver_implementacion(rootState.auth) || state.cargando || state.disponible === false) {
				return Promise.resolve()
			}
			const usuario_id = rootState.auth.user.id
			commit('iniciar', usuario_id)
			return axios.get('/api/implementacion', { skip_global_error_event: true })
			.then(({ data }) => {
				if (state.usuario_id === usuario_id && puede_ver_implementacion(rootState.auth)) {
					commit('recibir', { hitos: Array.isArray(data.hitos) ? data.hitos : [], disponible: data.disponible !== false })
				}
			})
			.catch(error => {
				if (state.usuario_id === usuario_id) {
					commit('fallar', error.response && error.response.status)
				}
			})
		},
		marcar_visto({ commit, state }, id) {
			const usuario_id = state.usuario_id
			return axios.post('/api/implementacion/' + encodeURIComponent(id) + '/visto', {}, { skip_global_error_event: true })
			.then(() => {
				if (state.usuario_id === usuario_id) {
					commit('marcar_visto', id)
				}
			})
		},
		aprobar({ commit, state }, id) {
			const usuario_id = state.usuario_id
			return axios.post('/api/implementacion/' + encodeURIComponent(id) + '/aprobar', {}, { skip_global_error_event: true })
			.then(({ data }) => {
				if (data.aprobado === true && state.usuario_id === usuario_id) {
					commit('marcar_aprobado', id)
				}
			})
		},
	},
}
