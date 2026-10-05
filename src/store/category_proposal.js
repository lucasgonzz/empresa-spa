import axios from 'axios'
import { env } from '@/runtime_config'
axios.defaults.withCredentials = true
axios.defaults.baseURL = env('VUE_APP_API_URL')

/*
 * Sistemas de categorías con IA (misión categorizacion-tres-modelos, 5/10/2026).
 *
 * ComercioCity arma, para el catálogo de un negocio, hasta tres sistemas de categorías con IA (más
 * "Mantener las mías" si el negocio ya tenía categorías) y el dueño elige el que más le gusta desde
 * Alertas → Catálogo → Categorías. Este store es la capa de la SPA sobre el contrato B del plan
 * (§6), y está calcado de `image_assignment.js`:
 *
 *  - `resumen` ({hay_propuestas, estado, run_id, pendientes_de_elegir, a_revisar, sin_ver, badge,
 *    puede_gestionar}) alimenta el número rojo de la solapa Alertas → Catálogo y la campana del
 *    menú. Se pide al loguear (start_methods.js), al volver a tocar la solapa activa y cada vez que
 *    algo lo mueve (elegir, volver atrás, aprobar, rechazar).
 *  - `actual` es la corrida vigente con sus tarjetas, árboles, conteos y bloqueos (GET `actual`).
 *    Es lo que dibuja la solapa Categorías.
 *  - Las acciones que cambian algo (elegir, volver atrás, aprobar, rechazar) y la lista paginada de
 *    la revisión no guardan nada propio: devuelven la respuesta y el componente que las llamó decide
 *    qué mostrar. Lo único que aplican al estado son los `conteos` de las tres solapas de la
 *    revisión, que cada respuesta trae.
 *
 * 🔴 La SPA NO decide nada de plata ni de permisos. Si un sistema nuevo está bloqueado (márgenes por
 * categoría, Tienda Nube), si se puede volver atrás, qué advertencias van en el cartel de confirmar:
 * todo eso lo calcula la API y acá solo se lo normaliza para dibujarlo. (Clase de error "el mismo
 * invariante decidido con dos criterios en front y back"). Por la misma razón el número rojo
 * (`badge`) es el que manda la API y nunca se recalcula.
 *
 * Compatibilidad hacia atrás: contra una API que todavía no tiene estas rutas (404) la SPA no
 * muestra NINGÚN error ni rompe nada de Alertas. `get_resumen` y `get_actual` son pedidos de fondo y
 * van silenciosos (sin el toast del interceptor global); `get_actual` además distingue el 404
 * ("todavía no disponible") de cualquier otro fallo ("error con reintento").
 *
 * Errores: los pedidos que dispara una persona (elegir, volver atrás, aprobar, rechazar, paginar la
 * revisión) pasan por el interceptor global de main.js, que muestra el `message` de la API (un 4xx
 * con `message` sale como aviso amarillo): por eso quien los llama NO repite el toast, solo apaga el
 * cargando global si lo prendió. Los de fondo (badge, `actual`, marcar vista) son silenciosos.
 *
 * 🔴 TODOS los pedidos de este módulo van con `skip_navigation_cancel`. main.js cancela los pedidos
 * en vuelo al irse a OTRA pantalla, y `elegir` es un pedido largo que se tiene que terminar aunque
 * la persona salga de Alertas: la API lo aplica igual, y si el pedido se cancelara en el navegador la
 * pantalla se quedaría sin enterarse del resultado.
 */

/**
 * Opciones de axios de TODOS los pedidos de este módulo (ver el 🔴 de arriba).
 */
const OPCIONES_BASE = { skip_navigation_cancel: true }

/**
 * Opciones de axios para los pedidos de fondo: además, sin el toast del interceptor global.
 */
const OPCIONES_SILENCIOSAS = { skip_global_error_event: true, skip_navigation_cancel: true }

/**
 * Opciones de un pedido de este módulo: las de base más las propias del pedido.
 *
 * @param {Object} propias Por ejemplo `{ params }`.
 * @returns {Object}
 */
function opciones(propias) {
	return Object.assign({}, OPCIONES_BASE, propias || {})
}

/**
 * True si un error es en realidad un pedido cancelado (por axios, o marcado por
 * `relanzar_marcando_la_cancelacion`). Se exporta para que los componentes no muestren una
 * cancelación como si fuera un error: no falló nada, el pedido no llegó a volver.
 *
 * @param {*} err
 * @returns {Boolean}
 */
