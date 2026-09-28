/*
	Resolucion de un "Diseño de Vender" (mision diseno-vender-configurable, 28/9/2026).

	Un diseño guardado (`vender_layouts.layout`) es un JSON que el backend NO interpreta: no conoce el
	catalogo de elementos, que vive en elementos.js. Lo interpreta este archivo, y lo usan las dos
	puntas de la SPA: Vender (para dibujar) y el editor del ABM (para editar).

	Formato (version 1):

		{
			version: 1,
			etapas: {
				etapa_1: [ {key: 'metodo_de_pago', cols: 4}, {key: 'separador', id: 'separador_1', cols: 12} ],
				etapa_2: [ ... ],
				etapa_3: [ ... ],
			},
			sacados: ['combos'],
		}

	`layout = null` (el "Diseño predeterminado" que siembra el seeder) significa "el diseño del sistema":
	ver diseno_predeterminado.js.

	🔴 LA REGLA QUE NO SE PUEDE PERDER: resolver_diseno() SIEMPRE devuelve TODOS los elementos del
	catalogo, cada uno una sola vez, ubicado en una etapa o en `sacados`. Es lo que garantiza que un
	campo que se agregue a Vender en el futuro aparezca en los diseños ya guardados (se inserta al
	lado de su predecesor del orden por defecto) y que un obligatorio nunca quede afuera aunque el JSON
	lo diga (vuelve a su etapa). La disponibilidad (extension apagada, sin permiso) NO se aplica aca
	sino al dibujar, con elementos_visibles(): asi un elemento conserva su lugar mientras su extension
	esta apagada.
*/
import {
	ELEMENTOS,
	ETAPAS,
	KEY_SEPARADOR,
	elemento,
	es_obligatorio,
	esta_disponible,
	cols_por_defecto,
	acotar_cols,
} from './elementos'
import diseno_predeterminado, { VERSION_DEL_FORMATO } from './diseno_predeterminado'

/* Mismo patron que valida el backend (VenderLayoutHelper::normalizar_layout) para el id de un separador. */
const PATRON_ID_SEPARADOR = /^[a-z0-9_]{1,40}$/

/* Maximo de nombres en el subtitulo de una etapa antes de resumir con "y N más". */
const MAXIMO_DE_NOMBRES_EN_SUBTITULO = 5

/**
 * Si el valor tiene la forma minima de un diseño: objeto con `etapas` objeto.
 *
 * @param {*} layout
 * @returns {boolean}
 */
export function es_diseno_valido(layout) {
	return !!layout
		&& typeof layout == 'object'
		&& !Array.isArray(layout)
		&& !!layout.etapas
		&& typeof layout.etapas == 'object'
		&& !Array.isArray(layout.etapas)
}

/**
 * El layout tal como vino: objeto, string JSON (defensivo, la API lo manda ya decodificado) o null.
 *
 * @param {*} layout
 * @returns {*}
 */
function parsear(layout) {
	if (typeof layout == 'string') {
		try {
			return JSON.parse(layout)
		} catch (e) {
			return null
		}
	}
	return layout
}

/**
 * Posicion de una key dentro de una lista de items, o -1.
 *
 * @param {Array} lista
 * @param {string} key
 * @returns {number}
 */
function indice_de_key(lista, key) {
	let indice = -1
	lista.forEach(function (item, i) {
		if (indice === -1 && item.key === key) {
			indice = i
		}
	})
	return indice
}

/**
 * Inserta un elemento que el diseño no nombra en su etapa por defecto: despues del predecesor mas
 * cercano (en el orden por defecto) que este en esa etapa; si no hay ninguno, antes del sucesor mas
 * cercano; si tampoco, al final.
 *
 * @param {Object} etapas etapas del diseño que se esta resolviendo (se muta)
 * @param {Object} el elemento del catalogo
 * @param {Object} predeterminado diseño predeterminado ya armado
 * @param {Object} vm
 * @returns {void}
 */
function insertar_en_su_lugar(etapas, el, predeterminado, vm) {
	let lista = etapas[el.etapa]

	/* Orden por defecto de la etapa, sin separadores */
	let orden = []
	predeterminado.etapas[el.etapa].forEach(function (item) {
		if (item.key !== KEY_SEPARADOR) {
			orden.push(item.key)
		}
	})

	let posicion = orden.indexOf(el.key)
	let insertar_en = null

	for (let p = posicion - 1; p >= 0 && insertar_en === null; p--) {
		let indice = indice_de_key(lista, orden[p])
		if (indice >= 0) {
			insertar_en = indice + 1
		}
	}

	for (let s = posicion + 1; s < orden.length && insertar_en === null; s++) {
		let indice = indice_de_key(lista, orden[s])
		if (indice >= 0) {
			insertar_en = indice
		}
	}

	if (insertar_en === null) {
		insertar_en = lista.length
	}

	lista.splice(insertar_en, 0, {
		key: el.key,
		cols: cols_por_defecto(el.key, vm),
	})
}

