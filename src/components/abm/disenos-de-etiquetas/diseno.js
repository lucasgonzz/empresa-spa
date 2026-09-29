/*
	Lectura, armado y serializacion del JSON `diseno` de una etiqueta de gondola (mision
	disenos-etiquetas-gondola, 29/9/2026). Contrato: plan de la mision, §3.3 (version 1).

	- normalizar_diseno(): lo que llega de la API (o lo que haya) -> un diseño completo y valido para
	  el editor. La API ya lo manda normalizado; esto es la red por si llega algo viejo o roto.
	- serializar_diseno(): el diseño del editor -> EXACTAMENTE las claves del contrato. Las claves
	  propias de cada tipo (price_type_id, rotulo, texto) viajan solo en los tipos que las usan.
	- nuevo_elemento(), siguiente_id(), lugar_libre(): lo que usa el editor para agregar campos.
*/
import {
	VERSION_DEL_DISENO,
	COLUMNAS_MINIMO,
	COLUMNAS_MAXIMO,
	FILAS_MINIMO,
	FILAS_MAXIMO,
	ALTO_MINIMO_MM,
	ALTO_MAXIMO_MM,
	TAMANO_MINIMO_PT,
	TAMANO_MAXIMO_PT,
	TOPE_DE_CAMPOS,
	acotar,
	redondear,
	ancho_de_etiqueta,
	filas_por_hoja,
	encerrar_en_la_etiqueta,
} from './geometria'
import { definicion, es_precio, LARGO_MAXIMO_DEL_TEXTO, TEXTO_LIBRE_SUGERIDO } from './catalogo'
import { diseno_actual } from './diseno_actual'

/* Formato valido de un id de campo (contrato) */
const PATRON_DEL_ID = /^[a-z0-9_]{1,40}$/

/* Alineaciones validas */
const ALINEACIONES = ['L', 'C', 'R']

/**
 * Si un valor cuenta como "si" (la API puede mandar 1/0 o true/false).
 *
 * @param {*} valor
 * @returns {boolean}
 */
function es_verdadero(valor) {
	return valor === true || valor === 1 || valor === '1' || valor === 'true'
}

/**
 * El siguiente id libre del tipo "eN" para un diseño.
 *
 * @param {Array} elementos
 * @returns {string}
 */
export function siguiente_id(elementos) {
	let mayor = 0
	elementos.forEach(function (elemento) {
		let coincidencia = /^e(\d+)$/.exec(String(elemento.id || ''))
		if (coincidencia) {
			let numero = Number(coincidencia[1])
			if (numero > mayor) {
				mayor = numero
			}
		}
	})
	return 'e' + (mayor + 1)
}

/**
 * Completa y acota un campo: toma los valores por defecto de su tipo para lo que falte.
 *
 * @param {Object} crudo
 * @param {number} ancho mm de la etiqueta
 * @param {number} alto mm de la etiqueta
 * @returns {Object|null} null si el tipo no esta en el catalogo
 */
function normalizar_elemento(crudo, ancho, alto) {
	let def = crudo ? definicion(crudo.tipo) : null

	if (!def) {
		return null
	}

	let elemento = {
		id: String(crudo.id || ''),
		tipo: def.tipo,
		x: acotar(crudo.x, 0, ancho, 0),
		y: acotar(crudo.y, 0, alto, 0),
		w: acotar(crudo.w, 0, ancho, def.w),
		h: acotar(crudo.h, 0, alto, def.h),
		tamano: Math.round(acotar(crudo.tamano, TAMANO_MINIMO_PT, TAMANO_MAXIMO_PT, def.tamano || 9)),
		negrita: typeof crudo.negrita == 'undefined' ? !!def.negrita : es_verdadero(crudo.negrita),
		saltos_de_linea: typeof crudo.saltos_de_linea == 'undefined' ? !!def.saltos_de_linea : es_verdadero(crudo.saltos_de_linea),
		alineacion: ALINEACIONES.indexOf(crudo.alineacion) !== -1 ? crudo.alineacion : (def.alineacion || 'L'),
	}

	if (def.es_precio) {
		elemento.rotulo = es_verdadero(crudo.rotulo)
	}
	if (def.tipo === 'precio_lista') {
		elemento.price_type_id = crudo.price_type_id ? Number(crudo.price_type_id) : null
	}
	if (def.tipo === 'texto_fijo') {
		elemento.texto = String(crudo.texto || '').slice(0, LARGO_MAXIMO_DEL_TEXTO)
	}

	return encerrar_en_la_etiqueta(elemento, ancho, alto)
}

