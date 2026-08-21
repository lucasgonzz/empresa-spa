import axios from 'axios'
axios.defaults.withCredentials = true
axios.defaults.baseURL = process.env.VUE_APP_API_URL

/*
 * Estado del escaneo de facturas de compra con IA (misión escaneo-factura-compra).
 *
 * Módulo escrito a mano, sin `__base_store`: esto no es un ABM. Un escaneo no se
 * lista, no se filtra ni se edita como un modelo del sistema; es una corrida que
 * arranca, termina en segundo plano y después se revisa una sola vez.
 *
 * Guarda cuatro cosas que conviene no confundir:
 *
 *  - `corrida`: el escaneo que el usuario acaba de mandar (o el que quedó abierto
 *    de una sesión anterior). Es lo que alimenta el aviso de "terminó".
 *  - `pendientes`: la lista de escaneos LISTOS Y SIN GESTIONAR que devuelve el
 *    backend. 🔴 Es la ÚNICA fuente del botón rojo del listado de compras. No se
 *    deriva de `corrida` ni de ningún flag de sesión: el botón rojo afirma que hay
 *    trabajo esperando en el servidor, así que tiene que salir del servidor. Una
 *    interfaz que afirma por su cuenta algo que el backend nunca confirmó ya nos
 *    costó una misión.
 *  - `detalle`: el escaneo abierto en el modal de revisión, con su `resultado`
 *    completo. Se pide recién cuando el usuario aprieta el botón rojo.
 *  - `compra`: la compra sobre la que se está trabajando (la fila del listado).
 *    El modal de revisión la necesita para saber el `modo_facturacion`.
 *  - `abrir_en`: una orden puntual — "abrí la revisión de ESTE escaneo". La deja el
 *    modal de aviso al apretar "Revisar ahora" y la consume el modal de revisión.
 *    No es lo mismo que `pendientes`: puede haber escaneos pendientes y ninguna
 *    orden de apertura, que es el caso normal.
 *
 * Endpoints (fijados en el plan de la misión, §4):
 * - GET  provider-order-scan/pendientes            -> { models: [ {provider_order_id, uuid, cantidad_articulos, created_at} ] }
 * - GET  provider-order-scan/en-curso              -> { run: {...} | null }
 * - GET  provider-order-scan/{uuid}                -> { uuid, provider_order_id, estado, ..., imagenes, resultado }
 * - POST provider-order-scan/{uuid}/visto          -> 200
 * - POST provider-order-scan/{uuid}/descartar      -> 200
 */