/**
 * Resuelve un diseño guardado contra el catalogo actual.
 *
 * - null, un string que no es JSON o algo sin `etapas` -> diseño predeterminado.
 * - Descarta keys desconocidas (elementos retirados) y repetidas (gana la primera).
 * - Acota `cols` a 1..12 (lo que no es numero toma el ancho por defecto del elemento).
 * - Filtra `sacados`: conocidos, no repetidos y NO obligatorios.
 * - Todo elemento del catalogo que no quedo ubicado ni sacado se inserta en su etapa por defecto.
 *
 * @param {Object|string|null} layout
 * @param {Object} vm componente de la SPA
 * @returns {{version: number, etapas: Object, sacados: Array}}
 */
export function resolver_diseno(layout, vm) {
	let predeterminado = diseno_predeterminado(vm)
	let base = parsear(layout)

	if (!es_diseno_valido(base)) {
		base = predeterminado
	}

	let etapas = {}
	let vistos = {}
	let ids_de_separadores = {}

	ETAPAS.forEach(function (etapa) {
		etapas[etapa] = []

		let items = Array.isArray(base.etapas[etapa]) ? base.etapas[etapa] : []

		items.forEach(function (item, indice) {
			if (!item || typeof item != 'object') {
				return
			}

			if (item.key === KEY_SEPARADOR) {
				/* Un separador sin id valido recibe uno estable (depende de la posicion, no del azar). */
				let id = (typeof item.id == 'string' && PATRON_ID_SEPARADOR.test(item.id))
					? item.id
					: etapa + '_separador_' + indice

				if (ids_de_separadores[id]) {
					return
				}
				ids_de_separadores[id] = true

				etapas[etapa].push({
					key: KEY_SEPARADOR,
					id: id,
					cols: 12,
				})
				return
			}

			if (!elemento(item.key) || vistos[item.key]) {
				return
			}
			vistos[item.key] = true

			etapas[etapa].push({
				key: item.key,
				cols: acotar_cols(item.cols, cols_por_defecto(item.key, vm)),
			})
		})
	})

	let sacados = []
	let sacados_del_json = Array.isArray(base.sacados) ? base.sacados : []

	sacados_del_json.forEach(function (key) {
		if (typeof key != 'string' || !elemento(key) || vistos[key] || es_obligatorio(key)) {
			return
		}
		vistos[key] = true
		sacados.push(key)
	})

	/* Elementos que el diseño no nombra: nuevos del catalogo, u obligatorios que estaban en sacados */
	ELEMENTOS.forEach(function (el) {
		if (vistos[el.key]) {
			return
		}
		vistos[el.key] = true
		insertar_en_su_lugar(etapas, el, predeterminado, vm)
	})

	return {
		version: VERSION_DEL_FORMATO,
		etapas: etapas,
		sacados: sacados,
	}
}

/**
 * Los items de una etapa que se dibujan: elementos disponibles para este negocio/usuario, y
 * separadores. Por defecto limpia los separadores que quedan al principio, al final o repetidos
 * (pasa cuando los elementos de alrededor no estan disponibles).
 *
 * @param {Object} resuelto salida de resolver_diseno()
 * @param {string} etapa
 * @param {Object} vm
 * @param {Object} [opciones]
 * @param {Function} [opciones.excluir] function(item) -> true para no dibujarlo (p. ej. tope de items)
 * @param {boolean} [opciones.limpiar_separadores=true]
 * @returns {Array}
 */
export function elementos_visibles(resuelto, etapa, vm, opciones) {
	let config = opciones || {}
	let items = (resuelto && resuelto.etapas && Array.isArray(resuelto.etapas[etapa])) ? resuelto.etapas[etapa] : []
	let visibles = []

	items.forEach(function (item) {
		if (item.key !== KEY_SEPARADOR && !esta_disponible(item.key, vm)) {
			return
		}
		if (typeof config.excluir == 'function' && config.excluir(item)) {
			return
		}
		visibles.push(item)
	})

	if (config.limpiar_separadores === false) {
		return visibles
	}

	let limpios = []

	visibles.forEach(function (item) {
		if (item.key === KEY_SEPARADOR) {
			if (!limpios.length || limpios[limpios.length - 1].key === KEY_SEPARADOR) {
				return
			}
		}
		limpios.push(item)
	})

	while (limpios.length && limpios[limpios.length - 1].key === KEY_SEPARADOR) {
		limpios.pop()
	}

	return limpios
}

/**
 * Si la etapa tiene al menos un elemento (no separador) para dibujar.
 *
 * @param {Object} resuelto
 * @param {string} etapa
 * @param {Object} vm
 * @returns {boolean}
 */
export function etapa_tiene_elementos(resuelto, etapa, vm) {
	let tiene = false
	elementos_visibles(resuelto, etapa, vm).forEach(function (item) {
		if (item.key !== KEY_SEPARADOR) {
			tiene = true
		}
	})
	return tiene
}

