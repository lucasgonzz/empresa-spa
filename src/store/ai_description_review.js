import axios from 'axios'
import { env } from '@/runtime_config'
axios.defaults.withCredentials = true
axios.defaults.baseURL = env('VUE_APP_API_URL')

/*
 * Revisión de las descripciones automáticas (misión alertas-descripciones, 14/10/2026).
 *
 * Cuando la IA arma la descripción de un artículo a partir de su código de barras pero la información
 * que encontró no alcanza para estar segura (confianza baja), la API ya no la publica: la guarda
 * aparte como una propuesta "a revisar" y recién al aprobarla pasa a ser una descripción del artículo
 * (decisión D1 de Lucas). Este store es la capa de la SPA sobre el contrato §1.4 del plan, para la
 * sub-solapa Alertas → Catálogo → Descripciones, y está calcado de `category_proposal.js` en lo que
 * aplica:
 *
 *  - `resumen` ({a_revisar, publicadas, badge}) alimenta el número rojo de la sub-solapa, de la
 *    solapa Catálogo y de la campana del menú. Se pide al iniciar sesión (start_methods.js), al volver
 *    a tocar la pestaña, al terminar un lote de descripciones y después de cada acción.
 *  - `conteos` ({a_revisar, publicadas}) son los números de las dos solapas internas (A revisar ·
 *    Publicadas). Cada respuesta de la API los trae y se aplican con un resguardo de secuencia: una
 *    foto vieja que llega tarde no pisa a una más nueva.
 *  - La lista paginada y las acciones (aprobar, descartar, editar una publicada, quitar) no guardan
 *    nada propio: devuelven la respuesta normalizada y el componente que las llamó decide qué mostrar.
 *
 * 🔴 La SPA no decide qué está para revisar ni cuenta nada: el número rojo (`badge`) es el que manda
 * la API y nunca se recalcula acá.
 *
 * Quién la ve: todo el que ve Catálogo, como Imágenes (decisión D2). La API acota todo al negocio de
 * la sesión y contesta 404 a lo ajeno; la SPA no filtra nada por permisos.
 *
 * Compatibilidad hacia atrás: contra una API que todavía no tiene estas rutas (404), `get_resumen`
 * no muestra NINGÚN error y deja el número en cero. Es un pedido de fondo y va silencioso (sin el toast
 * del interceptor global). Los pedidos que dispara una persona (la lista, aprobar, descartar, guardar,
 * quitar) pasan por el interceptor global de main.js, que muestra el `message` de la API (un 4xx con
 * `message` sale como aviso amarillo): por eso quien los llama NO repite el toast de error.
 *
 * 🔴 TODOS los pedidos de este módulo van con `skip_navigation_cancel`: main.js cancela los pedidos en
 * vuelo al irse a OTRA pantalla, y una aprobación en lote se tiene que terminar aunque la persona salga
 * de Alertas (la API la aplica igual, y si el pedido se cancelara la pantalla no se enteraría).
 */

/** Opciones de axios de TODOS los pedidos de este módulo (ver el 🔴 de arriba). */
const OPCIONES_BASE = { skip_navigation_cancel: true }

/** Opciones de axios para los pedidos de fondo: además, sin el toast del interceptor global. */
const OPCIONES_SILENCIOSAS = { skip_global_error_event: true, skip_navigation_cancel: true }

/** Prefijo de todas las rutas de la revisión (contrato §1.4). */
const RUTA_DE_LA_REVISION = '/api/article-description-ai/revision'

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
 * fue una cancelación rechaza con un error marcado (`cancelado: true`).
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
 * Contador de pedidos del resumen del badge: solo se aplica la respuesta del último pedido. Vive
 * fuera del state porque no es información que se muestre.
 */
let ultimo_pedido_de_resumen = 0

/**
 * Los conteos de las dos solapas llegan por varios caminos (la lista y cada acción) y cada uno es una
 * foto del servidor en el momento de contestar. Cada pedido anota su número de secuencia al SALIR;
 * solo se aplica la foto de un pedido que salió después del último aplicado.
 */
let secuencia_de_conteos = 0

