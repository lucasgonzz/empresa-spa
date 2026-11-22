/*
	Operaciones del editor de Diseños de Vender sobre las SECCIONES (misión
	vender-secciones-personalizables, 22/11/2026): agregar, quitar, ponerlas en columnas o en filas,
	cambiar el ancho de una columna y el alto de una sección.

	Son funciones puras en el sentido de que no tocan Vue ni la API: todas MUTAN el estado de trabajo
	que reciben (ver estado_del_editor.js) y devuelven `{ok, motivo, ...}`:

	- `ok` si la operación se hizo; si no, `motivo` dice por qué en lenguaje de usuario (el editor lo
	  muestra como aviso o como motivo de un botón deshabilitado) y el estado queda como estaba;
	- `estado` es el mismo estado que se recibió (para encadenar);
	- cada operación suma lo suyo (`id`, `obligatorios`...).

	El editor las llama sobre su estado y después vuelve a asignar los contenedores al componente,
	para que Vue vea las claves nuevas (`etapas.seccion_4`...).
*/
import { elemento, es_marcador, es_obligatorio, cols_por_defecto } from '@/components/vender/layout/elementos'
import {
	ANCHO_MINIMO_DE_COLUMNA,
	COLORES,
	MAXIMO_DE_BANDAS,
	MAXIMO_DE_COLUMNAS,
	MAXIMO_DE_SECCIONES,
	SECCION_FIJA,
	acotar_alto,
	ajustar_anchos_de_banda,
	ids_en_orden,
	meta_por_defecto,
	nuevo_id_de_seccion,
	seccion_de_respaldo,
} from '@/components/vender/layout/secciones'
import { identidad } from './estado_del_editor'

/* Motivos que se muestran al usuario. */
export const MOTIVO_MAXIMO_DE_SECCIONES = 'Ya hay ' + MAXIMO_DE_SECCIONES + ' secciones, el máximo.'
export const MOTIVO_SECCION_FIJA = 'Lleva la tabla de artículos: no se puede quitar.'

/**
 * Arma el resultado de una operación que no se pudo hacer.
 *
 * @param {Object} estado
 * @param {string} motivo
 * @param {Object} [extra] más propiedades para el resultado
 * @returns {Object}
 */
function rechazo(estado, motivo, extra) {
	return Object.assign({ ok: false, motivo: motivo, estado: estado }, extra || {})
}

/**
 * Arma el resultado de una operación hecha.
 *
 * @param {Object} estado
 * @param {Object} [extra] más propiedades para el resultado
 * @returns {Object}
 */
function exito(estado, extra) {
	return Object.assign({ ok: true, motivo: null, estado: estado }, extra || {})
}

/**
 * Dónde está una sección en la disposición.
 *
 * @param {Array} disposicion
 * @param {string} id
 * @returns {{banda: number, columna: number, posicion: number}|null}
 */
export function ubicacion_de_seccion(disposicion, id) {
	let encontrada = null

	disposicion.forEach(function (banda, b) {
		banda.columnas.forEach(function (columna, c) {
			let posicion = columna.secciones.indexOf(id)
			if (posicion !== -1) {
				encontrada = { banda: b, columna: c, posicion: posicion }
			}
		})
	})

	return encontrada
}

/**
 * Deja la disposición prolija: saca las columnas sin secciones (su ancho pasa a la vecina de la
 * derecha, o a la de la izquierda si era la última), saca las bandas sin columnas y rehace los
 * anchos de cada banda para que sumen 12. Es lo que el editor llama después de cada arrastre de
 * secciones. Mutación en el lugar de `estado.disposicion` (conserva el mismo arreglo).
 *
 * @param {Object} estado estado de trabajo
 * @returns {Object} el mismo estado
 */
export function limpiar_disposicion(estado) {
	let limpia = []

	estado.disposicion.forEach(function (banda) {
		let columnas = banda.columnas.slice()
		let indice = 0

		while (indice < columnas.length) {
			if (columnas[indice].secciones.length) {
				indice++
				continue
			}
			let vecina = indice < columnas.length - 1 ? columnas[indice + 1] : columnas[indice - 1]
			if (vecina) {
				vecina.ancho += columnas[indice].ancho
			}
			columnas.splice(indice, 1)
		}

		if (!columnas.length) {
			return
		}

		let anchos = []
		columnas.forEach(function (columna) {
			anchos.push(columna.ancho)
		})
		let ajustados = ajustar_anchos_de_banda(anchos)
		columnas.forEach(function (columna, i) {
			columna.ancho = ajustados[i]
		})

		limpia.push({ columnas: columnas })
	})

	estado.disposicion.splice(0, estado.disposicion.length)
	limpia.forEach(function (banda) {
		estado.disposicion.push(banda)
	})

	return estado
}