/**
 * Etapa en la que esta ubicada una key en un diseño resuelto, o null si esta sacada.
 *
 * @param {Object} resuelto
 * @param {string} key
 * @returns {string|null}
 */
export function etapa_de_elemento(resuelto, key) {
	let encontrada = null
	ETAPAS.forEach(function (etapa) {
		if (encontrada === null && resuelto && resuelto.etapas && indice_de_key(resuelto.etapas[etapa] || [], key) >= 0) {
			encontrada = etapa
		}
	})
	return encontrada
}

/**
 * Subtitulo de una etapa armado con los nombres cortos de sus elementos: "Sucursal, caja y fecha",
 * o "Facturación, método de pago, caja, sucursal, lista de precios y 4 más".
 *
 * @param {Array} items salida de elementos_visibles()
 * @returns {string}
 */
export function subtitulo_de_etapa(items) {
	let nombres = []

	items.forEach(function (item) {
		if (item.key === KEY_SEPARADOR) {
			return
		}
		let el = elemento(item.key)
		if (el) {
			nombres.push(el.nombre_corto)
		}
	})

	if (!nombres.length) {
		return ''
	}

	let texto = ''

	if (nombres.length === 1) {
		texto = nombres[0]
	} else if (nombres.length <= MAXIMO_DE_NOMBRES_EN_SUBTITULO) {
		texto = nombres.slice(0, nombres.length - 1).join(', ') + ' y ' + nombres[nombres.length - 1]
	} else {
		texto = nombres.slice(0, MAXIMO_DE_NOMBRES_EN_SUBTITULO).join(', ')
			+ ' y ' + (nombres.length - MAXIMO_DE_NOMBRES_EN_SUBTITULO) + ' más'
	}

	return texto.charAt(0).toUpperCase() + texto.slice(1)
}

/**
 * Id nuevo para un separador agregado desde el editor. Minusculas, numeros y guion bajo: cumple el
 * patron que valida el backend.
 *
 * @returns {string}
 */
export function nuevo_id_de_separador() {
	return 'separador_' + Date.now().toString(36) + Math.floor(Math.random() * 1296).toString(36)
}

/**
 * Deja un diseño listo para mandar a la API: solo {key, cols} (y el id de los separadores), sin
 * ninguna propiedad de interfaz que el editor le haya colgado a los items.
 *
 * @param {{etapas: Object, sacados: Array}} diseno
 * @returns {{version: number, etapas: Object, sacados: Array}}
 */
export function serializar_diseno(diseno) {
	let etapas = {}

	ETAPAS.forEach(function (etapa) {
		etapas[etapa] = []

		let items = (diseno && diseno.etapas && Array.isArray(diseno.etapas[etapa])) ? diseno.etapas[etapa] : []

		items.forEach(function (item) {
			if (!item || typeof item.key != 'string') {
				return
			}
			if (item.key === KEY_SEPARADOR) {
				etapas[etapa].push({
					key: KEY_SEPARADOR,
					id: (typeof item.id == 'string' && PATRON_ID_SEPARADOR.test(item.id)) ? item.id : nuevo_id_de_separador(),
					cols: 12,
				})
				return
			}
			etapas[etapa].push({
				key: item.key,
				cols: acotar_cols(item.cols, 12),
			})
		})
	})

	let sacados = []
	let sacados_del_diseno = (diseno && Array.isArray(diseno.sacados)) ? diseno.sacados : []

	sacados_del_diseno.forEach(function (key) {
		if (typeof key == 'string' && key !== KEY_SEPARADOR && sacados.indexOf(key) === -1) {
			sacados.push(key)
		}
	})

	return {
		version: VERSION_DEL_FORMATO,
		etapas: etapas,
		sacados: sacados,
	}
}

/**
 * De los diseños del negocio, el que esta en uso, o null.
 *
 * El backend garantiza uno solo, pero el store de otra pestaña puede quedar un instante con dos
 * (la notificacion del que se prendio llega antes que la del que se apago): gana el de
 * `updated_at` mas nuevo y, a igualdad, el de id mayor.
 *
 * @param {Array} modelos state.vender_layout.models
 * @returns {Object|null}
 */
export function diseno_en_uso(modelos) {
	if (!Array.isArray(modelos) || !modelos.length) {
		return null
	}

	let en_uso = modelos.filter(function (modelo) {
		return !!modelo && (modelo.en_uso === true || modelo.en_uso == 1)
	})

	if (!en_uso.length) {
		return null
	}

	en_uso.sort(function (a, b) {
		let fecha_a = String(a.updated_at || '')
		let fecha_b = String(b.updated_at || '')
		if (fecha_a !== fecha_b) {
			return fecha_a < fecha_b ? 1 : -1
		}
		return (Number(b.id) || 0) - (Number(a.id) || 0)
	})

	return en_uso[0]
}