export function es_cancelacion(err) {
	return !!err && (err.cancelado === true || axios.isCancel(err))
}

/**
 * `catch` de las acciones que devuelven la respuesta a quien las llamó: vuelve a rechazar, pero si
 * fue una cancelación rechaza con un error marcado (`cancelado: true`), para que quien llamó pueda
 * reconocerlo con `es_cancelacion` sin importar axios.
 *
 * @param {*} err
 * @returns {Promise} Siempre rechazada.
 */
function relanzar_marcando_la_cancelacion(err) {
	if (axios.isCancel(err)) {
		let cancelacion = new Error('Pedido cancelado')
		cancelacion.cancelado = true
		return Promise.reject(cancelacion)
	}
	return Promise.reject(err)
}

/**
 * Contador de pedidos de `actual`. Se pide desde varios lados (entrar a la solapa, volver a tocarla,
 * el refresco mientras se prepara, después de elegir o de volver atrás) y una respuesta vieja que
 * llega tarde no puede pisar a una más nueva: solo se aplica la del último pedido. Vive fuera del
 * state porque no es información que se muestre.
 */
let ultimo_pedido_de_actual = 0

/**
 * Contador de pedidos del RESUMEN del badge: el que se pidió último es el único que se aplica.
 */
let ultimo_pedido_de_resumen = 0

/**
 * Los conteos de las tres solapas de la revisión llegan por varios caminos (`actual`, la lista de
 * ítems, aprobar, rechazar y sus versiones en lote) y cada uno es una foto del servidor en el
 * momento de contestar. Si dos pedidos se cruzan, una foto vieja que llega tarde no puede pisar a
 * una más nueva. Cada pedido anota su número de secuencia al SALIR; solo se aplica la foto de un
 * pedido que salió después del último aplicado.
 */
let secuencia_de_conteos = 0

/** Secuencia del último pedido cuyos conteos se aplicaron (ver `secuencia_de_conteos`). */
let ultima_secuencia_aplicada = 0

// --- Normalización de lo que manda la API ------------------------------------------------------
//
// La API y la SPA se construyen por separado y los conteos de MySQL pueden llegar como texto. Todo
// lo que se dibuja pasa por acá: números siempre, listas siempre, ceros y vacíos en lo que no vino.
// Un valor que no tiene la forma esperada nunca rompe el render.

/**
 * @param {*} valor
 * @returns {Number} El número, o 0 si no es un número finito.
 */
function a_numero(valor) {
	let numero = Number(valor)
	return isFinite(numero) ? numero : 0
}

/**
 * @param {*} valor
 * @returns {Array} El mismo arreglo, o uno vacío si no era un arreglo.
 */
function a_lista(valor) {
	return Array.isArray(valor) ? valor : []
}

/**
 * @param {*} valor
 * @returns {String|null} El texto, o null si no vino (undefined, null o vacío).
 */
function a_texto_o_null(valor) {
	if (valor === null || typeof valor === 'undefined' || valor === '') {
		return null
	}
	return String(valor)
}

/**
 * @param {*} valor
 * @returns {Number|null} El id como número, o null si no vino.
 */
function a_id_o_null(valor) {
	if (valor === null || typeof valor === 'undefined' || valor === '') {
		return null
	}
	return a_numero(valor)
}

/**
 * Resumen vacío: lo que vale el badge mientras la API no contestó (o si no contestó nunca).
 *
 * @returns {Object}
 */
export function resumen_vacio() {
	return {
		hay_propuestas: false,
		estado: null,
		run_id: null,
		pendientes_de_elegir: false,
		a_revisar: 0,
		sin_ver: false,
		badge: 0,
		puede_gestionar: false,
	}
}

/**
 * Normaliza el resumen del badge que manda la API. Un valor que no es objeto devuelve el vacío.
 *
 * @param {Object|null} valor Resumen tal como llegó.
 * @returns {Object}
 */
export function normalizar_resumen(valor) {
	if (!valor || typeof valor !== 'object') {
		return resumen_vacio()
	}
	return {
		hay_propuestas: valor.hay_propuestas === true,
		estado: a_texto_o_null(valor.estado),
		run_id: a_id_o_null(valor.run_id),
		pendientes_de_elegir: valor.pendientes_de_elegir === true,
		a_revisar: a_numero(valor.a_revisar),
		sin_ver: valor.sin_ver === true,
		badge: a_numero(valor.badge),
		puede_gestionar: valor.puede_gestionar === true,
	}
}

