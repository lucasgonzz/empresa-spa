import axios from 'axios'
axios.defaults.withCredentials = true
axios.defaults.baseURL = process.env.VUE_APP_API_URL

/*
 * Cotización del dólar de la cuenta.
 *
 * 🔴 Este módulo NO es `store/dolar.js`. Ese otro guarda el promedio del blue que se trae de
 * bluelytics SIN sesión, y lo usan la home y el aviso de vencimiento para mostrar el precio de
 * los planes de ComercioCity. Acá se maneja la cotización con la que el comercio costea sus
 * artículos, que sale de nuestro backend y es de la cuenta.
 *
 * La regla que ordena todo el módulo: los estados son EXCLUYENTES y ninguno se deduce por
 * ausencia del otro.
 *
 *  - `estado === 'proveedor_caido'` significa NO SE PUDO MEDIR.
 *  - `comparacion === null` significa NO SE PUDO MEDIR.
 *  - "no hubo variación" es `estado === 'ok'` + `comparacion` con `variacion_porcentaje` en 0.
 *
 * Leer un `null` como "no hubo cambios" es la medición que falla y devuelve un valor
 * tranquilizador: el comercio seguiría costeando con un dólar viejo creyendo que está al día.
 * Por eso cada getter arranca preguntando por `estado`, y ninguno usa `!state.comparacion`.
 */

/**
 * Config de axios de las tres llamadas del módulo.
 *
 * `skip_global_error_event` apaga el modal de error global de `main.js` (el interceptor lo
 * respeta) por dos motivos distintos, los dos deliberados:
 *
 *  1. En el arranque: una caída de red durante el login le abriría a todo el mundo un cartel
 *     de error genérico por algo que no es su problema y que no puede resolver.
 *  2. Al guardar: el error se muestra ADENTRO del modal, con el mensaje del backend y sin
 *     cerrarlo. Un modal de error genérico encima diría menos y taparía al que dice más
 *     -- y en el caso del 409 hablaría de un error nuestro cuando lo que se cayó es un
 *     servicio de terceros.
 */
const CONFIG_SIN_MODAL_DE_ERROR = { skip_global_error_event: true }

/**
 * El mensaje que mandó el backend, tal cual, o el de repliegue si no vino ninguno.
 *
 * Mira dos lugares porque el backend contesta en dos formatos distintos según el caso:
 * el 409 de "no se puede guardar sin saber cuánto vale" trae `error.mensaje` (mismo formato
 * que el GET), y el resto de los errores traen el `message` de Laravel.
 *
 * @param {Object} err error de axios.
 * @param {String} de_repliegue texto a mostrar si el backend no mandó ninguno.
 * @returns {String}
 */
function mensaje_del_backend(err, de_repliegue) {
	let data = err && err.response && err.response.data ? err.response.data : null
	if (data && data.error && data.error.mensaje) {
		return data.error.mensaje
	}
	if (data && data.message) {
		return data.message
	}
	return de_repliegue
}

