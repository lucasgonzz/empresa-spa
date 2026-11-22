/*
	Resolucion de un "Diseño de Vender" (mision diseno-vender-configurable, 28/9/2026; formato v2 con
	secciones configurables en la mision vender-secciones-personalizables, 22/11/2026).

	Un diseño guardado (`vender_layouts.layout`) es un JSON que el backend NO interpreta: no conoce el
	catalogo de elementos, que vive en elementos.js. Lo interpreta este archivo, y lo usan las dos
	puntas de la SPA: Vender (para dibujar) y el editor del ABM (para editar).

	Formato (version 2; ver secciones.js para el detalle de cada parte):

		{
			version: 2,
			plantilla: 'agil',          // opcional: plantilla del sistema de la que viene
			etapas: {                   // campos de cada seccion (la clave es el id de la seccion)
				etapa_1: [ {key: 'metodo_de_pago', cols: 4}, {key: 'separador', id: 'separador_1', cols: 12} ],
				etapa_2: [ ... ],
				etapa_3: [ ... ],
				seccion_4: [ ... ],
			},
			sacados: ['combos'],
			secciones: { etapa_1: {titulo, descripcion, color, alto, alto_fijo, plegado}, ... },
			disposicion: [ {columnas: [ {ancho: 4, secciones: ['etapa_1']}, ... ]}, ... ],
		}

	Un diseño version 1 (sin `secciones` ni `disposicion`) se resuelve con la disposicion de siempre
	(una columna con las tres etapas) y los metadatos de fabrica: se ve igual que antes.

	`layout = null` (el "Diseño predeterminado" que siembra el seeder) significa "el diseño del sistema"
	(diseno_predeterminado.js), y `{version: 2, plantilla: 'agil'}` sin `etapas` el diseño agil
	(diseno_agil.js): los dos se arman en codigo.

	🔴 LA REGLA QUE NO SE PUEDE PERDER: resolver_diseno() SIEMPRE devuelve TODOS los elementos del
	catalogo, cada uno una sola vez, ubicado en una seccion o en `sacados`. Es lo que garantiza que un
	campo que se agregue a Vender en el futuro aparezca en los diseños ya guardados (se inserta al
	lado de su predecesor del orden por defecto) y que un obligatorio nunca quede afuera aunque el JSON
	lo diga (vuelve a su seccion; si esa seccion ya no esta en el diseño, a la seccion de respaldo, ver
	seccion_de_respaldo() en secciones.js). La disponibilidad (extension apagada, sin permiso) NO se
	aplica aca sino al dibujar, con elementos_visibles(): asi un elemento conserva su lugar mientras su
	extension esta apagada.
*/
import {
	ELEMENTOS,
	KEY_SEPARADOR,
	elemento,
	es_marcador,
	es_obligatorio,
	esta_disponible,
	cols_por_defecto,
	acotar_cols,
	mantiene_etapa_abierta,
	se_fuerza,
} from './elementos'
import diseno_predeterminado, { VERSION_DEL_FORMATO } from './diseno_predeterminado'
import diseno_agil from './diseno_agil'
import {
	PLANTILLAS,
	asegurar_seccion_fija,
	ancho_de_columna_de,
	disposicion_predeterminada,
	es_layout_de_plantilla,
	escalar_cols_a_columna,
	ids_en_orden,
	normalizar_disposicion,
	normalizar_meta_de_seccion,
	seccion_de_respaldo,
	titulo_por_defecto,
} from './secciones'

/*
	Mismo patron que valida el backend (VenderLayoutHelper::normalizar_layout) para el id de un
	marcador (separador o salto de fila).
*/
const PATRON_ID_MARCADOR = /^[a-z0-9_]{1,40}$/

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
 * Inserta un elemento que el diseño no nombra en su seccion: la que dice el catalogo si el diseño
 * la tiene; si no, la de respaldo (ver seccion_de_respaldo()). Va despues del predecesor mas
 * cercano (en el orden por defecto) que este en esa seccion; si no hay ninguno, antes del sucesor
 * mas cercano; si tampoco, al final. Su ancho es el por defecto, escalado al de la columna donde
 * vive la seccion (un campo de 4 en una columna de 4 queda de 12: el mismo ancho en pantalla).
 *
 * @param {Object} etapas campos por seccion del diseño que se esta resolviendo (se muta)
 * @param {Object} el elemento del catalogo
 * @param {Object} predeterminado diseño predeterminado ya armado
 * @param {Object} vm
 * @param {Array} disposicion disposicion del diseño (de ahi salen los ids y el ancho de la columna)
 * @returns {void}
 */