/**
 * Los conteos de las tres solapas de la revisión.
 *
 * @param {Object|null} valor `conteos` tal como llegó.
 * @returns {{a_revisar: Number, asignados: Number, sin_categoria: Number}}
 */
export function normalizar_conteos(valor) {
	let origen = valor && typeof valor === 'object' ? valor : {}
	return {
		a_revisar: a_numero(origen.a_revisar),
		asignados: a_numero(origen.asignados),
		sin_categoria: a_numero(origen.sin_categoria),
	}
}

/**
 * El resumen de lo que hizo "Elegir este" (`run.resultado`). La API lo manda como objeto, pero por si
 * llegara como texto JSON se lo intenta leer. Sin resultado (la corrida no se eligió) devuelve null.
 *
 * @param {Object|String|null} valor
 * @returns {Object|null} Con las ocho cuentas como números.
 */
export function normalizar_resultado(valor) {
	let origen = valor
	if (typeof origen === 'string') {
		try {
			origen = JSON.parse(origen)
		} catch (err) {
			origen = null
		}
	}
	if (!origen || typeof origen !== 'object' || Array.isArray(origen)) {
		return null
	}
	return {
		categorias_creadas: a_numero(origen.categorias_creadas),
		categorias_reutilizadas: a_numero(origen.categorias_reutilizadas),
		subcategorias_creadas: a_numero(origen.subcategorias_creadas),
		articulos_asignados: a_numero(origen.articulos_asignados),
		a_revisar: a_numero(origen.a_revisar),
		sin_asignar: a_numero(origen.sin_asignar),
		pierden_categoria: a_numero(origen.pierden_categoria),
		categorias_eliminadas: a_numero(origen.categorias_eliminadas),
	}
}

/**
 * El objeto `run` del contrato B (§6.2). Sin corrida, null.
 *
 * `puede_gestionar` solo vale false si la API lo dice explícitamente; `puede_cambiar` solo vale true
 * si la API lo dice explícitamente: ante la duda no se ofrece volver atrás, y la API contesta 409 si
 * igual se pide. (Es "dibujar lo que dice la API", no una decisión propia.)
 *
 * @param {Object|null} run
 * @returns {Object|null}
 */
export function normalizar_run(run) {
	if (!run || typeof run !== 'object') {
		return null
	}
	return {
		id: a_numero(run.id),
		estado: run.estado ? String(run.estado) : '',
		articulos_total: a_numero(run.articulos_total),
		creada_at: a_texto_o_null(run.creada_at),
		elegida_at: a_texto_o_null(run.elegida_at),
		propuesta_elegida_id: a_id_o_null(run.propuesta_elegida_id),
		puede_gestionar: run.puede_gestionar !== false,
		puede_cambiar: run.puede_cambiar === true,
		motivo_no_puede_cambiar: a_texto_o_null(run.motivo_no_puede_cambiar),
		resultado: normalizar_resultado(run.resultado),
	}
}

/**
 * Un nodo del árbol de una tarjeta: una categoría (con sus subcategorías) o, un nivel más abajo, una
 * subcategoría. El árbol tiene SOLO dos niveles, así que `subcategorias` se lee únicamente en el
 * primero.
 *
 * `suman` llega null en las propuestas nuevas y con un número en "Mantener las mías": se conserva la
 * diferencia (null = no aplica) para que el árbol pueda decidir qué mostrar.
 *
 * @param {Object} nodo `{id, nombre, articulos, dudosos, suman, subcategorias}`
 * @param {Boolean} es_categoria true en el primer nivel.
 * @returns {Object}
 */
function normalizar_nodo(nodo, es_categoria) {
	let origen = nodo && typeof nodo === 'object' ? nodo : {}
	let subcategorias = []
	if (es_categoria) {
		a_lista(origen.subcategorias).forEach(function (hija) {
			subcategorias.push(normalizar_nodo(hija, false))
		})
	}
	return {
		id: a_numero(origen.id),
		nombre: origen.nombre === null || typeof origen.nombre === 'undefined' ? '' : String(origen.nombre),
		articulos: a_numero(origen.articulos),
		dudosos: a_numero(origen.dudosos),
		suman: origen.suman === null || typeof origen.suman === 'undefined' ? null : a_numero(origen.suman),
		subcategorias: subcategorias,
	}
}

