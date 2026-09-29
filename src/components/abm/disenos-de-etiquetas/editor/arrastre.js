/*
	Las cuentas de mover y redimensionar un campo en el lienzo, con imán y guias (mision
	disenos-etiquetas-gondola, 29/9/2026). Funciones puras: reciben mm y devuelven mm; el lienzo
	(LienzoDeEtiqueta.vue) pone los eventos del puntero y convierte pixeles a mm.

	Como ajusta (decision de Lucas: posicion libre con imán):

	1. Guias: si un borde o el centro del campo queda cerca (menos de ~6 px en pantalla) de un borde o
	   del centro de la etiqueta, o de un borde o del centro de otro campo, se pega ahi y se dibuja la
	   guia.
	2. Si no hay guia cerca, el movimiento va de a 1 mm justo (el imán de 1 mm).
	3. Siempre adentro de la etiqueta y nunca menos de 2 mm.

	Con la tecla Alt apretada no hay imán ni guias: se mueve de a 0,1 mm (para el ajuste fino).
*/
import { MINIMO_DEL_CAMPO_MM, redondear } from '../geometria'

/* Distancia (en pixeles de pantalla) a la que un borde se pega a una guia */
export const UMBRAL_DE_GUIA_PX = 6

/* Tolerancia para decir que dos medidas coinciden (mm) */
const TOLERANCIA_MM = 0.05

/**
 * Las lineas contra las que se alinea un campo: bordes y centro de la etiqueta, y bordes y centro
 * de cada uno de los otros campos.
 *
 * @param {Array} elementos
 * @param {string} excluir_id el campo que se esta moviendo (no se alinea contra si mismo)
 * @param {number} ancho mm de la etiqueta
 * @param {number} alto mm de la etiqueta
 * @returns {{verticales: Array, horizontales: Array}} posiciones en mm (x de las verticales, y de las horizontales)
 */
export function lineas_de_referencia(elementos, excluir_id, ancho, alto) {
	let verticales = [0, ancho / 2, ancho]
	let horizontales = [0, alto / 2, alto]

	elementos.forEach(function (elemento) {
		if (elemento.id === excluir_id) {
			return
		}
		verticales.push(elemento.x, elemento.x + elemento.w / 2, elemento.x + elemento.w)
		horizontales.push(elemento.y, elemento.y + elemento.h / 2, elemento.y + elemento.h)
	})

	return {
		verticales: verticales,
		horizontales: horizontales,
	}
}

/**
 * El ajuste mas chico que pega alguno de los puntos a alguna linea, dentro del umbral.
 *
 * @param {Array} puntos posiciones en mm (p. ej. borde izquierdo, centro y borde derecho)
 * @param {Array} lineas posiciones en mm
 * @param {number} umbral mm
 * @returns {number|null} cuanto hay que correr (mm), o null si ninguno esta cerca
 */
function mejor_ajuste(puntos, lineas, umbral) {
	let mejor = null

	puntos.forEach(function (punto) {
		lineas.forEach(function (linea) {
			let delta = linea - punto
			if (Math.abs(delta) <= umbral && (mejor === null || Math.abs(delta) < Math.abs(mejor))) {
				mejor = delta
			}
		})
	})

	return mejor
}

/**
 * Las lineas con las que coincide alguno de los puntos (para dibujar las guias).
 *
 * @param {Array} puntos mm
 * @param {Array} lineas mm
 * @returns {Array} mm, sin repetidos
 */
function coincidencias(puntos, lineas) {
	let resultado = []

	lineas.forEach(function (linea) {
		let coincide = puntos.some(function (punto) {
			return Math.abs(punto - linea) < TOLERANCIA_MM
		})
		let repetida = resultado.some(function (ya) {
			return Math.abs(ya - linea) < TOLERANCIA_MM
		})
		if (coincide && !repetida) {
			resultado.push(linea)
		}
	})

	return resultado
}

/**
 * Acota un numero a un rango.
 *
 * @param {number} valor
 * @param {number} minimo
 * @param {number} maximo
 * @returns {number}
 */
function entre(valor, minimo, maximo) {
	if (maximo < minimo) {
		return minimo
	}
	return Math.min(Math.max(valor, minimo), maximo)
}

/**
 * Nueva posicion de un campo que se arrastra.
 *
 * @param {Object} inicio el campo como estaba al agarrarlo {x, y, w, h}
 * @param {number} dx cuanto se movio el puntero en x (mm)
 * @param {number} dy cuanto se movio el puntero en y (mm)
 * @param {Object} opciones {lineas, umbral_mm, ancho, alto, con_iman}
 * @returns {{x: number, y: number, guias: {verticales: Array, horizontales: Array}}}
 */
