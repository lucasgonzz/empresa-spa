/*
	Lo que dibuja la miniatura de un Diseño de PDF (misión diseno-ticket-comandera, 9/10/2026; plan
	§7.1): el diseño "como se va a imprimir", en chico y decorativo, para la tarjeta del formulario
	del ABM (TarjetaDelPdf.vue) que abre el diseñador.

	Funciones puras (no tocan Vue ni la API), como estado_del_disenador.js: de un `page_layout` (o del
	`diseno_derivado` del catálogo, si el perfil imprime con el de siempre), de las columnas del perfil
	y de la hoja arman bloques simples -- cajas en la grilla de 12 con un renglón gris por campo,
	bloques fijos de ARCA y la tabla con sus columnas en proporción -- que Index.vue pinta con CSS.

	No hay texto en la miniatura: cada campo es una raya gris de un largo que sale de su key (siempre
	el mismo para el mismo campo, así dos diseños distintos se ven distintos y uno no "baila" al
	redibujarse).
*/
import {
	TIPO_CAJA,
	TIPO_SALTO_DE_FILA,
	TIPO_FIJO,
	KEY_TEXTO_LIBRE,
	FIJO_AFIP_RECEPTOR,
	FIJO_AFIP_PIE,
	ZONAS,
	leer_diseno,
	acotar_entero,
	estilo_efectivo,
	mapa_de_definiciones,
} from '../disenador-pdf/estado_del_disenador'
import { columnas_para_dibujar } from '../disenador-pdf/tabla_del_disenador'

/* Renglones que dibuja como mucho una caja: en chico, una caja de 20 campos sería una torre */
export const MAX_RENGLONES_POR_CAJA = 7

/* Tamaño (pt) desde el que un campo se dibuja con raya gruesa: el "alto doble" del ticket, 12 pt */
const TAMANO_GRANDE = 12

/* Largo de las rayas (% del ancho de la caja): entre el mínimo y el máximo, según la key */
const LARGO_MINIMO = 42
const LARGO_MAXIMO = 92

/* El tipo de campo que es una imagen (el logo del ticket, contrato §3.4): un cuadrado, no una raya */
const TIPO_IMAGEN = 'imagen'

/* Fijo del encabezado fiscal del ticket (contrato §3.5): solo existe en el catálogo de ticket */
const FIJO_AFIP_EMISOR = 'afip_emisor'

/*
	Las alineaciones del catálogo (DisenoDePaginaPdf::ALINEACIONES: izquierda, centro, derecha) con el
	nombre de la clase que las dibuja (miniatura-pdf__renglon--left | center | right). Lo que no está
	acá (un valor viejo ya en inglés, o nada) queda como venga, o a la izquierda.
*/
const CLASE_DE_ALINEACION = {
	izquierda: 'left',
	centro: 'center',
	derecha: 'right',
}

/* El estilo de caja que no lleva línea en un ticket ("Sin línea"); los otros dos la llevan (D7) */
const ESTILO_SIN_LINEA = 'ninguno'

/**
 * La clase de alineación de un renglón ('left' | 'center' | 'right').
 *
 * @param {*} alineacion la del estilo efectivo del campo
 * @returns {string}
 */
function clase_de_alineacion(alineacion) {
	if (CLASE_DE_ALINEACION[alineacion]) {
		return CLASE_DE_ALINEACION[alineacion]
	}
	return alineacion === 'center' || alineacion === 'right' ? alineacion : 'left'
}

/**
 * Un número estable a partir de un texto (para el largo de las rayas): el mismo texto da siempre lo
 * mismo.
 *
 * @param {string} texto
 * @returns {number}
 */
function numero_de(texto) {
	let numero = 0
	String(texto || '').split('').forEach(function (caracter) {
		numero = (numero * 31 + caracter.charCodeAt(0)) % 100003
	})
	return numero
}

/**
 * Largo (%) de la raya de un campo: estable por key (y por renglón, en las listas).
 *
 * @param {string} key
 * @param {number} renglon
 * @returns {number}
 */
export function largo_de_raya(key, renglon) {
	let rango = LARGO_MAXIMO - LARGO_MINIMO
	return LARGO_MINIMO + (numero_de(key + ':' + renglon) % (rango + 1))
}

/**
 * El diseño que se dibuja: el del perfil si tiene uno; si no, el `diseno_derivado` del catálogo (lo
 * que el perfil imprime con el PDF de siempre); si tampoco (el catálogo no llegó), null.
 *
 * @param {*} page_layout el del perfil (objeto, string JSON o null)
 * @param {Object|null} catalogo respuesta de page-layout-catalog
 * @returns {Object|null}
 */
export function diseno_para_dibujar(page_layout, catalogo) {
	let propio = leer_diseno(page_layout)
	if (propio) {
		return propio
	}
	return catalogo ? leer_diseno(catalogo.diseno_derivado) : null
}

/**
 * Cuántos renglones ocupa un campo en la miniatura: una lista o un texto largo, dos; un texto libre,
 * los que tenga escritos (hasta tres); el resto, uno.
 *
 * @param {Object} campo
 * @param {Object|null} definicion
 * @returns {number}
 */
function renglones_del_campo(campo, definicion) {
	if (campo.key === KEY_TEXTO_LIBRE) {
		let lineas = String(campo.texto || '').split('\n').length
		return acotar_entero(lineas, 1, 3, 1)
	}
	let tipo = definicion ? definicion.tipo : null
	if (tipo === 'lista' || tipo === 'texto_largo') {
		return 2
	}
	return 1
}