export default {
	namespaced: true,
	state: {
		// null = todavía no se preguntó. 'ok' | 'proveedor_caido' una vez que se preguntó.
		estado: null,
		// [{ clave, nombre, compra, venta, actualizada_at }]. Vacío cuando el proveedor se cayó.
		cotizaciones: [],
		// { origen, casa, punta, valor, actualizada_at } o null si nunca eligió nada.
		seleccion_actual: null,
		valor_dolar_actual: null,
		avisar_cambios: true,
		variacion_minima: 1,
		// La medición. null = NO SE PUDO MEDIR. Nunca un 0 de consuelo.
		comparacion: null,
		// { motivo, mensaje } cuando estado == 'proveedor_caido'. null cuando está todo bien.
		error: null,
		loading: false,
		guardando: false,
		error_al_guardar: null,

		/*
		 * Cómo se abrió el modal: 'login' cuando lo abrió solo el gancho del arranque,
		 * 'configuracion' cuando lo abrió el usuario desde el botón. Es el campo `disparo`
		 * del POST, que queda en la fila de historial.
		 *
		 * Vive acá y no adentro del modal porque el que sabe la respuesta es el gancho del
		 * arranque, que es otro componente: `$bvModal.show(id)` no lleva datos, así que la
		 * única forma de que el modal se entere es que quede escrito en algún lado que los
		 * dos vean. Arranca en 'configuracion' -- el caso del botón, que es el común -- y el
		 * modal lo devuelve a ese valor al cerrarse.
		 */
		abierto_desde: 'configuracion',
	},
	mutations: {
		set_loading(state, value) {
			state.loading = value
		},
		set_abierto_desde(state, value) {
			state.abierto_desde = value === 'login' ? 'login' : 'configuracion'
		},
		set_guardando(state, value) {
			state.guardando = value
		},
		set_error_al_guardar(state, value) {
			state.error_al_guardar = value || null
		},
		/**
		 * Vuelca la respuesta del GET al state.
		 *
		 * Los campos locales (`seleccion_actual`, `valor_dolar_actual`, las preferencias) vienen
		 * igual cuando el proveedor está caído: son datos nuestros y no dependen de la API de
		 * terceros. Los que sí dependen (`cotizaciones`, `comparacion`) quedan vacíos y en null.
		 */
		set_respuesta(state, data) {
			let respuesta = data || {}
			state.estado = respuesta.estado || null
			state.cotizaciones = Array.isArray(respuesta.cotizaciones) ? respuesta.cotizaciones : []
			state.seleccion_actual = respuesta.seleccion_actual || null
			state.valor_dolar_actual = respuesta.valor_dolar_actual != null
				? Number(respuesta.valor_dolar_actual)
				: null
			state.avisar_cambios = respuesta.avisar_cambios !== false
			state.variacion_minima = respuesta.variacion_minima != null
				? Number(respuesta.variacion_minima)
				: 1
			state.comparacion = respuesta.comparacion || null
			state.error = respuesta.error || null
		},
		/**
		 * Deja el módulo en "no se pudo medir".
		 *
		 * 🔴 `comparacion` se pone en null y `cotizaciones` se vacía, pero `seleccion_actual` y
		 * el resto de lo local NO se tocan: lo que el usuario eligió la última vez sigue siendo
		 * cierto aunque hoy no se pueda consultar cuánto vale.
		 */
		set_error_de_proveedor(state, error) {
			state.estado = 'proveedor_caido'
			state.cotizaciones = []
			state.comparacion = null
			state.error = error || null
		},
		/**
		 * Aplica lo que devolvió el POST.
		 *
		 * `comparacion` vuelve a null a propósito: la referencia que se acaba de guardar es la
		 * de este mismo momento, así que no hay medición vigente contra la cual compararla. Un
		 * 0 acá sería inventar una medición que nadie hizo.
		 */
		set_seleccion_guardada(state, data) {
			let respuesta = data || {}
			if (respuesta.dollar != null) {
				state.valor_dolar_actual = Number(respuesta.dollar)
			}
			if (respuesta.seleccion_actual) {
				state.seleccion_actual = respuesta.seleccion_actual
			}
			state.comparacion = null
		},
		set_preferencias(state, data) {
			let respuesta = data || {}
			if (respuesta.avisar_cambios != null) {
				state.avisar_cambios = respuesta.avisar_cambios !== false
			}
			if (respuesta.variacion_minima != null) {
				state.variacion_minima = Number(respuesta.variacion_minima)
			}
		},
	},
	getters: {
		/*
		 * 🔴 Los estados de abajo son EXCLUYENTES y ninguno se deduce por ausencia del otro.
		 * Cada uno pregunta primero por `estado`, porque con el proveedor caído no hay nada
		 * medido y cualquier respuesta tranquilizadora sería mentira.
		 */
		hubo_error_de_proveedor(state) {
			return state.estado === 'proveedor_caido'
		},
		/**
		 * Nunca eligió una cotización. No es lo mismo que haber elegido 'manual'.
		 */
		nunca_eligio(state) {
			return state.estado === 'ok'
				&& (!state.seleccion_actual || !state.seleccion_actual.origen)
		},
		/**
		 * Cargó un valor a mano y no tiene contra qué compararlo. Es el callejón en el que
		 * queda el que edita "Valor dolar" desde el formulario de Configuración: sin
		 * referencia no hay avisos, y la única salida es elegir una acá.
		 */
		sin_referencia(state) {
			return !!state.seleccion_actual
				&& state.seleccion_actual.origen === 'manual'
				&& !state.seleccion_actual.casa
		},
		/**
		 * Se midió y no se movió. 🔴 NO puede ser `!state.comparacion`: eso significa que no
		 * se pudo medir, que es otra cosa y se muestra distinto.
		 */
		sin_variacion(state) {
			return state.estado === 'ok'
				&& !!state.comparacion
				&& Number(state.comparacion.variacion_porcentaje) === 0
		},
		/**
		 * Se midió, se movió, pero menos que el umbral que puso el usuario. El umbral filtra
		 * si el modal aparece solo, no lo que se dice cuando el usuario pregunta.
		 */
		varia_bajo_umbral(state) {
			return state.estado === 'ok'
				&& !!state.comparacion
				&& Number(state.comparacion.variacion_porcentaje) !== 0
				&& !state.comparacion.supera_umbral
		},
		/**
		 * El único caso en el que el modal se abre solo al iniciar sesión.
		 */
		debe_avisar(state) {
			return state.estado === 'ok'
				&& !!state.comparacion
				&& !!state.comparacion.supera_umbral
				&& state.avisar_cambios
		},
	},
	actions: {
		/**
		 * Pide las cotizaciones de hoy y la medición contra la referencia guardada.
		 *
		 * El backend contesta 200 aunque el proveedor esté caído, con `estado` discriminado:
		 * que un servicio de terceros no responda es el RESULTADO de la medición, no un error
		 * de nuestro endpoint. Por eso el camino de error de acá abajo es solo para la caída
		 * de red entre la SPA y la API, y se distingue con `motivo: 'sin_conexion'`.
		 *
		 * @param {Boolean} silencioso lo manda el gancho del arranque. No cambia la request:
		 *   deja constancia de que el que llama no quiere ruido, y por eso el fallo no se
		 *   loguea acá (el gancho ya lo loguea con su propio mensaje).
		 * @returns {Promise}
		 */
		consultar({ commit }, { silencioso } = {}) {
			commit('set_loading', true)
			return axios.get('/api/dolar-cotizacion', CONFIG_SIN_MODAL_DE_ERROR)
				.then(res => {
					commit('set_loading', false)
					commit('set_respuesta', res.data)
					return res.data
				})
				.catch(err => {
					commit('set_loading', false)
					commit('set_error_de_proveedor', {
						motivo: 'sin_conexion',
						mensaje: 'No pudimos consultar las cotizaciones.',
					})
					if (!silencioso) {
						console.log(err)
					}
					return null
				})
		},
		/**
		 * Guarda la cotización elegida.
		 *
		 * 🔴 Devuelve la respuesta en el camino feliz y `null` cuando falló, y NUNCA vuelve a
		 * tirar el error: es el modal el que decide si cerrarse, y solo se cierra con una
		 * respuesta en la mano. Un cierre después de un fallo se lee como éxito.
		 *
		 * @returns {Promise}
		 */
		guardar({ commit, dispatch }, payload) {
			commit('set_guardando', true)
			commit('set_error_al_guardar', null)
			return axios.post('/api/dolar-cotizacion', payload, CONFIG_SIN_MODAL_DE_ERROR)
				.then(res => {
					commit('set_guardando', false)
					commit('set_seleccion_guardada', res.data)
					/*
					 * `users.dollar` cambió en la base y el formulario de Configuración lo tiene
					 * en memoria: sin esto sigue mostrando el valor viejo hasta el próximo F5.
					 */
					dispatch('auth/me', null, { root: true })
					return res.data
				})
				.catch(err => {
					commit('set_guardando', false)
					commit('set_error_al_guardar', mensaje_del_backend(
						err,
						'No pudimos guardar la cotización. Probá de nuevo en un rato.'
					))
					/*
					 * El 409 es "se cayó el proveedor entre que consultaste y guardaste". Se
					 * refleja en el estado para que el modal ofrezca el camino manual, que es
					 * el único que sigue estando disponible.
					 */
					if (err && err.response && err.response.status === 409) {
						let data = err.response.data || {}
						commit('set_error_de_proveedor', data.error || {
							motivo: 'proveedor_caido',
							mensaje: 'No pudimos consultar las cotizaciones.',
						})
					}
					return null
				})
		},
		/**
		 * Guarda solo el aviso y el umbral. No toca el dólar ni dispara ningún recálculo.
		 *
		 * Igual que `guardar`, devuelve `null` cuando falló y deja el motivo en
		 * `error_al_guardar`: apagar el aviso y que no se apague de verdad es exactamente el
		 * tipo de fallo silencioso que después nadie encuentra.
		 *
		 * @returns {Promise}
		 */
		guardar_preferencias({ commit }, { avisar_cambios, variacion_minima }) {
			commit('set_error_al_guardar', null)
			return axios.put('/api/dolar-cotizacion/preferencias', {
				avisar_cambios: avisar_cambios,
				variacion_minima: variacion_minima,
			}, CONFIG_SIN_MODAL_DE_ERROR)
				.then(res => {
					commit('set_preferencias', res.data)
					return res.data
				})
				.catch(err => {
					commit('set_error_al_guardar', mensaje_del_backend(
						err,
						'No pudimos guardar tus preferencias de aviso.'
					))
					return null
				})
		},
	},
}