/**
 * Convierte lo que haya guardado en un diseño completo y valido para el editor. Si no hay nada (o
 * no es un objeto), devuelve el diseño de siempre.
 *
 * @param {Object|string|null} crudo el `diseno` del modelo (la API lo manda como objeto)
 * @param {number|null} price_type_id lista para el precio si hay que caer al diseño de siempre
 * @returns {Object}
 */
export function normalizar_diseno(crudo, price_type_id) {
	let datos = crudo

	if (typeof datos == 'string') {
		try {
			datos = JSON.parse(datos)
		} catch (error) {
			datos = null
		}
	}

	if (!datos || typeof datos != 'object' || !Array.isArray(datos.elementos)) {
		return diseno_actual(price_type_id || null)
	}

	let columnas = Math.round(acotar(datos.columnas, COLUMNAS_MINIMO, COLUMNAS_MAXIMO, 3))
	let alto = redondear(acotar(datos.alto_mm, ALTO_MINIMO_MM, ALTO_MAXIMO_MM, 40))
	let ancho = ancho_de_etiqueta(columnas)

	let diseno = {
		version: VERSION_DEL_DISENO,
		columnas: columnas,
		filas: Math.round(acotar(datos.filas, FILAS_MINIMO, FILAS_MAXIMO, Math.min(FILAS_MAXIMO, filas_por_hoja(alto)))),
		alto_mm: alto,
		marco: typeof datos.marco == 'undefined' ? true : es_verdadero(datos.marco),
		elementos: [],
	}

	let ids_usados = {}

	datos.elementos.forEach(function (crudo_elemento) {
		if (diseno.elementos.length >= TOPE_DE_CAMPOS) {
			return
		}

		let elemento = normalizar_elemento(crudo_elemento, ancho, alto)

		if (!elemento) {
			return
		}

		/* id invalido o repetido: se regenera (mismo criterio que la API) */
		if (!PATRON_DEL_ID.test(elemento.id) || ids_usados[elemento.id]) {
			elemento.id = siguiente_id(diseno.elementos.concat(datos.elementos.filter(function (otro) {
				return otro && PATRON_DEL_ID.test(String(otro.id || ''))
			})))
		}

		ids_usados[elemento.id] = true
		diseno.elementos.push(elemento)
	})

	return diseno
}

/**
 * El diseño del editor, con exactamente las claves del contrato y los numeros redondeados.
 *
 * @param {Object} diseno
 * @returns {Object}
 */
export function serializar_diseno(diseno) {
	let elementos = []

	diseno.elementos.forEach(function (elemento) {
		let serializado = {
			id: elemento.id,
			tipo: elemento.tipo,
			x: redondear(elemento.x),
			y: redondear(elemento.y),
			w: redondear(elemento.w),
			h: redondear(elemento.h),
			tamano: Math.round(elemento.tamano),
			negrita: !!elemento.negrita,
			saltos_de_linea: !!elemento.saltos_de_linea,
			alineacion: elemento.alineacion,
		}

		if (es_precio(elemento.tipo)) {
			serializado.rotulo = !!elemento.rotulo
		}
		if (elemento.tipo === 'precio_lista') {
			serializado.price_type_id = elemento.price_type_id ? Number(elemento.price_type_id) : null
		}
		if (elemento.tipo === 'texto_fijo') {
			serializado.texto = String(elemento.texto || '').slice(0, LARGO_MAXIMO_DEL_TEXTO)
		}

		elementos.push(serializado)
	})

	return {
		version: VERSION_DEL_DISENO,
		columnas: diseno.columnas,
		filas: diseno.filas,
		alto_mm: redondear(diseno.alto_mm),
		marco: !!diseno.marco,
		elementos: elementos,
	}
}