function insertar_en_su_lugar(etapas, el, predeterminado, vm, disposicion) {
	let destino = seccion_de_respaldo(el.etapa, ids_en_orden(disposicion))
	let lista = etapas[destino]

	/* Orden por defecto de la seccion de origen del campo, sin marcadores */
	let orden = []
	predeterminado.etapas[el.etapa].forEach(function (item) {
		if (!es_marcador(item.key)) {
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
		cols: escalar_cols_a_columna(cols_por_defecto(el.key, vm), ancho_de_columna_de(disposicion, destino)),
	})
}

/**
 * Resuelve un diseño guardado contra el catalogo actual.
 *
 * - null, un string que no es JSON o algo sin `etapas` -> diseño predeterminado; `{version: 2,
 *   plantilla: 'agil'}` sin `etapas` -> diseño agil.
 * - La disposicion se normaliza (ver normalizar_disposicion()): sin disposicion (un v1) es la de
 *   siempre; sin `etapa_2` se la agrega; hasta 6 secciones.
 * - Los metadatos de cada seccion se completan y acotan (normalizar_meta_de_seccion()).
 * - Descarta keys desconocidas (elementos retirados) y repetidas (gana la primera), y los campos
 *   de una seccion que no esta en la disposicion.
 * - Acota `cols` a 1..12 (lo que no es numero toma el ancho por defecto del elemento).
 * - Filtra `sacados`: conocidos, no repetidos y NO obligatorios.
 * - Todo elemento del catalogo que no quedo ubicado ni sacado se inserta en su seccion por
 *   defecto o, si el diseño ya no la tiene, en la de respaldo.
 *
 * @param {Object|string|null} layout
 * @param {Object} vm componente de la SPA
 * @returns {{version: number, plantilla: (string|undefined), etapas: Object, sacados: Array, secciones: Object, disposicion: Array}}
 */
export function resolver_diseno(layout, vm) {
	let predeterminado = diseno_predeterminado(vm)
	let base = parsear(layout)

	/* Plantilla de origen del diseño, si la tiene: sobrevive a editarlo y a "Restablecer" */
	let plantilla = null

	if (es_layout_de_plantilla(base)) {
		if (base && base.plantilla === 'agil') {
			base = diseno_agil(vm)
			plantilla = base.plantilla
		} else {
			base = predeterminado
		}
	} else if (!es_diseno_valido(base)) {
		base = predeterminado
	} else if (PLANTILLAS.indexOf(base.plantilla) !== -1) {
		plantilla = base.plantilla
	}

	/* Disposicion: la del diseño normalizada; sin ninguna (un v1) la de siempre */
	let disposicion = normalizar_disposicion(base.disposicion)
	if (!disposicion.length) {
		disposicion = disposicion_predeterminada()
	}
	disposicion = asegurar_seccion_fija(disposicion)

	let ids = ids_en_orden(disposicion)

	let etapas = {}
	let secciones = {}
	let vistos = {}
	let ids_de_marcadores = {}

	ids.forEach(function (etapa) {
		etapas[etapa] = []
		secciones[etapa] = normalizar_meta_de_seccion(etapa, base.secciones ? base.secciones[etapa] : null)

		let items = Array.isArray(base.etapas[etapa]) ? base.etapas[etapa] : []

		items.forEach(function (item, indice) {
			if (!item || typeof item != 'object') {
				return
			}

			if (es_marcador(item.key)) {
				/* Un marcador sin id valido recibe uno estable (depende de la posicion, no del azar). */
				let id = (typeof item.id == 'string' && PATRON_ID_MARCADOR.test(item.id))
					? item.id
					: etapa + '_' + item.key + '_' + indice

				if (ids_de_marcadores[id]) {
					return
				}
				ids_de_marcadores[id] = true

				etapas[etapa].push({
					key: item.key,
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
		insertar_en_su_lugar(etapas, el, predeterminado, vm, disposicion)
	})

	let resuelto = {
		version: VERSION_DEL_FORMATO,
		etapas: etapas,
		sacados: sacados,
		secciones: secciones,
		disposicion: disposicion,
	}

	/* La clave `plantilla` sólo existe si el diseño viene de una (así los demás resuelven idénticos) */
	if (plantilla !== null) {
		resuelto.plantilla = plantilla
	}

	return resuelto
}

/**
 * Los items de una etapa que se dibujan: elementos disponibles para este negocio/usuario, y
 * marcadores. Por defecto limpia los marcadores que quedan al principio, al final o pegados entre
 * si (pasa cuando los elementos de alrededor no estan disponibles). Entre un separador y un salto
 * de fila pegados queda el separador: la linea ya parte la fila, y es lo que el usuario puso a la
 * vista.
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
		if (!es_marcador(item.key) && !esta_disponible(item.key, vm)) {
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
		if (es_marcador(item.key)) {
			if (!limpios.length) {
				return
			}
			let anterior = limpios[limpios.length - 1]
			if (es_marcador(anterior.key)) {
				/* Dos marcadores pegados: queda uno solo, y si alguno es separador, el separador. */
				if (item.key === KEY_SEPARADOR && anterior.key !== KEY_SEPARADOR) {
					limpios[limpios.length - 1] = item
				}
				return
			}
		}
		limpios.push(item)
	})

	while (limpios.length && es_marcador(limpios[limpios.length - 1].key)) {
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
		if (!es_marcador(item.key)) {
			tiene = true
		}
	})
	return tiene
}