/**
 * Agrega una sección nueva y vacía en una banda nueva al final, con una columna de 12.
 *
 * Título "Sección nueva", color el primero de la paleta que ninguna sección use todavía (violeta si
 * están todos), alto 4 automático, sin plegar. Hasta 6 secciones.
 *
 * @param {Object} estado estado de trabajo
 * @param {Object} [vm] no se usa hoy (la firma es la del resto de las operaciones)
 * @returns {{ok: boolean, motivo: (string|null), estado: Object, id: string}}
 */
export function agregar_seccion(estado, vm) { // eslint-disable-line no-unused-vars
	let ids = ids_en_orden(estado.disposicion)
	let id = nuevo_id_de_seccion(ids)

	if (ids.length >= MAXIMO_DE_SECCIONES || id === null) {
		return rechazo(estado, MOTIVO_MAXIMO_DE_SECCIONES)
	}

	if (estado.disposicion.length >= MAXIMO_DE_BANDAS) {
		return rechazo(estado, 'Ya hay ' + MAXIMO_DE_BANDAS + ' filas de secciones, el máximo.')
	}

	/* Colores en uso: el primero de la paleta que nadie tiene */
	let usados = {}
	ids.forEach(function (existente) {
		if (estado.secciones[existente]) {
			usados[estado.secciones[existente].color] = true
		}
	})
	let color = 'violeta'
	let elegido = false
	COLORES.forEach(function (candidato) {
		if (!elegido && !usados[candidato]) {
			color = candidato
			elegido = true
		}
	})

	let meta = meta_por_defecto(id)
	meta.color = color

	estado.etapas[id] = []
	estado.ocultos[id] = []
	estado.orden_original[id] = []
	estado.secciones[id] = meta
	estado.disposicion.push({ columnas: [{ ancho: 12, secciones: [id] }] })

	return exito(estado, { id: id })
}

/**
 * Los obligatorios que una sección tiene A LA VISTA (los que bloquean que se la quite), en el orden
 * en que están en la sección.
 *
 * @param {Object} estado
 * @param {string} id
 * @returns {Array<string>} keys
 */
export function obligatorios_de_seccion(estado, id) {
	let keys = []
	;(estado.etapas[id] || []).forEach(function (item) {
		if (!es_marcador(item.key) && es_obligatorio(item.key)) {
			keys.push(item.key)
		}
	})
	return keys
}

/**
 * Si una sección se puede quitar, sin tocar nada (lo usa el botón "Quitar sección" del editor
 * para deshabilitarse con el motivo).
 *
 * @param {Object} estado estado de trabajo
 * @param {string} id
 * @returns {{ok: boolean, motivo: (string|null), estado: Object, obligatorios: (Array<string>|undefined)}}
 */
export function puede_quitar_seccion(estado, id) {
	if (id === SECCION_FIJA) {
		return rechazo(estado, MOTIVO_SECCION_FIJA)
	}

	if (!ubicacion_de_seccion(estado.disposicion, id)) {
		return rechazo(estado, 'Esa sección no existe.')
	}

	let obligatorios = obligatorios_de_seccion(estado, id)

	if (obligatorios.length) {
		let nombres = []
		obligatorios.forEach(function (key) {
			nombres.push(elemento(key).nombre)
		})
		let lista = nombres.length === 1
			? nombres[0]
			: nombres.slice(0, nombres.length - 1).join(', ') + ' y ' + nombres[nombres.length - 1]
		return rechazo(estado, 'Mové primero ' + lista + ' a otra sección.', { obligatorios: obligatorios })
	}

	return exito(estado)
}

/**
 * Quita una sección.
 *
 * - `etapa_2` no se quita (lleva la tabla de artículos).
 * - Si tiene obligatorios a la vista no se quita: hay que moverlos antes a otra sección. El
 *   resultado trae `obligatorios` (las keys) y el motivo los nombra.
 * - Si no: los opcionales visibles van al principio de la bandeja de sacados (como la ✕ de un
 *   campo), los marcadores se descartan y lo que el negocio no puede ver (campos ocultos) se
 *   reubica: los opcionales a los sacados ocultos y los obligatorios a la sección de respaldo
 *   (ver seccion_de_respaldo()), así el día que se prende la extensión no reaparecen en otro lado.
 * - Se borra de la disposición, de los campos, de los metadatos y de los ocultos; la columna o la
 *   banda que queda vacía se saca y su ancho pasa a la vecina.
 *
 * @param {Object} estado estado de trabajo
 * @param {string} id sección a quitar
 * @param {Object} vm componente de la SPA (para el ancho por defecto de lo que va a la bandeja)
 * @returns {{ok: boolean, motivo: (string|null), estado: Object, obligatorios: (Array<string>|undefined)}}
 */
