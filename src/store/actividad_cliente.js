import axios from 'axios'
axios.defaults.withCredentials = true
axios.defaults.baseURL = process.env.VUE_APP_API_URL

/**
 * Store del modal "Actividad en la tienda" (misión actividad-de-clientes-y-oferta-por-whatsapp).
 *
 * Es UNA sola instancia por vista: el modal se monta como hermano del <view-component> (con el
 * id 'actividad-cliente') y el botón de la fila solo commitea a quién hay que mirar. Por eso el
 * estado vive acá y no adentro del componente: el botón está adentro del v-for de la tabla y el
 * modal afuera, así que no se pueden pasar props entre ellos.
 *
 * Contrato de API (las dos rutas van gateadas por Sanctum y por la extensión 'tracking_buyers',
 * que es EL interruptor del tracking de las dos puntas: sin ella no hay una sola fila escrita):
 * - GET  api/actividad-de-clientes           ?client_id|buyer_id&periodo
 *                                            -> { actividad: {...} }
 * - POST api/actividad-de-clientes/resumen   { client_id|buyer_id, periodo }
 *                                            -> { resumen: 'texto plano en criollo' }
 *                                            |  422 { message } (sin IA en la cuenta / sin
 *                                               actividad en el periodo / la IA no contesta)
 *
 * Se manda `client_id` O `buyer_id`, nunca los dos: el backend contesta 422 si vienen juntos o
 * si no viene ninguno. Clientes del ERP entra por `client_id`; Tienda Online → Clientes entra
 * por `buyer_id`, que es la única puerta que alcanza a los compradores sin cliente asociado
 * (el vínculo `buyers.comercio_city_client_id` es opcional y manual).
 *
 * `periodo` es 7, 30, 90 o 0 (todo el historial). Cualquier otro valor es 422. Con 0 el backend
 * lee del agregado por día, y eso se nota en la respuesta: `fuente` viene 'agregado',
 * `linea_de_tiempo` viene siempre [] y las fechas vienen sin hora.
 *
 * 🔴 El resumen NO manda los números calculados: el endpoint los recalcula del lado del
 * servidor. Mandarlos desde acá sería dejar que el navegador le dicte a la IA qué decir.
 */

/**
 * Tokens de la última petición en vuelo, uno por acción.
 *
 * Viven FUERA del state y no son reactivos a propósito (molde de `store/ai_chat.js`): nadie los
 * renderiza, y meterlos adentro del state le agregaría claves al shape que fija el plan.
 *
 * Hacen falta porque el selector de periodo dispara un pedido por click: pasar de 30 a 90 y a 7
 * en dos segundos deja tres GET en vuelo, y sin el guard la pantalla la termina pintando el que
 * llegue último, que puede ser el del periodo que ya nadie está mirando.
 */
let token_actividad = 0
let token_resumen = 0

/**
 * Clave de la caché de resúmenes de sesión: ('c'|'b') + id + '|' + periodo.
 *
 * Lleva la letra adelante porque los dos espacios de ids son distintos y se pisarían: el
 * cliente 7 del ERP y el comprador 7 de la tienda no son la misma persona.
 */
function clave_de_resumen(abierto_para, periodo) {
	if (!abierto_para) {
		return ''
	}
	if (abierto_para.client_id) {
		return 'c' + abierto_para.client_id + '|' + periodo
	}
	return 'b' + abierto_para.buyer_id + '|' + periodo
}

/**
 * El mensaje que mandó el backend, tal cual, o el de repliegue si no vino ninguno.
 *
 * Los 422 del resumen traen los tres textos ya escritos en criollo ("no está disponible en esta
 * cuenta", "todavía no hay actividad", "esperá unos segundos y volvé a intentarlo"): se muestran
 * como vienen. Reemplazarlos por uno genérico le sacaría al operador la única pista de qué pasó
 * y de si tiene sentido reintentar.
 */
function mensaje_del_backend(err, de_repliegue) {
	if (err && err.response && err.response.data && err.response.data.message) {
		return err.response.data.message
	}
	return de_repliegue
}

/**
 * Los parámetros del objetivo, que son los mismos para el GET y para el POST.
 *
 * Se arman en un solo lugar a propósito: dos armados distintos del mismo contrato es cómo se
 * llega a que la actividad se pida de un cliente y el resumen de otro.
 */
function parametros_del_objetivo(abierto_para, periodo) {
	let params = {
		periodo: periodo,
	}
	if (abierto_para.client_id) {
		params.client_id = abierto_para.client_id
	} else {
		params.buyer_id = abierto_para.buyer_id
	}
	return params
}