/**
 * Si la etapa no puede arrancar plegada ni plegarse sola: tiene a la vista un elemento que agrega
 * articulos o que lo pide (el resumen, con el total). Ver mantiene_etapa_abierta() en elementos.js.
 *
 * @param {Object} resuelto
 * @param {string} etapa
 * @param {Object} vm
 * @returns {boolean}
 */
export function etapa_se_mantiene_abierta(resuelto, etapa, vm) {
	let se_mantiene = false
	elementos_visibles(resuelto, etapa, vm).forEach(function (item) {
		if (!es_marcador(item.key) && mantiene_etapa_abierta(item.key)) {
			se_mantiene = true
		}
	})
	return se_mantiene
}

/**
 * Devuelve el diseño con los elementos FORZADOS vueltos a su lugar: los que el diseño saco pero
 * que, para este usuario, se tienen que dibujar igual (`se_fuerza_si` del catalogo; hoy solo la
 * cantidad, con "pedir la cantidad al vender" prendido). Se insertan en su seccion por defecto
 * (o la de respaldo), al lado de su predecesor, con su ancho por defecto.
 *
 * Es para dibujar Vender, NO para el editor: el editor tiene que mostrar el diseño tal como se
 * guardo (con la cantidad en la bandeja y el aviso de que igual aparece).
 *
 * No muta el que recibe; conserva sus secciones, su disposicion y su plantilla.
 *
 * @param {Object} resuelto salida de resolver_diseno()
 * @param {Object} vm
 * @returns {Object}
 */
export function aplicar_elementos_forzados(resuelto, vm) {
	if (!resuelto || !Array.isArray(resuelto.sacados) || !resuelto.sacados.length) {
		return resuelto
	}

	let forzados = resuelto.sacados.filter(function (key) {
		return se_fuerza(key, vm)
	})

	if (!forzados.length) {
		return resuelto
	}

	let etapas = {}
	Object.keys(resuelto.etapas).forEach(function (etapa) {
		etapas[etapa] = (resuelto.etapas[etapa] || []).slice()
	})

	let predeterminado = diseno_predeterminado(vm)

	forzados.forEach(function (key) {
		insertar_en_su_lugar(etapas, elemento(key), predeterminado, vm, resuelto.disposicion)
	})

	let con_forzados = {
		version: resuelto.version,
		etapas: etapas,
		sacados: resuelto.sacados.filter(function (key) {
			return forzados.indexOf(key) === -1
		}),
		secciones: resuelto.secciones,
		disposicion: resuelto.disposicion,
	}

	if (resuelto.plantilla) {
		con_forzados.plantilla = resuelto.plantilla
	}

	return con_forzados
}