export function quitar_seccion(estado, id, vm) {
	let verificacion = puede_quitar_seccion(estado, id)

	if (!verificacion.ok) {
		return verificacion
	}

	let restantes = ids_en_orden(estado.disposicion).filter(function (otra) {
		return otra !== id
	})

	/* Opcionales visibles: al principio de la bandeja, en el orden que tenían en la sección */
	let a_la_bandeja = []
	;(estado.etapas[id] || []).forEach(function (item) {
		if (!es_marcador(item.key)) {
			a_la_bandeja.push({ key: item.key, cols: cols_por_defecto(item.key, vm) })
		}
	})
	estado.sacados.splice.apply(estado.sacados, [0, 0].concat(a_la_bandeja))

	/* Ocultos: los opcionales a los sacados ocultos, los obligatorios a la sección de respaldo */
	;(estado.ocultos[id] || []).forEach(function (oculto) {
		let item = oculto.item

		if (es_marcador(item.key)) {
			return
		}

		if (es_obligatorio(item.key)) {
			let el = elemento(item.key)
			let destino = seccion_de_respaldo(el ? el.etapa : id, restantes)
			estado.orden_original[destino] = estado.orden_original[destino] || []
			estado.orden_original[destino].push(identidad(item))
			estado.ocultos[destino] = estado.ocultos[destino] || []
			estado.ocultos[destino].push({
				item: { key: item.key, cols: item.cols },
				indice: estado.orden_original[destino].length - 1,
			})
			return
		}

		estado.orden_original.sacados = estado.orden_original.sacados || []
		estado.orden_original.sacados.push(item.key)
		estado.sacados_ocultos.push({
			key: item.key,
			indice: estado.orden_original.sacados.length - 1,
		})
	})

	delete estado.etapas[id]
	delete estado.ocultos[id]
	delete estado.orden_original[id]
	delete estado.secciones[id]

	estado.disposicion.forEach(function (banda) {
		banda.columnas.forEach(function (columna) {
			let posicion = columna.secciones.indexOf(id)
			if (posicion !== -1) {
				columna.secciones.splice(posicion, 1)
			}
		})
	})
	limpiar_disposicion(estado)

	return exito(estado)
}

/**
 * Si una sección se puede pasar a una columna nueva, sin tocar nada (ver mover_a_columna_nueva()).
 *
 * @param {Object} estado estado de trabajo
 * @param {string} id
 * @returns {{ok: boolean, motivo: (string|null), estado: Object}}
 */
export function puede_mover_a_columna_nueva(estado, id) {
	let lugar = ubicacion_de_seccion(estado.disposicion, id)

	if (!lugar) {
		return rechazo(estado, 'Esa sección no existe.')
	}

	let banda = estado.disposicion[lugar.banda]
	let columna = banda.columnas[lugar.columna]

	if (columna.secciones.length < 2) {
		return rechazo(estado, 'Ya está sola en su columna.')
	}

	if (columna.ancho < ANCHO_MINIMO_DE_COLUMNA * 2) {
		return rechazo(estado, 'La columna es muy angosta para partirla.')
	}

	if (banda.columnas.length >= MAXIMO_DE_COLUMNAS) {
		return rechazo(estado, 'La fila ya tiene ' + MAXIMO_DE_COLUMNAS + ' columnas.')
	}

	return exito(estado)
}

/**
 * Parte la columna de una sección: la sección pasa a una columna nueva a su derecha, con la mitad
 * del ancho (floor(ancho / 2); la original queda con el resto).
 *
 * Se rechaza si la sección está SOLA en su columna (no hay nada que partir: para separarla se
 * cambia el ancho de su columna o se la baja a una fila nueva, decisión del 22/11/2026), si la
 * columna es muy angosta para partirla (menos de 6) o si la fila ya tiene 4 columnas.
 *
 * @param {Object} estado estado de trabajo
 * @param {string} id
 * @returns {{ok: boolean, motivo: (string|null), estado: Object}}
 */
export function mover_a_columna_nueva(estado, id) {
	let verificacion = puede_mover_a_columna_nueva(estado, id)

	if (!verificacion.ok) {
		return verificacion
	}

	let lugar = ubicacion_de_seccion(estado.disposicion, id)
	let banda = estado.disposicion[lugar.banda]
	let columna = banda.columnas[lugar.columna]
	let ancho_nuevo = Math.floor(columna.ancho / 2)

	columna.secciones.splice(lugar.posicion, 1)
	columna.ancho -= ancho_nuevo
	banda.columnas.splice(lugar.columna + 1, 0, { ancho: ancho_nuevo, secciones: [id] })

	return exito(estado)
}

/**
 * Si una sección se puede bajar a una fila nueva, sin tocar nada (ver mover_a_banda_nueva()).
 *
 * @param {Object} estado estado de trabajo
 * @param {string} id
 * @returns {{ok: boolean, motivo: (string|null), estado: Object}}
 */
