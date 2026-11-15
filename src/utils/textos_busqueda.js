/**
 * Textos de ayuda de los buscadores (ronda 6 de la prueba gratuita, 15/11/2026).
 *
 * El defecto: los buscadores que buscan recien con Enter (el buscador general del Listado y el
 * modal «Buscar …» que abren Vender, el cliente de Vender y el Nombre de un articulo nuevo) seguian
 * diciendo «Escribi un criterio de busqueda» con la palabra ya escrita. El dueño escribia
 * «martillo», esperaba, y la pantalla le decia que escribiera algo. NO se cambia cuando se busca:
 * se cambia lo que se dice mientras hay texto escrito que todavia no se busco.
 *
 * Funciones puras (sin store ni `this`): los componentes las usan para decidir el texto, y
 * tests/textos-busqueda.test.cjs las prueba sin levantar nada.
 */

/**
 * Texto del estado vacio cuando el campo no tiene nada escrito.
 *
 * @type {String}
 */
export const TEXTO_BUSCADOR_VACIO = 'Escribí qué querés buscar'

/**
 * Largo maximo del criterio que se repite adentro del aviso. Un nombre largo pegado entero
 * romperia el renglon del aviso en el celular.
 *
 * @type {Number}
 */
export const LARGO_MAXIMO_CRITERIO_EN_AVISO = 30

/**
 * Normaliza un criterio a texto sin espacios en las puntas. null/undefined cuentan como vacio.
 *
 * @param {*} texto Lo que hay en el input.
 * @returns {String}
 */
export function normalizar_criterio(texto) {
	if (texto === null || typeof texto === 'undefined') {
		return ''
	}
	return ('' + texto).trim()
}

/**
 * Recorta el criterio para mostrarlo adentro del aviso, con «…» si es mas largo que el maximo.
 *
 * @param {*} texto Criterio tipeado.
 * @param {Number} [largo_maximo] Cantidad maxima de caracteres, contando los puntos suspensivos.
 * @returns {String}
 */
export function recortar_criterio(texto, largo_maximo) {
	let maximo = largo_maximo || LARGO_MAXIMO_CRITERIO_EN_AVISO
	// Por puntos de codigo (Array.from) y no por unidades UTF-16: un slice comun puede partir un
	// emoji al medio y dejar un caracter roto en pantalla.
	let caracteres = Array.from(normalizar_criterio(texto))
	if (caracteres.length <= maximo) {
		return caracteres.join('')
	}
	// Se corta y se le sacan los espacios del final para no dejar «martillo …».
	return caracteres.slice(0, maximo - 1).join('').replace(/\s+$/, '') + '…'
}

/**
 * Si lo que esta escrito todavia no se busco: hay texto y no es el mismo de la ultima busqueda.
 *
 * @param {*} texto_tipeado Lo que hay en el input ahora.
 * @param {*} criterio_buscado El texto con el que se busco por ultima vez ('' si nunca).
 * @returns {Boolean}
 */
export function hay_busqueda_pendiente(texto_tipeado, criterio_buscado) {
	let tipeado = normalizar_criterio(texto_tipeado)
	if (!tipeado.length) {
		return false
	}
	return tipeado !== normalizar_criterio(criterio_buscado)
}

/**
 * Aviso corto de «falta apretar Enter», con el texto tipeado. Null si no hay nada pendiente.
 *
 * @param {*} texto_tipeado Lo que hay en el input ahora.
 * @param {*} criterio_buscado El texto con el que se busco por ultima vez ('' si nunca).
 * @returns {String|null} «Apretá Enter para buscar «martillo»» o null.
 */
export function aviso_busqueda_pendiente(texto_tipeado, criterio_buscado) {
	if (!hay_busqueda_pendiente(texto_tipeado, criterio_buscado)) {
		return null
	}
	return 'Apretá Enter para buscar «' + recortar_criterio(texto_tipeado) + '»'
}

/**
 * «resultado» o «resultados» segun la cantidad. Solo 1 va en singular (0 resultados, 2 resultados).
 *
 * @param {Number|String} cantidad
 * @returns {String}
 */
export function palabra_resultados(cantidad) {
	return Number(cantidad) === 1 ? 'resultado' : 'resultados'
}

/**
 * Contador completo: «1 resultado», «12 resultados», «1.234 resultados».
 *
 * @param {Number|String} cantidad
 * @param {Function} [formatear] Formateador del numero (ej. numero_es del mixin). Sin el, va tal cual.
 * @returns {String}
 */
export function cantidad_de_resultados(cantidad, formatear) {
	let numero = typeof formatear === 'function' ? formatear(cantidad) : cantidad
	return numero + ' ' + palabra_resultados(cantidad)
}