export default {
	namespaced: true,
	state: {
		// A quién estamos mirando: {client_id, buyer_id, nombre}. Uno de los dos ids es null.
		abierto_para: null,
		// 7 | 30 | 90 | 0 (todo el historial). Cualquier otro valor lo rechaza el backend.
		periodo: 30,
		// El objeto `actividad` del endpoint, tal como vino. null = todavía no se pidió.
		actividad: null,
		loading: false,
		error: '',
		resumen: '',
		resumen_loading: false,
		resumen_error: '',
		/*
			Caché de sesión de los resúmenes ya pedidos: clave -> texto.

			🔴 Cada resumen es una llamada PAGA a Anthropic. Sin este freno, revisar diez
			clientes seguidos son diez llamadas, y volver atrás a mirar uno de nuevo son once.
			Con el freno es una por (cliente, periodo) y por sesión. El botón "Volver a leer"
			es la salida explícita cuando alguien quiere pagar otra.

			Sobrevive al cierre del modal (`reset` no la toca) y muere con el refresh de la
			página, que es exactamente la vida que tiene que tener: barata y sin persistencia.
		*/
		resumenes_pedidos: {},
	},
	mutations: {
		setAbiertoPara(state, value) {
			state.abierto_para = value || null
		},
		setPeriodo(state, value) {
			state.periodo = value
		},
		setActividad(state, value) {
			state.actividad = value || null
		},
		setLoading(state, value) {
			state.loading = value
		},
		setError(state, value) {
			state.error = value || ''
		},
		setResumen(state, value) {
			state.resumen = value || ''
		},
		setResumenLoading(state, value) {
			state.resumen_loading = value
		},
		setResumenError(state, value) {
			state.resumen_error = value || ''
		},
		/**
		 * Guarda un resumen en la caché de sesión.
		 *
		 * Se REEMPLAZA el objeto entero en vez de escribirle una clave nueva: en Vue 2 una
		 * clave agregada a mano a un objeto del state no es reactiva, y reemplazarlo evita
		 * tener que importar Vue solo para un `Vue.set`.
		 *
		 * @param {Object} payload {clave, texto}
		 */
		cachearResumen(state, payload) {
			let nuevo = Object.assign({}, state.resumenes_pedidos)
			nuevo[payload.clave] = payload.texto
			state.resumenes_pedidos = nuevo
		},
		/**
		 * Deja el modal como recién nacido al cerrarse.
		 *
		 * 🔴 NO limpia `resumenes_pedidos`: esa caché es de sesión y su razón de existir es
		 * justamente sobrevivir al cierre (volver a abrir el mismo cliente no puede costar
		 * otra llamada paga).
		 */
		reset(state) {
			state.abierto_para = null
			state.periodo = 30
			state.actividad = null
			state.loading = false
			state.error = ''
			state.resumen = ''
			state.resumen_loading = false
			state.resumen_error = ''
		},
	},
	actions: {
		/**
		 * Trae la actividad del cliente/comprador abierto, en el periodo elegido.
		 *
		 * @returns {Promise} resuelve con el objeto `actividad` (o con undefined si la
		 *                    respuesta llegó tarde y se descartó, o si falló). El que llama
		 *                    lo usa para decidir si pedir el resumen: sin datos no se pide.
		 */
		getActividad({ state, commit }) {
			if (!state.abierto_para) {
				return Promise.resolve()
			}
			commit('setLoading', true)
			commit('setError', '')
			// El token se captura ANTES de despachar: si al volver la respuesta el token ya es
			// otro, hubo un pedido más nuevo y ésta se descarta sin tocar la pantalla.
			token_actividad = token_actividad + 1
			let token = token_actividad
			let self_commit = commit

			return axios.get('/api/actividad-de-clientes', {
				params: parametros_del_objetivo(state.abierto_para, state.periodo),
			})
				.then(function (res) {
					if (token != token_actividad) {
						return
					}
					self_commit('setLoading', false)
					self_commit('setActividad', res.data.actividad)
					return res.data.actividad
				})
				.catch(function (err) {
					if (token != token_actividad) {
						return
					}
					console.log(err)
					self_commit('setLoading', false)
					// La actividad vieja se borra: dejar los números del pedido anterior
					// abajo de un cartel de error sería mostrar datos de otro periodo como
					// si fueran los de éste.
					self_commit('setActividad', null)
					self_commit('setError', mensaje_del_backend(err, 'No se pudo traer la actividad de este cliente en la tienda.'))
				})
		},
		/**
		 * Pide la lectura en criollo de la IA sobre la actividad ya cargada.
		 *
		 * Tres frenos antes de gastar una llamada:
		 * 1. Sin `hay_datos` no se pide (el backend contesta 422 igual, pero el viaje tampoco
		 *    se hace: es plata por un cliente que no hizo nada).
		 * 2. Si ese (cliente, periodo) ya se leyó en esta sesión, se sirve de la caché.
		 * 3. `forzar: true` saltea la caché — es el botón "Volver a leer", el único lugar
		 *    donde alguien pide explícitamente pagar otra.
		 *
		 * @param {Object} payload {forzar: Boolean}
		 */
		getResumen({ state, commit }, payload) {
			payload = payload || {}
			if (!state.abierto_para || !state.actividad || !state.actividad.hay_datos) {
				return Promise.resolve()
			}

			let clave = clave_de_resumen(state.abierto_para, state.periodo)
			if (!payload.forzar && typeof state.resumenes_pedidos[clave] != 'undefined') {
				commit('setResumen', state.resumenes_pedidos[clave])
				commit('setResumenError', '')
				return Promise.resolve(state.resumenes_pedidos[clave])
			}

			commit('setResumenLoading', true)
			commit('setResumenError', '')
			commit('setResumen', '')
			token_resumen = token_resumen + 1
			let token = token_resumen
			let self_commit = commit

			return axios.post('/api/actividad-de-clientes/resumen', parametros_del_objetivo(state.abierto_para, state.periodo))
				.then(function (res) {
					if (token != token_resumen) {
						return
					}
					self_commit('setResumenLoading', false)
					self_commit('setResumen', res.data.resumen)
					self_commit('cachearResumen', {
						clave: clave,
						texto: res.data.resumen,
					})
					return res.data.resumen
				})
				.catch(function (err) {
					if (token != token_resumen) {
						return
					}
					console.log(err)
					self_commit('setResumenLoading', false)
					// 🔴 El error NO se cachea: los tres 422 son transitorios o de
					// configuración, y guardarlos dejaría al cliente sin resumen por el resto
					// de la sesión aunque la IA vuelva a los diez segundos.
					self_commit('setResumenError', mensaje_del_backend(err, 'No se pudo leer la actividad de este cliente.'))
				})
		},
	},
}