/**
 * Una copia profunda de un diseño (el editor trabaja sobre una copia, nunca sobre el del store).
 *
 * @param {Object} diseno
 * @returns {Object}
 */
export function copiar_diseno(diseno) {
	return JSON.parse(JSON.stringify(diseno))
}

/**
 * Huella de un diseño para comparar (cambios sin guardar, deshacer).
 *
 * @param {Object} diseno
 * @returns {string}
 */
export function huella_del_diseno(diseno) {
	return JSON.stringify(serializar_diseno(diseno))
}

/**
 * Arma un campo nuevo de un tipo, con los valores por defecto del catalogo, achicado si no entra
 * en la etiqueta.
 *
 * @param {string} tipo
 * @param {Object} extras price_type_id para un precio de lista
 * @param {Array} elementos los campos que ya tiene el diseño (para el id)
 * @param {number} ancho mm de la etiqueta
 * @param {number} alto mm de la etiqueta
 * @returns {Object|null}
 */
export function nuevo_elemento(tipo, extras, elementos, ancho, alto) {
	let def = definicion(tipo)

	if (!def) {
		return null
	}

	let elemento = {
		id: siguiente_id(elementos),
		tipo: def.tipo,
		x: 0,
		y: 0,
		w: Math.min(def.w, ancho),
		h: Math.min(def.h, alto),
		tamano: def.tamano || 9,
		negrita: !!def.negrita,
		saltos_de_linea: !!def.saltos_de_linea,
		alineacion: def.alineacion || 'L',
	}

	if (def.es_precio) {
		elemento.rotulo = false
	}
	if (def.tipo === 'precio_lista') {
		elemento.price_type_id = extras && extras.price_type_id ? Number(extras.price_type_id) : null
	}
	if (def.tipo === 'texto_fijo') {
		elemento.texto = TEXTO_LIBRE_SUGERIDO
	}

	return encerrar_en_la_etiqueta(elemento, ancho, alto)
}

/**
 * Si dos rectangulos se pisan (tocarse el borde no cuenta).
 *
 * @param {Object} a {x, y, w, h}
 * @param {Object} b {x, y, w, h}
 * @returns {boolean}
 */
export function se_pisan(a, b) {
	return a.x < b.x + b.w - 0.05
		&& b.x < a.x + a.w - 0.05
		&& a.y < b.y + b.h - 0.05
		&& b.y < a.y + a.h - 0.05
}

/**
 * Busca un lugar libre de la etiqueta para un campo de w x h: prueba las esquinas que dejan los
 * otros campos (a la derecha y debajo de cada uno), de arriba hacia abajo y de izquierda a
 * derecha, y devuelve la primera donde entra sin pisar a nadie.
 *
 * @param {Array} elementos
 * @param {number} w mm
 * @param {number} h mm
 * @param {number} ancho mm de la etiqueta
 * @param {number} alto mm de la etiqueta
 * @returns {{x: number, y: number}|null} null si no hay lugar
 */
export function lugar_libre(elementos, w, h, ancho, alto) {
	let equis = [0]
	let yes = [0]

	elementos.forEach(function (elemento) {
		equis.push(redondear(elemento.x + elemento.w))
		yes.push(redondear(elemento.y + elemento.h))
	})

	equis.sort(function (a, b) { return a - b })
	yes.sort(function (a, b) { return a - b })

	for (let i = 0; i < yes.length; i++) {
		for (let j = 0; j < equis.length; j++) {
			let candidato = { x: equis[j], y: yes[i], w: w, h: h }

			if (candidato.x + w > ancho + 0.05 || candidato.y + h > alto + 0.05) {
				continue
			}

			let pisa = elementos.some(function (elemento) {
				return se_pisan(candidato, elemento)
			})

			if (!pisa) {
				return { x: candidato.x, y: candidato.y }
			}
		}
	}

	return null
}
