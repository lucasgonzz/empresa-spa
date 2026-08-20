// Lectura de importes tal como los imprime la pantalla.
//
// ─────────────────────────────────────────────────────────────────────────────────────────────
// 🔴 Por que hay DOS funciones y no una que "se de cuenta sola"
// ─────────────────────────────────────────────────────────────────────────────────────────────
//
// La aplicacion no formatea todos los importes igual. En una MISMA fila del listado de articulos
// conviven hoy los dos formatos:
//
//     Costo base    $2,000.00     <- miles ",", decimal "."   (formato en-US)
//     Costo Real    $2,000.00     <- idem
//     Precio final  $4.145,08     <- miles ".", decimal ","   (formato es-AR)
//
// Medido el 19/8/2026 en el slot s8 sobre el articulo "Martillo acero". La causa esta ubicada: las
// props con `variable_decimals` (`cost`, `costo_real`) se imprimen con `price_variable_decimals()`
// --common-vue/mixins/generals/formatting.js:148--, que devuelve `numeral(p).format(pattern)`
// CRUDO; `price()` --common-vue/mixins/dates.js:63-- hace el intercambio de separadores a es-AR
// despues del format, y `price_variable_decimals()` no. No se corrige desde un test: es un
// formateador compartido por todo el sistema y cambiarlo mueve cada precio de cada pantalla.
//
// Y no alcanza con adivinar el formato mirando el texto, aunque sea tentador. La regla "el
// separador decimal es el que esta mas a la derecha" funciona con "$2,000.00" y con "$4.145,08",
// pero se rompe con el caso mas comun de todos:
//
//     "$20.691"   -> es-AR, veinte mil seiscientos noventa y uno (price() recorta el ",00")
//     "$20.691"   -> en-US, seria veinte con seiscientos noventa y uno
//
// El MISMO texto, dos numeros distintos. No hay heuristica que salve eso: quien lee tiene que
// saber con que formateador se imprimio ese campo. Por eso las dos funciones estan separadas y
// cada llamada elige.
//
// Cual usar:
//   - `numero_de_pantalla`            -> todo lo que pasa por price(): precios finales, totales,
//                                        importes de cuenta corriente, montos de un reporte. Es el
//                                        formato que el sistema declara como propio.
//   - `numero_de_pantalla_variable`   -> SOLO las props que declaran `variable_decimals` en su
//                                        model (hoy `cost` y `costo_real` de article). Si algun dia
//                                        se corrige price_variable_decimals(), estas llamadas pasan
//                                        a ser `numero_de_pantalla` y esta funcion se borra.

/**
 * Deja solo digitos, separadores y el signo.
 *
 * @param {string} texto
 * @returns {string}
 */
function limpiar(texto) {
	return String(texto).replace(/[^\d.,-]/g, '')
}

/**
 * Convierte a numero un importe impreso en formato es-AR: punto como separador de miles y coma
 * como decimal ("$40.527,50" -> 40527.5, "$20.691" -> 20691).
 *
 * Es el formato de `price()`, o sea de casi toda la aplicacion.
 *
 * @param {string} texto Texto de la celda, con simbolo de moneda y separadores.
 * @returns {number} NaN si el texto no tiene ningun digito (ej. el "-" que se imprime si es null).
 */
function numero_de_pantalla(texto) {
	const limpio = limpiar(texto)

	if (limpio === '' || limpio === '-') {
		return NaN
	}

	return Number(
		limpio
			// El punto es separador de miles: se descarta.
			.split('.').join('')
			// La coma es el separador decimal.
			.replace(',', '.')
	)
}

/**
 * Convierte a numero un importe impreso en formato en-US: coma como separador de miles y punto como
 * decimal ("$2,000.00" -> 2000).
 *
 * Es el formato --no buscado-- de las props con `variable_decimals`. Ver el comentario de arriba.
 *
 * @param {string} texto
 * @returns {number} NaN si el texto no tiene ningun digito.
 */
function numero_de_pantalla_variable(texto) {
	const limpio = limpiar(texto)

	if (limpio === '' || limpio === '-') {
		return NaN
	}

	return Number(limpio.split(',').join(''))
}

/**
 * Redondea a `decimales` posiciones, para comparar contra lo que la pantalla puede mostrar.
 *
 * Existe porque el sistema guarda mas decimales de los que imprime (`articles.costo_real` llega a
 * 6, ver `variable_decimals` en src/models/article.js) y una comparacion exacta contra el valor
 * calculado por el test fallaria por el ultimo decimal sin que haya nada mal.
 *
 * @param {number} valor
 * @param {number} [decimales=2]
 * @returns {number}
 */
function redondear(valor, decimales = 2) {
	const factor = Math.pow(10, decimales)
	return Math.round(valor * factor) / factor
}

module.exports = {
	numero_de_pantalla,
	numero_de_pantalla_variable,
	redondear,
}
