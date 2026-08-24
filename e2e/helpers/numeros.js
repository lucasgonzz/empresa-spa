// Lectura de importes tal como los imprime la pantalla.
//
// ─────────────────────────────────────────────────────────────────────────────────────────────
// 🔴 Desde el 21/8/2026 la aplicacion imprime TODO en es-AR: miles ".", decimal ","
// ─────────────────────────────────────────────────────────────────────────────────────────────
//
// Hasta esa fecha convivian dos formatos en la MISMA fila del listado de articulos, porque
// `price_variable_decimals()` devolvia el `numeral(p).format(pattern)` crudo (formato en-US) y
// `price()` le daba vuelta los separadores:
//
//     Costo base    $2,000.00     <- en-US
//     Precio final  $4.145,08     <- es-AR
//
// Eso se corrigio: los dos caminos pasan ahora por `separadores_es()` de
// `src/common-vue/helpers/formato_numero.js`, que es el unico lugar del sistema que decide como se
// ve un numero. La funcion `numero_de_pantalla_variable` que existia para leer el formato en-US ya
// no tiene razon de ser y se borro.
//
// Lo que NO cambio, y por eso sigue habiendo dos funciones:
//
//   - lo que se MUESTRA va en es-AR                      -> `numero_de_pantalla`
//   - lo que es un DATO va con punto decimal y sin miles -> `numero_de_dato`
//
// Un dato es el `value` de un `&lt;input&gt;` (los campos editables no se tocaron: se siguen escribiendo
// con punto) y cualquier atributo `data-*` que el sistema expone para que otro proceso lo lea.
// La distincion es la misma que hace la aplicacion adentro, y es la que evita que un test compare
// contra el texto de la pantalla cuando lo que quiere es el numero.
//
// Y ojo con adivinar el formato mirando el texto, que es tentador: la regla "el separador decimal
// es el que esta mas a la derecha" se rompe con el caso mas comun de todos:
//
//     "$20.691"   -> es-AR, veinte mil seiscientos noventa y uno (price() recorta el ",00")
//     "$20.691"   -> dato,  veinte con seiscientos noventa y uno
//
// El MISMO texto, dos numeros distintos. Quien lee tiene que saber que esta leyendo.

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
 * Convierte a numero un valor de DATO: punto decimal y sin separador de miles ("2000.00" -> 2000).
 *
 * Es lo que sale de `inputValue()` sobre un campo editable y de un atributo `data-*`. NO sirve para
 * leer una celda: para eso esta `numero_de_pantalla`.
 *
 * @param {string} texto
 * @returns {number} NaN si el texto no tiene ningun digito.
 */
function numero_de_dato(texto) {
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
	numero_de_dato,
	redondear,
}