export default {
	namespaced: true,
	state: {
		/*
		 * Escaneo abierto del usuario, tal como lo devuelve la API. Null cuando no hay
		 * ninguno.
		 */
		corrida: null,

		/*
		 * Escaneos listos y sin gestionar del comercio:
		 * [ { provider_order_id, uuid, cantidad_articulos, created_at } ].
		 * Lo carga `start_methods` al arrancar la SPA y se refresca cuando llega el
		 * aviso de que terminó un escaneo.
		 */
		pendientes: [],

		/*
		 * Escaneo abierto en el modal de revisión, con `resultado` e `imagenes`.
		 */
		detalle: null,

		/*
		 * Compra sobre la que se escanea o se revisa (la fila del listado de compras).
		 */
		compra: null,

		/* True mientras se pide el detalle de un escaneo. */
		cargando_detalle: false,

		/*
		 * Orden de apertura para el modal de revisión: { uuid, provider_order_id }.
		 * Null cuando no hay nada pendiente de abrir.
		 *
		 * 🔴 Existe por el mismo motivo que `excel_analysis.abrir_en`: el modal de
		 * revisión es lazy y vive adentro del listado de compras, así que cuando llega
		 * el aviso de "terminó el escaneo" casi nunca está montado. El aviso deja la
		 * orden ACÁ y recién después navega; el modal la consume en su created() si
		 * todavía no estaba, o por un watch si ya estaba. Sin esto, "revisar ahora"
		 * no se puede hacer: solo queda el camino largo de encontrar la fila en el
		 * listado y apretar el botón rojo.
		 */
		abrir_en: null,
	},
	getters: {
		/*
		 * Devuelve el escaneo pendiente de revisar de una compra, o null.
		 *
		 * Es lo que enciende el botón rojo de la fila. La comparación es floja (`==`)
		 * a propósito: el id de la fila del listado puede venir como número y el del
		 * escaneo como string según por dónde haya pasado.
		 *
		 * @param {Object} state
		 * @return {Function} (provider_order_id) => Object|null
		 */
		pendiente_de(state) {
			return function (provider_order_id) {
				let encontrado = state.pendientes.find(pendiente => {
					return pendiente.provider_order_id == provider_order_id
				})
				return encontrado || null
			}
		},
		/*
		 * True si hay un escaneo todavía trabajando. Lo usa el modal de subida para no
		 * dejar mandar dos escaneos encimados (el backend igual responde 409).
		 *
		 * @param {Object} state
		 * @return {Boolean}
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
		set_pendientes(state, value) {
			state.pendientes = value || []
		},
		set_detalle(state, value) {
			state.detalle = value || null
		},
		set_compra(state, value) {
			state.compra = value || null
		},
		set_cargando_detalle(state, value) {
			state.cargando_detalle = !!value
		},
		/*
		 * Deja (o limpia, con null) la orden de "abrí la revisión de este escaneo".
		 *
		 * @param {Object} state
		 * @param {Object|null} value  { uuid, provider_order_id }
		 */
		set_abrir_en(state, value) {
			state.abrir_en = value || null
		},
		/*
		 * Apaga el botón rojo de una compra sin volver a pedir la lista al servidor.
		 * Se usa después de confirmar o descartar, que son los dos gestos que el
		 * backend acaba de registrar como "gestionado".
		 *
		 * @param {Object} state
		 * @param {Number|String} provider_order_id
		 */
		quitar_pendiente(state, provider_order_id) {
			state.pendientes = state.pendientes.filter(pendiente => {
				return pendiente.provider_order_id != provider_order_id
			})
		},
		/*
		 * Limpia la corrida solo si es la que se pasa por parámetro. Evita que el
		 * "ya la vi" de una corrida vieja borre una corrida nueva que el usuario
		 * arrancó mientras tanto. (Mismo criterio que el store de excel_analysis.)
		 *
		 * @param {Object} state
		 * @param {String} uuid
		 */
		limpiar_corrida_si_es(state, uuid) {
			if (state.corrida && state.corrida.uuid === uuid) {
				state.corrida = null
			}
		},
	},
	actions: {
		/*
		 * Trae los escaneos listos y sin gestionar del comercio. Es la consulta que
		 * enciende los botones rojos del listado de compras.
		 *
		 * Se llama al arrancar la SPA y cada vez que llega el aviso de que terminó un
		 * escaneo. Es liviana a propósito: no trae el `resultado` de ninguno.
		 */
		get_pendientes({ commit }) {
			return axios.get('/api/provider-order-scan/pendientes')
				.then(res => {
					commit('set_pendientes', res.data.models)
					return res.data.models
				})
				.catch(err => {
					/*
					 * Que falle no rompe nada: el listado de compras se ve igual, sin el
					 * botón rojo. Peor sería inventar el botón sin el dato del servidor.
					 */
					console.log(err)
					return []
				})
		},
		/*
		 * Recupera el escaneo abierto del usuario tras cerrar la pestaña.
		 *
		 * El aviso de "terminó" viaja por broadcast, y un broadcast solo le llega a
		 * quien está conectado en ese momento: si mandó el escaneo y cerró la pestaña,
		 * el evento pasó sin nadie que lo escuche. Esto es lo que cierra ese agujero.
		 */
		get_en_curso({ commit }) {
			return axios.get('/api/provider-order-scan/en-curso')
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
		 * Trae el escaneo completo (con `resultado` e `imagenes`) para el modal de
		 * revisión. Es la única llamada pesada del flujo y se hace recién cuando el
		 * usuario aprieta el botón rojo.
		 *
		 * @param {String} uuid
		 */
		abrir_revision({ commit }, uuid) {
			commit('set_cargando_detalle', true)

			return axios.get('/api/provider-order-scan/' + uuid)
				.then(res => {
					commit('set_detalle', res.data)
					commit('set_cargando_detalle', false)
					return res.data
				})
				.catch(err => {
					console.log(err)
					commit('set_detalle', null)
					commit('set_cargando_detalle', false)
					return null
				})
		},
		/*
		 * Marca el AVISO como visto para que no se vuelva a ofrecer en la próxima
		 * carga. Ojo: visto no es gestionado — el botón rojo sigue prendido hasta que
		 * el usuario confirme o descarte.
		 *
		 * @param {String} uuid
		 */
		marcar_visto({ commit }, uuid) {
			if (!uuid) {
				return Promise.resolve()
			}

			commit('limpiar_corrida_si_es', uuid)

			return axios.post('/api/provider-order-scan/' + uuid + '/visto')
				.catch(err => {
					/*
					 * En el peor caso la próxima carga le vuelve a ofrecer un aviso que ya
					 * miró, y lo descarta de nuevo. No vale la pena molestarlo con un error.
					 */
					console.log(err)
				})
		},
		/*
		 * Apaga el botón rojo de una compra después de que el backend ya registró la
		 * gestión (confirmar o descartar). Es SOLO local: no hay request acá, porque
		 * el request ya lo hizo quien llamó a esto y volvió 200.
		 *
		 * @param {Object} payload  { uuid, provider_order_id }
		 */
		marcar_gestionado({ commit }, payload) {
			let datos = payload || {}
			commit('quitar_pendiente', datos.provider_order_id)
			commit('limpiar_corrida_si_es', datos.uuid)
		},
		/*
		 * Descarta un escaneo: el backend le pone `gestionado_at` y
		 * `resultado_gestion = 'descartado'`, y el botón rojo se apaga sin asentar
		 * nada en la compra.
		 *
		 * Existe porque si no, un escaneo que salió mal (foto borrosa, documento
		 * equivocado) deja el botón rojo prendido para siempre.
		 *
		 * Necesita `state` además de `commit` porque el id de la compra que hay que
		 * sacar de `pendientes` se resuelve desde el uuid.
		 *
		 * @param {String} uuid
		 */
		descartar({ commit, state }, uuid) {
			let pendiente = state.pendientes.find(item => {
				return item.uuid === uuid
			})
			let provider_order_id = pendiente ? pendiente.provider_order_id : null

			if (!provider_order_id && state.detalle && state.detalle.uuid === uuid) {
				provider_order_id = state.detalle.provider_order_id
			}

			return axios.post('/api/provider-order-scan/' + uuid + '/descartar')
				.then(res => {
					commit('quitar_pendiente', provider_order_id)
					commit('limpiar_corrida_si_es', uuid)
					return res
				})
		},
	},
}
