/*
	Geometria de las etiquetas de gondola (mision disenos-etiquetas-gondola, 29/9/2026).

	Espejo de las formulas del contrato (plan de la mision, §3.3). La API es la que imprime y la que
	normaliza lo que se guarda; el editor usa estas mismas cuentas para que lo que se ve en el lienzo
	sea lo que sale en el PDF:

	- Hoja A4 vertical (210 x 297 mm) con margen de 5 mm en los cuatro lados: 200 x 287 mm utiles.
	- Ancho de la etiqueta = (210 - 10) / columnas, redondeado a un decimal (66,7 con 3 por fila).
	- Filas que usa el PDF = floor((297 - 10) / alto_mm), minimo 1.
	- Alto sugerido al elegir filas = floor(((297 - 10) / filas) * 10) / 10.
	- Todas las medidas del diseño van en mm con un decimal; los tamaños de letra en puntos (pt).

	🔴 Si cambia una formula aca, cambia en ArticleTicketDesignHelper de empresa-api: son la misma.
*/

/* Hoja A4 vertical, en mm */
export const ANCHO_HOJA_MM = 210
export const ALTO_HOJA_MM = 297

/* Margen de la hoja en los cuatro lados, en mm */
export const MARGEN_MM = 5

/* Lo que queda util de la hoja, en mm */
export const ANCHO_UTIL_MM = ANCHO_HOJA_MM - MARGEN_MM * 2
export const ALTO_UTIL_MM = ALTO_HOJA_MM - MARGEN_MM * 2

/* Un punto tipografico en mm (1 pt = 1/72 de pulgada = 0,3528 mm) */
export const PT_A_MM = 0.3528

/* Alto de un renglon con saltos de linea, en relacion al tamaño de la letra (contrato §3.5) */
export const INTERLINEADO = 1.15

/*
	Margen interno de las celdas de FPDF (cMargin): 1 mm a la izquierda y a la derecha del texto.
	Es el default de FPDF con la unidad en mm, y el PDF de hoy lo usa sin tocarlo. El lienzo lo
	imita para que el texto "respire" igual que en el papel.
*/
export const MARGEN_DE_CELDA_MM = 1

/* Rangos del contrato */
export const COLUMNAS_MINIMO = 1
export const COLUMNAS_MAXIMO = 4
export const FILAS_MINIMO = 1
export const FILAS_MAXIMO = 20
export const ALTO_MINIMO_MM = 10
export const ALTO_MAXIMO_MM = 287
export const TAMANO_MINIMO_PT = 5
export const TAMANO_MAXIMO_PT = 120

/* Lo mas chico que puede quedar un campo, en mm (contrato: w, h >= 2) */
export const MINIMO_DEL_CAMPO_MM = 2

/* Tope de campos por etiqueta (contrato: 40 elementos) */
export const TOPE_DE_CAMPOS = 40

/* Version del JSON `diseno` */
export const VERSION_DEL_DISENO = 1

/**
 * Redondea a un decimal (las medidas del diseño viajan con un decimal).
 *
 * @param {number} numero
 * @returns {number}
 */
export function redondear(numero) {
	return Math.round(Number(numero) * 10) / 10
}

/**
 * Acota un numero a un rango. Si no es un numero, devuelve el respaldo.
 *
 * @param {*} valor
 * @param {number} minimo
 * @param {number} maximo
 * @param {number} respaldo
 * @returns {number}
 */
export function acotar(valor, minimo, maximo, respaldo) {
	let numero = Number(valor)
	if (valor === null || valor === '' || typeof valor == 'undefined' || isNaN(numero)) {
		return respaldo
	}
	if (numero < minimo) {
		return minimo
	}
	if (numero > maximo) {
		return maximo
	}
	return numero
}

/**
 * Ancho de una etiqueta segun cuantas van a lo ancho de la hoja.
 *
 * @param {number} columnas 1..4
 * @returns {number} mm, con un decimal
 */
export function ancho_de_etiqueta(columnas) {
	let columnas_acotadas = Math.round(acotar(columnas, COLUMNAS_MINIMO, COLUMNAS_MAXIMO, 3))
	return redondear(ANCHO_UTIL_MM / columnas_acotadas)
}

/**
 * Cuantas filas de etiquetas entran a lo alto de la hoja con ese alto (lo que usa el PDF).
 *
 * @param {number} alto_mm
 * @returns {number} minimo 1
 */