/**
 * Una tarjeta: un sistema de categorías, con sus totales y su árbol.
 *
 * @param {Object} propuesta `propuestas[]` de `actual` (§6.2).
 * @returns {Object}
 */
export function normalizar_propuesta(propuesta) {
	let origen = propuesta && typeof propuesta === 'object' ? propuesta : {}
	let totales = origen.totales && typeof origen.totales === 'object' ? origen.totales : {}
	let arbol = []
	a_lista(origen.arbol).forEach(function (nodo) {
		arbol.push(normalizar_nodo(nodo, true))
	})
	let advertencias = []
	a_lista(origen.advertencias).forEach(function (codigo) {
		if (typeof codigo === 'string' && codigo) {
			advertencias.push(codigo)
		}
	})
	return {
		id: a_numero(origen.id),
		clave: origen.clave === null || typeof origen.clave === 'undefined' ? '' : String(origen.clave),
		tipo: origen.tipo === 'mantener' ? 'mantener' : 'nueva',
		nombre: origen.nombre === null || typeof origen.nombre === 'undefined' ? '' : String(origen.nombre),
		resumen: a_texto_o_null(origen.resumen),
		descripcion: a_texto_o_null(origen.descripcion),
		orden: a_numero(origen.orden),
		elegida: origen.elegida === true,
		advertencias: advertencias,
		totales: {
			categorias: a_numero(totales.categorias),
			subcategorias: a_numero(totales.subcategorias),
			articulos: a_numero(totales.articulos),
			seguros: a_numero(totales.seguros),
			dudosos: a_numero(totales.dudosos),
			sin_asignar: a_numero(totales.sin_asignar),
			pierden_categoria: a_numero(totales.pierden_categoria),
		},
		arbol: arbol,
	}
}

/**
 * Lo que devuelve GET `category-proposal-runs/actual` (§6.2), normalizado. Sin corrida, `run` va
 * en null y las tarjetas en `[]`.
 *
 * `bloqueo.motivos` son los motivos tal como los manda la API (`{codigo, cantidad}`): la SPA no los
 * interpreta, solo los traduce a texto (ver categorias/textos.js).
 *
 * @param {Object|null} datos
 * @returns {Object}
 */
export function normalizar_actual(datos) {
	let origen = datos && typeof datos === 'object' ? datos : {}
	let bloqueo = origen.bloqueo && typeof origen.bloqueo === 'object' ? origen.bloqueo : {}

	let motivos = []
	a_lista(bloqueo.motivos).forEach(function (motivo) {
		if (motivo && typeof motivo === 'object' && motivo.codigo) {
			motivos.push({ codigo: String(motivo.codigo), cantidad: a_numero(motivo.cantidad) })
		}
	})

	let advertencias = []
	a_lista(origen.advertencias).forEach(function (codigo) {
		if (typeof codigo === 'string' && codigo) {
			advertencias.push(codigo)
		}
	})

	let propuestas = []
	a_lista(origen.propuestas).forEach(function (propuesta) {
		propuestas.push(normalizar_propuesta(propuesta))
	})

	return {
		run: normalizar_run(origen.run),
		bloqueo: {
			nuevo_modelo_bloqueado: bloqueo.nuevo_modelo_bloqueado === true,
			motivos: motivos,
		},
		advertencias: advertencias,
		tiene_categorias_previas: origen.tiene_categorias_previas === true,
		conteos: normalizar_conteos(origen.conteos),
		propuestas: propuestas,
	}
}

/**
 * Una fila de la revisión (§6.6): un artículo, lo que sugiere el sistema y, si ya se asignó, la
 * categoría real que tiene.
 *
 * @param {Object} fila
 * @returns {Object}
 */
export function normalizar_item(fila) {
	let origen = fila && typeof fila === 'object' ? fila : {}
	let articulo = origen.articulo && typeof origen.articulo === 'object' ? origen.articulo : {}
	let sugerencia = origen.sugerencia && typeof origen.sugerencia === 'object' ? origen.sugerencia : {}
	let actual = origen.actual && typeof origen.actual === 'object' ? origen.actual : {}
	return {
		id: a_numero(origen.id),
		estado: origen.estado ? String(origen.estado) : '',
		confianza: origen.confianza ? String(origen.confianza) : '',
		motivo: a_texto_o_null(origen.motivo),
		articulo: {
			id: a_numero(articulo.id),
			nombre: a_texto_o_null(articulo.nombre),
			codigo_de_barras: a_texto_o_null(articulo.codigo_de_barras),
			codigo_de_proveedor: a_texto_o_null(articulo.codigo_de_proveedor),
		},
		sugerencia: {
			categoria: a_texto_o_null(sugerencia.categoria),
			subcategoria: a_texto_o_null(sugerencia.subcategoria),
		},
		actual: {
			categoria: a_texto_o_null(actual.categoria),
			subcategoria: a_texto_o_null(actual.subcategoria),
		},
	}
}