/** Secuencia del último pedido cuyos conteos se aplicaron (ver `secuencia_de_conteos`). */
let ultima_secuencia_aplicada = 0

// --- Normalización de lo que manda la API ------------------------------------------------------
//
// La API y la SPA se construyen por separado y los conteos de MySQL pueden llegar como texto. Todo lo
// que se dibuja pasa por acá: números siempre, listas siempre, null en lo que no vino. Un valor que no
// tiene la forma esperada nunca rompe el render.

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
 * @returns {String} El texto, o '' si no vino.
 */
function a_texto(valor) {
	if (valor === null || typeof valor === 'undefined') {
		return ''
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
 * Resumen vacío: lo que vale el badge mientras la API no contestó (o si no tiene la ruta).
 *
 * @returns {{a_revisar: Number, publicadas: Number, badge: Number}}
 */
export function resumen_vacio() {
	return { a_revisar: 0, publicadas: 0, badge: 0 }
}

/**
 * Normaliza el resumen del badge (GET `article-description-ai/resumen`).
 *
 * @param {Object|null} valor
 * @returns {{a_revisar: Number, publicadas: Number, badge: Number}}
 */
export function normalizar_resumen(valor) {
	if (!valor || typeof valor !== 'object') {
		return resumen_vacio()
	}
	return {
		a_revisar: a_numero(valor.a_revisar),
		publicadas: a_numero(valor.publicadas),
		badge: a_numero(valor.badge),
	}
}

/**
 * Normaliza los conteos de las dos solapas.
 *
 * @param {Object|null} valor `conteos` tal como llegó.
 * @returns {{a_revisar: Number, publicadas: Number}}
 */
export function normalizar_conteos(valor) {
	let origen = valor && typeof valor === 'object' ? valor : {}
	return {
		a_revisar: a_numero(origen.a_revisar),
		publicadas: a_numero(origen.publicadas),
	}
}

/**
 * El sitio de una URL, para mostrar como texto del link ("ferreteria-ejemplo.com.ar"), sin el "www.".
 *
 * Solo acepta direcciones `http` o `https`: lo que se dibuja como link sale de lo que encontró la IA
 * en internet, y un `javascript:` en el `href` se ejecutaría con la sesión del comercio al hacerle
 * clic (Vue 2 no lo filtra). Una fuente con cualquier otra cosa no se muestra como link.
 *
 * @param {*} url
 * @returns {String|null} El sitio, o null si la URL no es http(s).
 */
export function sitio_de_la_url(url) {
	if (typeof url !== 'string') {
		return null
	}
	let encontrado = /^https?:\/\/([^/?#:\s]+)/i.exec(url.trim())
	if (!encontrado) {
		return null
	}
	return encontrado[1].toLowerCase().replace(/^www\./, '')
}

/**
 * Las fuentes de una descripción: solo las que tienen una URL http(s) (ver `sitio_de_la_url`), cada
 * una con su sitio ya calculado. Dos fuentes de la misma URL se muestran una vez.
 *
 * @param {*} fuentes `fuentes` tal como llegó.
 * @returns {Array<{source: String|null, url: String, title: String|null, sitio: String}>}
 */
export function normalizar_fuentes(fuentes) {
	let resultado = []
	let vistas = []
	a_lista(fuentes).forEach(function (fuente) {
		if (!fuente || typeof fuente !== 'object') {
			return
		}
		let sitio = sitio_de_la_url(fuente.url)
		if (!sitio) {
			return
		}
		let url = String(fuente.url).trim()
		if (vistas.indexOf(url) !== -1) {
			return
		}
		vistas.push(url)
		resultado.push({
			source: a_texto_o_null(fuente.source),
			url: url,
			title: a_texto_o_null(fuente.title),
			sitio: sitio,
		})
	})
	return resultado
}

/**
 * Un artículo de la revisión (el `Item` del contrato §1.4): sus datos, sus secciones (título y texto)
 * y de dónde sacó la información la IA.
 *
 * En "A revisar" las secciones llegan con `id: null` (todavía no son descripciones del artículo); en
 * "Publicadas" cada una trae el id de su fila de `descriptions`, que es lo que se manda al editarla.
 *
 * @param {Object} item
 * @returns {Object}
 */
export function normalizar_item(item) {
	let origen = item && typeof item === 'object' ? item : {}
	let articulo = origen.articulo && typeof origen.articulo === 'object' ? origen.articulo : {}
	let secciones = []
	a_lista(origen.secciones).forEach(function (seccion) {
		let datos = seccion && typeof seccion === 'object' ? seccion : {}
		secciones.push({
			id: a_id_o_null(datos.id),
			title: a_texto(datos.title),
			content: a_texto(datos.content),
		})
	})
	let article_id = a_numero(origen.article_id || articulo.id)
	return {
		article_id: article_id,
		articulo: {
			id: a_numero(articulo.id || article_id),
			nombre: a_texto_o_null(articulo.nombre),
			codigo_de_barras: a_texto_o_null(articulo.codigo_de_barras),
			codigo_de_proveedor: a_texto_o_null(articulo.codigo_de_proveedor),
		},
		secciones: secciones,
		fuentes: normalizar_fuentes(origen.fuentes),
		confianza: a_texto_o_null(origen.confianza),
		fecha: a_texto_o_null(origen.fecha),
	}
}

/**
 * Una página de la revisión (GET `article-description-ai/revision`), con sus artículos normalizados.
 *
 * @param {Object|null} datos `{models, total, pagina, por_pagina, conteos}`
 * @returns {{models: Array, total: Number, pagina: Number, por_pagina: Number, ultima_pagina: Number, conteos: Object}}
 */
export function normalizar_pagina(datos) {
	let origen = datos && typeof datos === 'object' ? datos : {}
	let models = []
	a_lista(origen.models).forEach(function (item) {
		models.push(normalizar_item(item))
	})
	let total = a_numero(origen.total)
	let por_pagina = a_numero(origen.por_pagina) || 25
	return {
		models: models,
		total: total,
		pagina: a_numero(origen.pagina) || 1,
		por_pagina: por_pagina,
		ultima_pagina: Math.max(1, Math.ceil(total / por_pagina)),
		conteos: normalizar_conteos(origen.conteos),
	}
}

/**
 * Id de la persona con la sesión abierta, o null.
 *
 * La sesión se puede cerrar y abrir otra sin recargar la página (el store sobrevive): si el que entra
 * es de otro negocio, no tiene que ver ni un instante el número del anterior. Por eso cada dato
 * guarda de quién es.
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
 * @param {Object} root_state
 * @param {Number} secuencia Número de secuencia que anotó el pedido al salir.
 * @param {Object|null} conteos `conteos` crudos de la respuesta.
 * @returns {void}
 */
function aplicar_conteos(commit, root_state, secuencia, conteos) {
	if (!conteos || typeof conteos !== 'object' || secuencia <= ultima_secuencia_aplicada) {
		return
	}
	ultima_secuencia_aplicada = secuencia
	commit('set_conteos', { valor: normalizar_conteos(conteos), usuario_id: usuario_actual_id(root_state) })
}

/**
 * Lo común de las acciones de la revisión: el pedido, los conteos aplicados con su secuencia y la
 * respuesta normalizada para quien llamó. Rechaza si falla (una cancelación, marcada).
 *
 * @param {Object} contexto `{commit, rootState}` de la acción.
 * @param {String} metodo post | put
 * @param {String} ruta
 * @param {Object} cuerpo
 * @returns {Promise<Object>} `{datos, conteos}`: la respuesta cruda y sus conteos normalizados.
 */
function pedir_accion(contexto, metodo, ruta, cuerpo) {
	secuencia_de_conteos++
	let esta_secuencia = secuencia_de_conteos
	return axios[metodo](ruta, cuerpo || {}, opciones())
		.then(res => {
			let datos = res.data || {}
			aplicar_conteos(contexto.commit, contexto.rootState, esta_secuencia, datos.conteos)
			return { datos: datos, conteos: normalizar_conteos(datos.conteos) }
		})
		.catch(relanzar_marcando_la_cancelacion)
}

/**
 * Las secciones tal como las espera la API al aprobar una editada: `[{title, content}]`, sin id.
 *
 * @param {Array} secciones
 * @returns {Array<{title: String, content: String}>}
 */
function secciones_para_aprobar(secciones) {
	let resultado = []
	a_lista(secciones).forEach(function (seccion) {
		resultado.push({ title: a_texto(seccion.title), content: a_texto(seccion.content) })
	})
	return resultado
}

/**
 * Las secciones tal como las espera la API al editar una publicada: `[{id, title, content}]`.
 *
 * @param {Array} secciones
 * @returns {Array<{id: Number, title: String, content: String}>}
 */
function secciones_para_editar(secciones) {
	let resultado = []
	a_lista(secciones).forEach(function (seccion) {
		resultado.push({ id: a_id_o_null(seccion.id), title: a_texto(seccion.title), content: a_texto(seccion.content) })
	})
	return resultado
}

export default {
	namespaced: true,
	state: {
		/** Números del badge (GET `resumen`). */
		resumen: resumen_vacio(),
		/** Id de quien pidió el `resumen` (ver `usuario_actual_id`). */
		resumen_de_usuario: null,
		/** Números de las dos solapas internas, los últimos que mandó la API. */
		conteos: { a_revisar: 0, publicadas: 0 },
		/** Id de quien pidió los `conteos`. */
		conteos_de_usuario: null,
		/**
		 * Se incrementa cada vez que alguien pide que la revisión vuelva a traer su lista (volver a
		 * tocar la pestaña Descripciones o Catálogo, "Revisar ahora" estando ya ahí, el fin de un lote
		 * de descripciones). La lista vive en el componente de la sección, que mira este número: así
		 * quien lo pide no necesita una referencia a un componente que puede no estar montado.
		 */
		pedidos_de_recarga: 0,
		/**
		 * La solapa que pidió el último pedido de recarga (a_revisar | publicadas), o null si pidió
		 * quedarse en la que está. "Revisar ahora" y "Revisar en Alertas" piden A revisar: si la sección
		 * estaba abierta en Publicadas, cambia.
		 */
		solapa_de_la_recarga: null,
	},
	getters: {
		/**
		 * Número rojo de la sub-solapa y lo que suma a Catálogo y a la campana: los artículos con una
		 * descripción esperando revisión, tal como lo manda la API. Si lo guardado es de otra persona
		 * (otro usuario entró sin recargar), vale cero.
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
		/**
		 * Los números de las solapas internas: los más nuevos que mandó la API, por cualquier camino (el
		 * resumen, la lista o una acción; ver `aplicar_conteos`). Así "A revisar (N)" nunca queda atrás
		 * del número rojo. Si son de otra persona, ceros.
		 *
		 * @returns {{a_revisar: Number, publicadas: Number}}
		 */
		conteos(state, getters, root_state) {
			let usuario_id = usuario_actual_id(root_state)
			if (usuario_id !== null && state.conteos_de_usuario === usuario_id) {
				return state.conteos
			}
			return { a_revisar: 0, publicadas: 0 }
		},
	},
	mutations: {
		/**
		 * @param {Object} state
		 * @param {{valor: Object, usuario_id: *}} pedido
		 */
		set_resumen(state, pedido) {
			state.resumen = normalizar_resumen(pedido.valor)
			state.resumen_de_usuario = pedido.usuario_id
		},
		/**
		 * @param {Object} state
		 * @param {{valor: Object, usuario_id: *}} pedido `valor` ya normalizado.
		 */
		set_conteos(state, pedido) {
			state.conteos = pedido.valor
			state.conteos_de_usuario = pedido.usuario_id
		},
		/**
		 * @param {Object} state
		 * @param {String|null} solapa La solapa a la que tiene que pasar la sección, o null.
		 */
		pedir_recarga_de_la_revision(state, solapa) {
			state.solapa_de_la_recarga = solapa === 'a_revisar' || solapa === 'publicadas' ? solapa : null
			state.pedidos_de_recarga++
		},
	},
	actions: {
		/**
		 * Trae el resumen liviano del badge. Silencioso: contra un error el número queda como estaba y
		 * no se muestra nada; contra una API que todavía no tiene la ruta (404) queda en cero. Resuelve
		 * siempre, porque start_methods.js lo encadena con el resto del arranque.
		 *
		 * El resumen trae los mismos dos números que las solapas internas, así que también se aplican
		 * como conteos, con el resguardo de secuencia: si ya llegó una foto más nueva (una lista o una
		 * acción que salieron después), no la pisa.
		 *
		 * @returns {Promise}
		 */
		get_resumen({ commit, rootState }) {
			ultimo_pedido_de_resumen++
			let este_resumen = ultimo_pedido_de_resumen
			let usuario_id = usuario_actual_id(rootState)
			secuencia_de_conteos++
			let esta_secuencia = secuencia_de_conteos

			return axios.get('/api/article-description-ai/resumen', OPCIONES_SILENCIOSAS)
				.then(res => {
					if (este_resumen !== ultimo_pedido_de_resumen) {
						return
					}
					commit('set_resumen', { valor: res.data, usuario_id: usuario_id })
					let resumen = normalizar_resumen(res.data)
					aplicar_conteos(commit, rootState, esta_secuencia, { a_revisar: resumen.a_revisar, publicadas: resumen.publicadas })
				})
				.catch(err => {
					if (es_cancelacion(err) || este_resumen !== ultimo_pedido_de_resumen) {
						return
					}
					// Un 404 es una API que todavía no tiene estas rutas: el número vale cero y no se anuncia.
					if (err && err.response && err.response.status === 404) {
						commit('set_resumen', { valor: resumen_vacio(), usuario_id: usuario_id })
						aplicar_conteos(commit, rootState, esta_secuencia, { a_revisar: 0, publicadas: 0 })
						return
					}
					console.log('article-description-ai/resumen: no se pudo traer el resumen del badge')
					console.log(err)
				})
		},
		/**
		 * Pide que la revisión vuelva a traer su lista (si está montada) y el número rojo. Con
		 * `{solapa}`, además, que pase a esa solapa ("Revisar ahora" y "Revisar en Alertas" piden A
		 * revisar aunque la sección estuviera abierta en Publicadas).
		 *
		 * @param {Object} contexto
		 * @param {{solapa: String}} [opciones]
		 * @returns {Promise} La del resumen (resuelve siempre).
		 */
		recargar_revision({ commit, dispatch }, opciones) {
			commit('pedir_recarga_de_la_revision', opciones && opciones.solapa ? opciones.solapa : null)
			return dispatch('get_resumen')
		},
		/**
		 * Trae una página de una solapa de la revisión. Los conteos de las dos solapas que trae la
		 * respuesta quedan aplicados.
		 *
		 * Rechaza si falla, para que la revisión muestre su propio estado de error. Una cancelación
		 * rechaza marcada (ver `es_cancelacion`).
		 *
		 * @param {Object} contexto
		 * @param {Object} pedido `{solapa, pagina, por_pagina, buscar}`
		 * @returns {Promise<Object>} Lo de `normalizar_pagina`.
		 */
		get_items({ commit, rootState }, pedido) {
			secuencia_de_conteos++
			let esta_secuencia = secuencia_de_conteos
			let params = {
				solapa: pedido.solapa,
				pagina: pedido.pagina || 1,
				por_pagina: pedido.por_pagina || 25,
			}
			// El buscador vacío no viaja: la API lo trata como "sin filtro" igual, pero así la URL queda
			// limpia en la pestaña de red y en los logs.
			if (pedido.buscar) {
				params.buscar = pedido.buscar
			}
			return axios.get(RUTA_DE_LA_REVISION, opciones({ params: params }))
				.then(res => {
					let datos = res.data || {}
					aplicar_conteos(commit, rootState, esta_secuencia, datos.conteos)
					return normalizar_pagina(datos)
				})
				.catch(relanzar_marcando_la_cancelacion)
		},
		/**
		 * Aprueba la descripción de un artículo: la API la pasa a las descripciones del artículo (se ve
		 * en la tienda y en la ficha) y la saca de "A revisar". Con `secciones` aprueba lo editado; sin
		 * ellas, tal cual la armó la IA. 404 con `message` si ya no estaba para revisar.
		 *
		 * @param {Object} contexto
		 * @param {{article_id: Number, secciones: Array|null}} pedido
		 * @returns {Promise<{conteos: Object}>}
		 */
		aprobar(contexto, pedido) {
			let cuerpo = {}
			if (pedido.secciones && pedido.secciones.length) {
				cuerpo.secciones = secciones_para_aprobar(pedido.secciones)
			}
			return pedir_accion(contexto, 'post', RUTA_DE_LA_REVISION + '/' + pedido.article_id + '/aprobar', cuerpo)
				.then(respuesta => ({ conteos: respuesta.conteos }))
		},
		/**
		 * Descarta la descripción de un artículo: no se publica y el lote automático no se la vuelve a
		 * proponer. El artículo queda sin descripción. 404 si ya no estaba para revisar.
		 *
		 * @param {Object} contexto
		 * @param {Number} article_id
		 * @returns {Promise<{conteos: Object}>}
		 */
		descartar(contexto, article_id) {
			return pedir_accion(contexto, 'post', RUTA_DE_LA_REVISION + '/' + article_id + '/descartar', {})
				.then(respuesta => ({ conteos: respuesta.conteos }))
		},
		/**
		 * Aprueba varias de una vez, tal cual las armó la IA (hasta 100 por pedido; la revisión manda
		 * como mucho una página). Las que ya no estaban para revisar se ignoran.
		 *
		 * @param {Object} contexto
		 * @param {Array<Number>} article_ids
		 * @returns {Promise<{resueltos: Number, conteos: Object}>}
		 */
		aprobar_varios(contexto, article_ids) {
			return pedir_accion(contexto, 'post', RUTA_DE_LA_REVISION + '/aprobar-varios', { article_ids: article_ids })
				.then(respuesta => ({ resueltos: a_numero(respuesta.datos.resueltos), conteos: respuesta.conteos }))
		},
		/**
		 * Descarta varias de una vez.
		 *
		 * @param {Object} contexto
		 * @param {Array<Number>} article_ids
		 * @returns {Promise<{resueltos: Number, conteos: Object}>}
		 */
		descartar_varios(contexto, article_ids) {
			return pedir_accion(contexto, 'post', RUTA_DE_LA_REVISION + '/descartar-varios', { article_ids: article_ids })
				.then(respuesta => ({ resueltos: a_numero(respuesta.datos.resueltos), conteos: respuesta.conteos }))
		},
		/**
		 * Guarda el título y el texto editados de una descripción ya publicada. 422 si alguna sección
		 * no es de IA o no es de ese artículo; 404 si el artículo no es del negocio.
		 *
		 * @param {Object} contexto
		 * @param {{article_id: Number, secciones: Array}} pedido Secciones con su `id`.
		 * @returns {Promise<{model: Object|null, conteos: Object}>} `model` normalizado.
		 */
		guardar_publicada(contexto, pedido) {
			let cuerpo = { secciones: secciones_para_editar(pedido.secciones) }
			return pedir_accion(contexto, 'put', RUTA_DE_LA_REVISION + '/' + pedido.article_id + '/publicada', cuerpo)
				.then(respuesta => ({
					model: respuesta.datos.model ? normalizar_item(respuesta.datos.model) : null,
					conteos: respuesta.conteos,
				}))
		},
		/**
		 * Quita la descripción de IA de un artículo ya publicado (las cargadas a mano nunca se tocan). El
		 * lote automático no se la vuelve a generar. 404 si ya no tenía descripciones de IA.
		 *
		 * @param {Object} contexto
		 * @param {Number} article_id
		 * @returns {Promise<{conteos: Object}>}
		 */
		quitar(contexto, article_id) {
			return pedir_accion(contexto, 'post', RUTA_DE_LA_REVISION + '/' + article_id + '/quitar', {})
				.then(respuesta => ({ conteos: respuesta.conteos }))
		},
	},
}