/**
 * Los renglones de una caja: uno por campo (o dos, o el logo), con su largo, si va en negrita o
 * grande y su alineación; como mucho MAX_RENGLONES_POR_CAJA.
 *
 * @param {Array} campos los de la caja
 * @param {Object} definiciones campos del catálogo por key ({} si no llegó)
 * @returns {Array<{clave: string, largo: number, negrita: boolean, grande: boolean, alineacion: string, imagen: boolean}>}
 */
function renglones_de_la_caja(campos, definiciones) {
	let renglones = []

	;(Array.isArray(campos) ? campos : []).forEach(function (campo, indice) {
		if (!campo || typeof campo.key != 'string' || renglones.length >= MAX_RENGLONES_POR_CAJA) {
			return
		}
		let definicion = definiciones[campo.key] || null
		let estilo = estilo_efectivo(campo, definicion)
		let es_imagen = !!(definicion && definicion.tipo === TIPO_IMAGEN)
		let cantidad = es_imagen ? 1 : renglones_del_campo(campo, definicion)

		for (let renglon = 0; renglon < cantidad && renglones.length < MAX_RENGLONES_POR_CAJA; renglon++) {
			renglones.push({
				clave: campo.key + ':' + indice + ':' + renglon,
				largo: largo_de_raya(campo.key, renglon),
				negrita: !!estilo.negrita,
				grande: Number(estilo.tamano) >= TAMANO_GRANDE,
				alineacion: es_imagen ? 'center' : clase_de_alineacion(estilo.alineacion),
				imagen: es_imagen,
			})
		}
	})

	return renglones
}

/**
 * Los renglones con que se dibuja un bloque fijo de ARCA (qué tiene adentro, en chico).
 *
 * @param {string} key
 * @returns {number}
 */
function renglones_de_fijo(key) {
	if (key === FIJO_AFIP_EMISOR) {
		return 4
	}
	if (key === FIJO_AFIP_RECEPTOR) {
		return 3
	}
	return 2
}

/**
 * Los bloques de una zona para dibujar, en orden: cajas (con su ancho en 12, su estilo, si tiene
 * título y sus renglones), saltos de fila (cortan la fila, no se ven) y bloques fijos de ARCA.
 *
 * @param {Array} items los de la zona (`superior` o `pie` del diseño)
 * @param {Object} definiciones campos del catálogo por key
 * @param {Array<string>} estilos estilos de caja válidos (limites.estilos_de_caja; [] si no llegó)
 * @param {boolean} rollo true en un ticket: los fijos van siempre a lo ancho (D8)
 * @returns {Array<Object>}
 */
export function bloques_de_la_zona(items, definiciones, estilos, rollo) {
	let bloques = []

	;(Array.isArray(items) ? items : []).forEach(function (item, indice) {
		if (!item || typeof item != 'object') {
			return
		}

		if (item.tipo === TIPO_CAJA) {
			let estilo = estilos.length && estilos.indexOf(item.estilo) === -1 ? estilos[0] : (item.estilo || 'borde')
			bloques.push({
				clave: 'caja:' + (item.id || indice),
				tipo: 'caja',
				cols: acotar_entero(item.cols, 1, 12, 12),
				estilo: estilo,
				/* En un rollo: "Con línea" (borde o gris) lleva la línea de guiones abajo; "Sin línea", no */
				con_linea: estilo !== ESTILO_SIN_LINEA,
				con_titulo: !!String(item.titulo || '').trim(),
				renglones: renglones_de_la_caja(item.campos, definiciones),
			})
			return
		}

		if (item.tipo === TIPO_SALTO_DE_FILA) {
			bloques.push({
				clave: 'salto:' + (item.id || indice),
				tipo: 'salto',
				cols: 12,
			})
			return
		}

		if (item.tipo === TIPO_FIJO) {
			let cols = !rollo && item.key === FIJO_AFIP_RECEPTOR ? acotar_entero(item.cols, 1, 12, 12) : 12
			bloques.push({
				clave: 'fijo:' + item.key,
				tipo: 'fijo',
				key: item.key,
				cols: cols,
				es_pie_de_arca: item.key === FIJO_AFIP_PIE,
				importes: item.key === FIJO_AFIP_PIE && item.importes !== false,
				renglones: renglones_de_fijo(item.key),
			})
		}
	})

	return bloques
}

/**
 * Todo lo que dibuja la miniatura, listo para el template.
 *
 * @param {Object} entrada
 * @param {*} entrada.page_layout el del perfil
 * @param {Array} entrada.pdf_column_options las del perfil (con pivot)
 * @param {Object|null} entrada.catalogo respuesta de page-layout-catalog (null si no llegó)
 * @param {number} entrada.util_mm ancho útil contra el que se convierten las columnas
 * @param {number} entrada.total medias columnas de la grilla de la tabla
 * @param {boolean} entrada.rollo si se dibuja un rollo de comandera
 * @returns {{superior: Array, pie: Array, columnas: Array, con_diseno: boolean}}
 */
export function armar_miniatura(entrada) {
	let catalogo = entrada.catalogo || null
	let diseno = diseno_para_dibujar(entrada.page_layout, catalogo)
	let definiciones = catalogo ? mapa_de_definiciones(catalogo.campos) : {}
	let estilos = catalogo && catalogo.limites && Array.isArray(catalogo.limites.estilos_de_caja) ? catalogo.limites.estilos_de_caja : []
	let resultado = {
		superior: [],
		pie: [],
		columnas: columnas_para_dibujar(entrada.pdf_column_options, entrada.util_mm, entrada.total),
		con_diseno: !!diseno,
	}

	ZONAS.forEach(function (zona) {
		resultado[zona] = bloques_de_la_zona(diseno ? diseno[zona] : [], definiciones, estilos, !!entrada.rollo)
	})

	return resultado
}