export function puede_mover_a_banda_nueva(estado, id) {
	let lugar = ubicacion_de_seccion(estado.disposicion, id)

	if (!lugar) {
		return rechazo(estado, 'Esa sección no existe.')
	}

	let banda = estado.disposicion[lugar.banda]

	if (banda.columnas.length === 1 && banda.columnas[0].secciones.length === 1) {
		return rechazo(estado, 'Ya está sola en su fila.')
	}

	if (estado.disposicion.length >= MAXIMO_DE_BANDAS) {
		return rechazo(estado, 'Ya hay ' + MAXIMO_DE_BANDAS + ' filas de secciones, el máximo.')
	}

	return exito(estado)
}

/**
 * Baja una sección a una fila nueva (una banda debajo de la suya, con una columna de 12). La
 * columna que deja vacía se saca y su ancho pasa a la vecina.
 *
 * Se rechaza si ya está sola en su fila o si ya hay 6 filas.
 *
 * @param {Object} estado estado de trabajo
 * @param {string} id
 * @returns {{ok: boolean, motivo: (string|null), estado: Object}}
 */
export function mover_a_banda_nueva(estado, id) {
	let verificacion = puede_mover_a_banda_nueva(estado, id)

	if (!verificacion.ok) {
		return verificacion
	}

	let lugar = ubicacion_de_seccion(estado.disposicion, id)
	let banda = estado.disposicion[lugar.banda]

	banda.columnas[lugar.columna].secciones.splice(lugar.posicion, 1)
	estado.disposicion.splice(lugar.banda + 1, 0, { columnas: [{ ancho: 12, secciones: [id] }] })
	limpiar_disposicion(estado)

	return exito(estado)
}

/**
 * Cambia el ancho de una columna traspasándole (o quitándole) `delta` doceavos a su vecina: la de
 * la derecha, o la de la izquierda si es la última. Ninguna baja de 3 y la suma queda en 12. Un
 * delta que pasa del tope se recorta al máximo posible.
 *
 * @param {Object} estado estado de trabajo
 * @param {number} banda índice de la banda
 * @param {number} columna índice de la columna dentro de la banda
 * @param {number} delta doceavos a sumar (negativo para achicar)
 * @returns {{ok: boolean, motivo: (string|null), estado: Object}}
 */
export function cambiar_ancho_de_columna(estado, banda, columna, delta) {
	let fila = estado.disposicion[banda]

	if (!fila || !fila.columnas[columna]) {
		return rechazo(estado, 'Esa columna no existe.')
	}

	if (fila.columnas.length < 2) {
		return rechazo(estado, 'Una fila con una sola columna ocupa todo el ancho.')
	}

	let propia = fila.columnas[columna]
	let vecina = columna < fila.columnas.length - 1 ? fila.columnas[columna + 1] : fila.columnas[columna - 1]

	let nuevo = Math.round(propia.ancho + (parseInt(delta, 10) || 0))
	nuevo = Math.max(ANCHO_MINIMO_DE_COLUMNA, Math.min(propia.ancho + vecina.ancho - ANCHO_MINIMO_DE_COLUMNA, nuevo))

	if (nuevo === propia.ancho) {
		return rechazo(estado, 'La columna no puede ser ni más ancha ni más angosta: cada una mide al menos ' + ANCHO_MINIMO_DE_COLUMNA + '/12.')
	}

	vecina.ancho += propia.ancho - nuevo
	propia.ancho = nuevo

	return exito(estado)
}

/**
 * Cambia el alto de una sección (doceavos del alto de Vender, de 1 a 12; lo que se pasa se acota).
 *
 * @param {Object} estado estado de trabajo
 * @param {string} id
 * @param {number} alto
 * @returns {{ok: boolean, motivo: (string|null), estado: Object}}
 */
export function cambiar_alto(estado, id, alto) {
	if (!estado.secciones[id]) {
		return rechazo(estado, 'Esa sección no existe.')
	}

	estado.secciones[id].alto = acotar_alto(alto)

	return exito(estado)
}

/**
 * Pasa una sección de alto automático a fijo o al revés. Una sección fija no se pliega: su
 * `plegado` queda en 'no' (dejaría un hueco en su columna).
 *
 * @param {Object} estado estado de trabajo
 * @param {string} id
 * @param {boolean} fijo
 * @returns {{ok: boolean, motivo: (string|null), estado: Object}}
 */
export function cambiar_alto_fijo(estado, id, fijo) {
	if (!estado.secciones[id]) {
		return rechazo(estado, 'Esa sección no existe.')
	}

	estado.secciones[id].alto_fijo = !!fijo

	if (fijo) {
		estado.secciones[id].plegado = 'no'
	}

	return exito(estado)
}