/**
 * El paginador de Laravel de la revisión, con sus filas normalizadas. Sin paginador, una página
 * vacía.
 *
 * @param {Object|null} paginador `{data, total, last_page, current_page, per_page}`
 * @returns {{data: Array, total: Number, last_page: Number, current_page: Number, per_page: Number}}
 */
export function normalizar_pagina(paginador) {
	let origen = paginador && typeof paginador === 'object' ? paginador : {}
	let filas = []
	a_lista(origen.data).forEach(function (fila) {
		filas.push(normalizar_item(fila))
	})
	return {
		data: filas,
		total: a_numero(origen.total),
		last_page: a_numero(origen.last_page) || 1,
		current_page: a_numero(origen.current_page) || 1,
		per_page: a_numero(origen.per_page),
	}
}

/**
 * Id de la persona con la sesión abierta, o null.
 *
 * Lo que guarda este store (el badge, la corrida con sus tarjetas) es del negocio de quien lo pidió.
 * La sesión se puede cerrar y abrir otra sin recargar la página (el store sobrevive): si el que entra
 * es otro, no tiene que ver ni un instante lo del anterior. Por eso cada dato guarda de quién es.
 *
 * @param {Object} root_state `rootState` de Vuex.
 * @returns {Number|null}
 */
function usuario_actual_id(root_state) {
	let usuario = root_state && root_state.auth ? root_state.auth.user : null
	return usuario && typeof usuario.id !== 'undefined' ? usuario.id : null
}

/**
 * Aplica los conteos de un pedido si su foto no es más vieja que la última aplicada (ver
 * `secuencia_de_conteos`). Sin conteos en la respuesta no hace nada.
 *
 * @param {Function} commit
 * @param {Number} secuencia Número de secuencia que anotó el pedido al salir.
 * @param {Object|null} conteos `conteos` crudos de la respuesta.
 * @returns {void}
 */
function aplicar_conteos(commit, secuencia, conteos) {
	if (!conteos || typeof conteos !== 'object' || secuencia <= ultima_secuencia_aplicada) {
		return
	}
	ultima_secuencia_aplicada = secuencia
	commit('set_conteos', normalizar_conteos(conteos))
}