export function filas_por_hoja(alto_mm) {
	let alto = acotar(alto_mm, ALTO_MINIMO_MM, ALTO_MAXIMO_MM, 40)
	/* El epsilon evita que 287 / 41 de 6,9999 por la coma flotante */
	let filas = Math.floor(ALTO_UTIL_MM / alto + 1e-9)
	return filas < 1 ? 1 : filas
}

/**
 * Alto sugerido para que entren tantas filas por hoja (al elegir "Filas por hoja" en el editor).
 *
 * @param {number} filas 1..20
 * @returns {number} mm, con un decimal (truncado, asi seguro entran)
 */
export function alto_sugerido(filas) {
	let filas_acotadas = Math.round(acotar(filas, FILAS_MINIMO, FILAS_MAXIMO, 7))
	let alto = Math.floor((ALTO_UTIL_MM / filas_acotadas) * 10 + 1e-9) / 10
	return acotar(alto, ALTO_MINIMO_MM, ALTO_MAXIMO_MM, 40)
}

/**
 * Pasa un tamaño de letra en pt a mm.
 *
 * @param {number} tamano_pt
 * @returns {number}
 */
export function pt_a_mm(tamano_pt) {
	return Number(tamano_pt) * PT_A_MM
}

/**
 * Alto de un renglon (con saltos de linea) para un tamaño de letra, en mm.
 *
 * @param {number} tamano_pt
 * @returns {number}
 */
export function alto_de_renglon_mm(tamano_pt) {
	return pt_a_mm(tamano_pt) * INTERLINEADO
}

/**
 * Deja un campo adentro de la etiqueta: posicion >= 0, tamaño >= 2 mm, y recortado para que no se
 * salga por la derecha ni por abajo (mismo criterio que la normalizacion de la API). Modifica el
 * objeto que recibe.
 *
 * @param {Object} elemento con x, y, w, h en mm
 * @param {number} ancho ancho de la etiqueta, mm
 * @param {number} alto alto de la etiqueta, mm
 * @returns {Object} el mismo elemento
 */
export function encerrar_en_la_etiqueta(elemento, ancho, alto) {
	let w = acotar(elemento.w, MINIMO_DEL_CAMPO_MM, ancho, MINIMO_DEL_CAMPO_MM)
	let h = acotar(elemento.h, MINIMO_DEL_CAMPO_MM, alto, MINIMO_DEL_CAMPO_MM)
	let x = acotar(elemento.x, 0, ancho - w, 0)
	let y = acotar(elemento.y, 0, alto - h, 0)

	elemento.x = redondear(x)
	elemento.y = redondear(y)
	elemento.w = redondear(w)
	elemento.h = redondear(h)

	/* El redondeo puede empujar 0,1 mm afuera: se corrige achicando */
	if (elemento.x + elemento.w > ancho) {
		elemento.w = redondear(ancho - elemento.x)
	}
	if (elemento.y + elemento.h > alto) {
		elemento.h = redondear(alto - elemento.y)
	}

	return elemento
}

/**
 * Escala los campos cuando cambia el tamaño de la etiqueta, para que ninguno quede afuera ni
 * pisado: las posiciones y tamaños se multiplican por el cambio de ancho y de alto, y la letra por
 * el menor de los dos (una etiqueta mas angosta achica la letra; una mas ancha y del mismo alto la
 * deja como estaba). Modifica los elementos que recibe.
 *
 * @param {Array} elementos
 * @param {number} ancho_viejo mm
 * @param {number} alto_viejo mm
 * @param {number} ancho_nuevo mm
 * @param {number} alto_nuevo mm
 * @returns {void}
 */
export function escalar_elementos(elementos, ancho_viejo, alto_viejo, ancho_nuevo, alto_nuevo) {
	if (!ancho_viejo || !alto_viejo) {
		return
	}

	let factor_x = ancho_nuevo / ancho_viejo
	let factor_y = alto_nuevo / alto_viejo
	let factor_letra = Math.min(factor_x, factor_y)

	elementos.forEach(function (elemento) {
		elemento.x = elemento.x * factor_x
		elemento.w = elemento.w * factor_x
		elemento.y = elemento.y * factor_y
		elemento.h = elemento.h * factor_y

		if (factor_letra !== 1 && typeof elemento.tamano != 'undefined') {
			elemento.tamano = Math.round(acotar(elemento.tamano * factor_letra, TAMANO_MINIMO_PT, TAMANO_MAXIMO_PT, elemento.tamano))
		}

		encerrar_en_la_etiqueta(elemento, ancho_nuevo, alto_nuevo)
	})
}