/**
 * Seccion (id) en la que esta ubicada una key en un diseño resuelto, o null si esta sacada.
 *
 * @param {Object} resuelto
 * @param {string} key
 * @returns {string|null}
 */
export function etapa_de_elemento(resuelto, key) {
	let encontrada = null
	if (!resuelto || !resuelto.etapas) {
		return null
	}
	Object.keys(resuelto.etapas).forEach(function (etapa) {
		if (encontrada === null && indice_de_key(resuelto.etapas[etapa] || [], key) >= 0) {
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
		if (es_marcador(item.key)) {
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
 * Id nuevo para un marcador agregado desde el editor (separador o salto de fila). Minusculas,
 * numeros y guion bajo: cumple el patron que valida el backend (maximo 40 caracteres: el mas largo,
 * 'salto_de_fila_' + 10, da 24).
 *
 * @param {string} key KEY_SEPARADOR o KEY_SALTO_DE_FILA
 * @returns {string}
 */
export function nuevo_id_de_marcador(key) {
	return key + '_' + Date.now().toString(36) + Math.floor(Math.random() * 1296).toString(36)
}

/**
 * Id nuevo para un separador. Se conserva por compatibilidad con los que ya lo usan.
 *
 * @returns {string}
 */
export function nuevo_id_de_separador() {
	return nuevo_id_de_marcador(KEY_SEPARADOR)
}

/**
 * Deja un diseño listo para mandar a la API: solo {key, cols} (y el id de los separadores), sin
 * ninguna propiedad de interfaz que el editor le haya colgado a los items. Sale en formato v2:
 * `etapas` en el orden de lectura de la disposicion, `sacados`, `secciones` (con el titulo en
 * null si es el de fabrica) y `disposicion`, mas `plantilla` si el diseño viene de una.
 *
 * @param {{etapas: Object, sacados: Array, secciones: Object, disposicion: Array, plantilla: (string|undefined)}} diseno
 * @returns {{version: number, plantilla: (string|undefined), etapas: Object, sacados: Array, secciones: Object, disposicion: Array}}
 */
export function serializar_diseno(diseno) {
	let disposicion = normalizar_disposicion(diseno ? diseno.disposicion : null)
	if (!disposicion.length) {
		disposicion = disposicion_predeterminada()
	}
	disposicion = asegurar_seccion_fija(disposicion)

	let etapas = {}
	let secciones = {}

	ids_en_orden(disposicion).forEach(function (etapa) {
		etapas[etapa] = []

		let items = (diseno && diseno.etapas && Array.isArray(diseno.etapas[etapa])) ? diseno.etapas[etapa] : []

		items.forEach(function (item) {
			if (!item || typeof item.key != 'string') {
				return
			}
			if (es_marcador(item.key)) {
				etapas[etapa].push({
					key: item.key,
					id: (typeof item.id == 'string' && PATRON_ID_MARCADOR.test(item.id)) ? item.id : nuevo_id_de_marcador(item.key),
					cols: 12,
				})
				return
			}
			etapas[etapa].push({
				key: item.key,
				cols: acotar_cols(item.cols, 12),
			})
		})

		let meta = normalizar_meta_de_seccion(etapa, diseno && diseno.secciones ? diseno.secciones[etapa] : null)
		if (meta.titulo === titulo_por_defecto(etapa)) {
			/* El de fabrica no se congela: se guarda null y Vender usa el que corresponda */
			meta.titulo = null
		}
		secciones[etapa] = meta
	})

	let sacados = []
	let sacados_del_diseno = (diseno && Array.isArray(diseno.sacados)) ? diseno.sacados : []

	sacados_del_diseno.forEach(function (key) {
		if (typeof key == 'string' && !es_marcador(key) && sacados.indexOf(key) === -1) {
			sacados.push(key)
		}
	})

	let serializado = { version: VERSION_DEL_FORMATO }

	if (diseno && PLANTILLAS.indexOf(diseno.plantilla) !== -1) {
		serializado.plantilla = diseno.plantilla
	}

	serializado.etapas = etapas
	serializado.sacados = sacados
	serializado.secciones = secciones
	serializado.disposicion = disposicion

	return serializado
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