export default {
	namespaced: true,
	state: {
		/** Números del badge (§6.1). */
		resumen: resumen_vacio(),
		/** Id de quien pidió el `resumen` (ver `usuario_actual_id`). */
		resumen_de_usuario: null,
		/** La corrida vigente con sus tarjetas (§6.2), normalizada; null mientras no llegó. */
		actual: null,
		/** Id de quien pidió `actual` (ver `usuario_actual_id`). */
		actual_de_usuario: null,
		/**
		 * Estado de la carga de `actual`:
		 *  - sin_cargar: nadie la pidió todavía.
		 *  - cargando: primera carga en vuelo (sin nada para mostrar todavía).
		 *  - listo: hay datos (aunque se esté refrescando de fondo, o un refresco haya fallado).
		 *  - no_disponible: la API contestó 404 (todavía no tiene estas rutas).
		 *  - error: falló y no hay nada para mostrar (red, 5xx).
		 */
		estado_de_actual: 'sin_cargar',
	},
	getters: {
		/**
		 * Número rojo de la solapa y lo que suma a la campana: el que manda la API (un sistema
		 * esperando que el dueño elija vale 1 y cada dudoso por revisar suma uno). Nunca se
		 * recalcula acá. Si lo que hay guardado es de otra persona (otro usuario entró sin recargar),
		 * vale cero.
		 *
		 * @returns {Number}
		 */
		badge(state, getters, root_state) {
			let usuario_id = usuario_actual_id(root_state)
			if (usuario_id === null || state.resumen_de_usuario !== usuario_id) {
				return 0
			}
			return a_numero(state.resumen.badge)
		},
	},
	mutations: {
		set_resumen(state, pedido) {
			state.resumen = normalizar_resumen(pedido.valor)
			state.resumen_de_usuario = pedido.usuario_id
		},
		/**
		 * Guarda la corrida vigente (ya normalizada) y de quién es.
		 *
		 * @param {Object} state
		 * @param {{datos: Object, usuario_id: *}} pedido
		 */
		set_actual(state, pedido) {
			state.actual = pedido.datos
			state.actual_de_usuario = pedido.usuario_id
		},
		set_estado_de_actual(state, valor) {
			state.estado_de_actual = valor
		},
		/** Descarta lo que había de `actual` (otro usuario, o la API contestó 404). */
		reiniciar_actual(state) {
			state.actual = null
			state.actual_de_usuario = null
			state.estado_de_actual = 'sin_cargar'
		},
		/**
		 * Reemplaza los conteos de las tres solapas de la revisión dentro de `actual`.
		 *
		 * @param {Object} state
		 * @param {Object} conteos Ya normalizados.
		 */
		set_conteos(state, conteos) {
			if (state.actual) {
				state.actual.conteos = conteos
			}
		},
	},
	actions: {
		/**
		 * Trae el resumen liviano del badge. Silencioso: contra un error (o una API que todavía no
		 * tiene el endpoint) el badge queda como estaba y no se muestra nada. Resuelve siempre,
		 * porque start_methods.js lo encadena con el resto del arranque.
		 *
		 * Solo se aplica si es el último resumen pedido (ver `ultimo_pedido_de_resumen`).
		 *
		 * @returns {Promise}
		 */
		get_resumen({ commit, rootState }) {
			ultimo_pedido_de_resumen++
			let este_resumen = ultimo_pedido_de_resumen
			let usuario_id = usuario_actual_id(rootState)

			return axios.get('/api/category-proposal-runs/resumen', OPCIONES_SILENCIOSAS)
				.then(res => {
					if (este_resumen !== ultimo_pedido_de_resumen) {
						return
					}
					commit('set_resumen', { valor: res.data, usuario_id: usuario_id })
				})
				.catch(err => {
					if (es_cancelacion(err)) {
						return
					}
					// Un 404 es una API que todavía no tiene estas rutas: es lo esperado y no se anuncia.
					if (!(err && err.response && err.response.status === 404)) {
						console.log('category-proposal-runs/resumen: no se pudo traer el resumen del badge')
						console.log(err)
					}
				})
		},
		/**
		 * Trae la corrida vigente con sus tarjetas, árboles, conteos y bloqueos. Pedido de fondo:
		 * silencioso (el 404 de una API vieja no puede mostrar nada). Resuelve SIEMPRE, con lo que
		 * pasó: 'listo' | 'no_disponible' | 'error' | 'obsoleto' (llegó tarde, ya había otro pedido
		 * más nuevo) | 'cancelado'. El estado de la carga queda en `estado_de_actual`.
		 *
		 * Con datos ya a la vista (`estado_de_actual` en 'listo') refresca de fondo sin parpadear: un
		 * refresco que falla no borra lo que se estaba mostrando. Si lo que había era de otra
		 * persona (otro usuario entró sin recargar), se descarta antes de pedir.
		 *
		 * @returns {Promise<String>}
		 */
		get_actual({ commit, state, rootState }) {
			let usuario_id = usuario_actual_id(rootState)
			if (state.actual_de_usuario !== usuario_id) {
				commit('reiniciar_actual')
			}

			ultimo_pedido_de_actual++
			let este_pedido = ultimo_pedido_de_actual
			secuencia_de_conteos++
			let esta_secuencia = secuencia_de_conteos

			if (state.estado_de_actual !== 'listo') {
				commit('set_estado_de_actual', 'cargando')
			}

			return axios.get('/api/category-proposal-runs/actual', OPCIONES_SILENCIOSAS)
				.then(res => {
					if (este_pedido !== ultimo_pedido_de_actual) {
						return 'obsoleto'
					}
					let datos = normalizar_actual(res.data)

					// Si un pedido que salió DESPUÉS de este ya aplicó conteos más nuevos, se conservan esos.
					if (esta_secuencia <= ultima_secuencia_aplicada && state.actual) {
						datos.conteos = state.actual.conteos
					} else {
						ultima_secuencia_aplicada = esta_secuencia
					}

					commit('set_actual', { datos: datos, usuario_id: usuario_id })
					commit('set_estado_de_actual', 'listo')
					return 'listo'
				})
				.catch(err => {
					if (este_pedido !== ultimo_pedido_de_actual) {
						return 'obsoleto'
					}
					if (es_cancelacion(err)) {
						// No falló nada, pero el pedido no volvió: no se puede dejar la pantalla cargando para siempre.
						commit('set_estado_de_actual', state.actual ? 'listo' : 'error')
						return 'cancelado'
					}
					let status = err && err.response ? err.response.status : 0
					if (status === 404) {
						commit('reiniciar_actual')
						commit('set_estado_de_actual', 'no_disponible')
						return 'no_disponible'
					}
					console.log('category-proposal-runs/actual: no se pudo traer la corrida vigente')
					console.log(err)
					commit('set_estado_de_actual', state.actual ? 'listo' : 'error')
					return 'error'
				})
		},
		/**
		 * Le avisa a la API que el dueño abrió la solapa con la corrida lista (`sin_ver` pasa a
		 * falso). Silencioso y resuelve siempre: que no se pueda marcar no es un problema de nadie.
		 *
		 * @param {Object} context
		 * @param {Number} run_id
		 * @returns {Promise<Boolean>} true si la API lo registró.
		 */
		marcar_visto(context, run_id) {
			return axios.put('/api/category-proposal-runs/' + run_id + '/visto', {}, OPCIONES_SILENCIOSAS)
				.then(() => true)
				.catch(err => {
					if (!es_cancelacion(err)) {
						console.log(err)
					}
					return false
				})
		},
		/**
		 * "Elegir este": la API crea (o reutiliza) las categorías del sistema elegido y asigna los
		 * artículos que son seguros, todo en un solo pedido y todo o nada. Puede tardar: el que lo
		 * llama prende el cargando global. Elegir dos veces la misma propuesta contesta 200 con
		 * `ya_estaba: true` y no reaplica.
		 *
		 * Rechaza si falla. 403 `solo_el_dueno`, 404 `no_encontrado`, 409 `no_esta_lista` /
		 * `ya_hay_una_elegida` y 422 `bloqueado_por_margenes` / `bloqueado_por_tienda_nube` traen su
		 * `message` y los muestra el interceptor global.
		 *
		 * @param {Object} context
		 * @param {Object} pedido `{run_id, propuesta_id, eliminar_categorias_vacias}`
		 * @returns {Promise<Object>} `{ok, run, resultado, ya_estaba}` con `run` y `resultado` normalizados.
		 */
		elegir(context, pedido) {
			let cuerpo = {
				propuesta_id: pedido.propuesta_id,
				eliminar_categorias_vacias: !!pedido.eliminar_categorias_vacias,
			}
			return axios.post('/api/category-proposal-runs/' + pedido.run_id + '/elegir', cuerpo, opciones())
				.then(res => {
					let datos = res.data || {}
					return {
						ok: datos.ok === true,
						run: normalizar_run(datos.run),
						resultado: normalizar_resultado(datos.resultado),
						ya_estaba: datos.ya_estaba === true,
					}
				})
				.catch(relanzar_marcando_la_cancelacion)
		},
		/**
		 * "Cambiar de sistema": vuelve la corrida a `lista`. La API solo lo permite mientras nadie
		 * haya revisado ni editado nada a mano (409 `no_se_puede_volver_atras`, con su `message`).
		 *
		 * @param {Object} context
		 * @param {Number} run_id
		 * @returns {Promise<Object>} `{ok, run}` con `run` normalizado.
		 */
		volver_atras(context, run_id) {
			return axios.post('/api/category-proposal-runs/' + run_id + '/volver-atras', {}, opciones())
				.then(res => {
					let datos = res.data || {}
					return { ok: datos.ok === true, run: normalizar_run(datos.run) }
				})
				.catch(relanzar_marcando_la_cancelacion)
		},
		/**
		 * Trae una página de los artículos de UNA solapa de la revisión (de la propuesta elegida). Los
		 * conteos de las tres solapas que trae la respuesta quedan aplicados en `actual`.
		 *
		 * Rechaza si falla, para que la revisión pueda mostrar su propio estado de error. Una
		 * cancelación rechaza marcada (ver `es_cancelacion`).
		 *
		 * @param {Object} context
		 * @param {Object} pedido `{run_id, solapa, page, per_page, buscar}`
		 * @returns {Promise<Object>} `{models: {data, total, last_page, current_page, per_page}, conteos}`
		 */
		get_items({ commit }, pedido) {
			secuencia_de_conteos++
			let esta_secuencia = secuencia_de_conteos
			let params = {
				solapa: pedido.solapa,
				page: pedido.page || 1,
				per_page: pedido.per_page || 25,
			}
			// El buscador vacío no viaja: la API lo trata como "sin filtro" igual, pero así la URL
			// queda limpia en la pestaña de red y en los logs.
			if (pedido.buscar) {
				params.buscar = pedido.buscar
			}
			return axios.get('/api/category-proposal-runs/' + pedido.run_id + '/items', opciones({ params: params }))
				.then(res => {
					let datos = res.data || {}
					aplicar_conteos(commit, esta_secuencia, datos.conteos)
					return {
						models: normalizar_pagina(datos.models),
						conteos: normalizar_conteos(datos.conteos),
					}
				})
				.catch(relanzar_marcando_la_cancelacion)
		},
		/**
		 * Aprueba la sugerencia para un artículo "a revisar": la API asegura la categoría (la crea si
		 * hace falta) y se la asigna al artículo; el ítem queda `aprobada`. 404 / 409 con `message` si
		 * ya no estaba para revisar.
		 *
		 * @param {Object} context
		 * @param {Number} item_id
		 * @returns {Promise<Object>} `{item, conteos}`
		 */
		aprobar({ commit }, item_id) {
			return pedir_resolucion(commit, '/api/category-proposal-items/' + item_id + '/aprobar', {})
		},
		/**
		 * Rechaza la sugerencia: el artículo sigue sin categoría y pasa a "Sin categoría".
		 *
		 * @param {Object} context
		 * @param {Number} item_id
		 * @returns {Promise<Object>} `{item, conteos}`
		 */
		rechazar({ commit }, item_id) {
			return pedir_resolucion(commit, '/api/category-proposal-items/' + item_id + '/rechazar', {})
		},
		/**
		 * Aprueba varios a la vez (la API acepta hasta 500 por pedido; la revisión manda como mucho
		 * una página, 100). Los que ya no estaban para revisar se omiten y se cuentan.
		 *
		 * @param {Object} context
		 * @param {Array} ids Ids de ítems.
		 * @returns {Promise<Object>} `{procesados, omitidos, conteos}`
		 */
		aprobar_varios({ commit }, ids) {
			return pedir_resolucion_en_lote(commit, '/api/category-proposal-items/aprobar-varios', ids)
		},
		/**
		 * Rechaza varios a la vez.
		 *
		 * @param {Object} context
		 * @param {Array} ids Ids de ítems.
		 * @returns {Promise<Object>} `{procesados, omitidos, conteos}`
		 */
		rechazar_varios({ commit }, ids) {
			return pedir_resolucion_en_lote(commit, '/api/category-proposal-items/rechazar-varios', ids)
		},
	},
}