export function calcular_movimiento(inicio, dx, dy, opciones) {
	let w = inicio.w
	let h = inicio.h
	let x
	let y

	if (opciones.con_iman) {
		let crudo_x = inicio.x + dx
		let crudo_y = inicio.y + dy
		let ajuste_x = mejor_ajuste([crudo_x, crudo_x + w / 2, crudo_x + w], opciones.lineas.verticales, opciones.umbral_mm)
		let ajuste_y = mejor_ajuste([crudo_y, crudo_y + h / 2, crudo_y + h], opciones.lineas.horizontales, opciones.umbral_mm)

		/* Sin guia cerca: de a 1 mm justo desde donde estaba */
		x = ajuste_x === null ? inicio.x + Math.round(dx) : crudo_x + ajuste_x
		y = ajuste_y === null ? inicio.y + Math.round(dy) : crudo_y + ajuste_y
	} else {
		x = inicio.x + dx
		y = inicio.y + dy
	}

	x = redondear(entre(x, 0, opciones.ancho - w))
	y = redondear(entre(y, 0, opciones.alto - h))

	return {
		x: x,
		y: y,
		guias: opciones.con_iman ? {
			verticales: coincidencias([x, x + w / 2, x + w], opciones.lineas.verticales),
			horizontales: coincidencias([y, y + h / 2, y + h], opciones.lineas.horizontales),
		} : { verticales: [], horizontales: [] },
	}
}

/**
 * Ajusta un borde que se esta tirando: a la guia mas cercana si hay una, si no de a 1 mm.
 *
 * @param {number} original donde estaba el borde al agarrarlo (mm)
 * @param {number} delta cuanto se movio el puntero (mm)
 * @param {Array} lineas mm
 * @param {Object} opciones {umbral_mm, con_iman}
 * @returns {number}
 */
function ajustar_borde(original, delta, lineas, opciones) {
	if (!opciones.con_iman) {
		return original + delta
	}
	let crudo = original + delta
	let ajuste = mejor_ajuste([crudo], lineas, opciones.umbral_mm)
	return ajuste === null ? original + Math.round(delta) : crudo + ajuste
}

/**
 * Nuevo rectangulo de un campo que se agranda o achica tirando de una manija.
 *
 * @param {Object} inicio el campo como estaba al agarrarlo {x, y, w, h}
 * @param {string} manija 'n' | 's' | 'e' | 'w' | 'ne' | 'nw' | 'se' | 'sw' (arriba, abajo, derecha, izquierda y esquinas)
 * @param {number} dx mm
 * @param {number} dy mm
 * @param {Object} opciones {lineas, umbral_mm, ancho, alto, con_iman}
 * @returns {{x: number, y: number, w: number, h: number, guias: {verticales: Array, horizontales: Array}}}
 */
export function calcular_redimension(inicio, manija, dx, dy, opciones) {
	let izquierda = inicio.x
	let derecha = inicio.x + inicio.w
	let arriba = inicio.y
	let abajo = inicio.y + inicio.h
	let bordes_x = []
	let bordes_y = []

	if (manija.indexOf('e') !== -1) {
		derecha = entre(ajustar_borde(derecha, dx, opciones.lineas.verticales, opciones), izquierda + MINIMO_DEL_CAMPO_MM, opciones.ancho)
		derecha = redondear(derecha)
		bordes_x.push(derecha)
	}
	if (manija.indexOf('w') !== -1) {
		izquierda = entre(ajustar_borde(izquierda, dx, opciones.lineas.verticales, opciones), 0, derecha - MINIMO_DEL_CAMPO_MM)
		izquierda = redondear(izquierda)
		bordes_x.push(izquierda)
	}
	if (manija.indexOf('s') !== -1) {
		abajo = entre(ajustar_borde(abajo, dy, opciones.lineas.horizontales, opciones), arriba + MINIMO_DEL_CAMPO_MM, opciones.alto)
		abajo = redondear(abajo)
		bordes_y.push(abajo)
	}
	if (manija.indexOf('n') !== -1) {
		arriba = entre(ajustar_borde(arriba, dy, opciones.lineas.horizontales, opciones), 0, abajo - MINIMO_DEL_CAMPO_MM)
		arriba = redondear(arriba)
		bordes_y.push(arriba)
	}

	return {
		x: izquierda,
		y: arriba,
		w: redondear(derecha - izquierda),
		h: redondear(abajo - arriba),
		guias: opciones.con_iman ? {
			verticales: coincidencias(bordes_x, opciones.lineas.verticales),
			horizontales: coincidencias(bordes_y, opciones.lineas.horizontales),
		} : { verticales: [], horizontales: [] },
	}
}

/**
 * Cursor del mouse para cada manija.
 *
 * @param {string} manija
 * @returns {string}
 */
export function cursor_de_manija(manija) {
	if (manija === 'n' || manija === 's') {
		return 'ns-resize'
	}
	if (manija === 'e' || manija === 'w') {
		return 'ew-resize'
	}
	if (manija === 'ne' || manija === 'sw') {
		return 'nesw-resize'
	}
	return 'nwse-resize'
}

/* Las ocho manijas, en el orden en que se dibujan (las esquinas arriba de los bordes) */
export const MANIJAS = ['n', 's', 'e', 'w', 'nw', 'ne', 'sw', 'se']