/**
 * Lo común de aprobar y rechazar de a uno: POST, conteos aplicados y el ítem normalizado.
 *
 * @param {Function} commit
 * @param {String} ruta
 * @param {Object} cuerpo
 * @returns {Promise<Object>} `{item, conteos}`
 */
function pedir_resolucion(commit, ruta, cuerpo) {
	secuencia_de_conteos++
	let esta_secuencia = secuencia_de_conteos
	return axios.post(ruta, cuerpo, opciones())
		.then(res => {
			let datos = res.data || {}
			aplicar_conteos(commit, esta_secuencia, datos.conteos)
			return {
				item: datos.item ? normalizar_item(datos.item) : null,
				conteos: normalizar_conteos(datos.conteos),
			}
		})
		.catch(relanzar_marcando_la_cancelacion)
}

/**
 * Lo común de aprobar y rechazar en lote.
 *
 * @param {Function} commit
 * @param {String} ruta
 * @param {Array} ids
 * @returns {Promise<Object>} `{procesados, omitidos, conteos}`
 */
function pedir_resolucion_en_lote(commit, ruta, ids) {
	secuencia_de_conteos++
	let esta_secuencia = secuencia_de_conteos
	return axios.post(ruta, { ids: ids }, opciones())
		.then(res => {
			let datos = res.data || {}
			aplicar_conteos(commit, esta_secuencia, datos.conteos)
			return {
				procesados: a_numero(datos.procesados),
				omitidos: a_numero(datos.omitidos),
				conteos: normalizar_conteos(datos.conteos),
			}
		})
		.catch(relanzar_marcando_la_cancelacion)
}
