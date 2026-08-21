/**
 * Criterio UNICO de como se ve un numero en la interfaz: coma para los decimales, punto
 * para separar de a tres los enteros. `$1.234,56`, `1.234.567,891`, `12.500`, `-1.234,50`.
 *
 * Antes de esto la decision estaba repartida en cinco implementaciones distintas: tres
 * `price()` (dos de ellos devolvian el formato ingles `$1,234.56`), el camino de decimales
 * variables (que devolvia `1234.5678`, sin separador de miles) y tres copias del mismo
 * regex sueltas en componentes de Vender.
 *
 * 🔴 POR QUE EL SWAP SE HACE SOBRE EL TEXTO Y NO SE REGISTRA EL LOCALE DE numeral
 *
 * Lo obvio seria `numeral.register('locale', 'es_ar', {delimiters: {thousands: '.',
 * decimal: ','}})` una vez en main.js y borrar todo esto. ROMPE LA APLICACION, y de la peor
 * manera: en silencio y multiplicando plata.
 *
 * numeral usa los mismos delimitadores para formatear Y PARA PARSEAR. Laravel manda los
 * decimales como string, asi que con el locale registrado el punto pasa a leerse como
 * separador de miles:
 *
 *     numeral('1234.56').value()  // locale en    -> 1234.56
 *     numeral('1234.56').value()  // locale es_ar -> 123456     <- x100
 *     numeral('0.5').value()      // locale es_ar -> 5          <- x10
 *
 * Medido el 21/8/2026 contra el numeral instalado (^2.0.6). Todos los montos que llegan
 * como string quedarian multiplicados por cien. Ese es el motivo por el que el bloque de
 * `numeral.register` de `common-vue/mixins/dates.js` quedo comentado y nunca se activo.
 *
 * Entonces: numeral se queda en locale ingles, parsea como siempre, y el cambio de
 * separadores se aplica SOBRE EL STRING YA FORMATEADO, donde no puede afectar ninguna
 * cuenta. Si alguien vuelve a intentar el atajo del locale, que lea esto primero.
 *
 * Clase de error: "formatear y parsear con la misma configuracion cuando los dos lados
 * hablan idiomas distintos" (el front muestra en es-AR, la API habla en en-US).
 *
 * Mision del 21/8/2026 — separadores de numeros.
 */

/**
 * Da vuelta los separadores de un numero YA FORMATEADO en formato ingles.
 *
 * Es lo unico que hay que aplicarle a la salida de `numeral(...).format(...)`, que siempre
 * viene en locale ingles por el motivo de la cabecera de este archivo.
 *
 * El intercambio se hace en UNA sola pasada con un reemplazo por funcion, no con dos
 * `replaceAll` encadenados y un caracter centinela en el medio: el centinela tiene que ser
 * algo que nunca pueda venir en la entrada, y ahi es facil equivocarse. Con un espacio,
 * por ejemplo, `$ 1,234.56` (que existe: `format_price()` de Vender antepone `$ ` y
 * `_check_moneda()` antepone `USD `) terminaria como `$.1.234,56`.
 *
 * @param {string} texto texto en formato ingles (ej: '$1,234.56').
 * @returns {string} el mismo texto con coma decimal y punto de miles (ej: '$1.234,56').
 */
export function separadores_es(texto) {
	if (texto === null || typeof texto == 'undefined') {
		return texto
	}
	return String(texto).replace(/[.,]/g, function (caracter) {
		return caracter == ',' ? '.' : ','
	})
}

/**
 * Separa de a tres la parte entera de un numero, con punto.
 *
 * @param {string} entero solo digitos, sin signo ni parte decimal (ej: '1234567').
 * @returns {string} agrupado (ej: '1.234.567').
 */
export function agrupar_miles_es(entero) {
	return String(entero).replace(/\B(?=(\d{3})+(?!\d))/g, '.')
}

/**
 * Le pone separadores a un numero que YA viene con la cantidad de decimales resuelta,
 * escrito en formato de dato (punto decimal, sin separador de miles).
 *
 * Es el caso de los decimales variables: quien decide cuantos decimales mostrar es
 * `format_number_variable_decimals()`, que devuelve un valor de DATO ('1234.5678') porque
 * ese mismo valor se usa para guardar. Esta funcion lo pasa a texto de pantalla sin volver
 * a decidir nada sobre los decimales.
 *
 * @param {string|number} texto numero en formato de dato (ej: '1234.5678').
 * @returns {string} texto de pantalla (ej: '1.234,5678'), o '' si no hay valor.
 */
export function separadores_es_desde_dato(texto) {
	if (texto === null || texto === '' || typeof texto == 'undefined') {
		return ''
	}
	const cadena = String(texto)
	const signo = cadena.charAt(0) == '-' ? '-' : ''
	const sin_signo = signo ? cadena.substring(1) : cadena
	const partes = sin_signo.split('.')
	const entero = agrupar_miles_es(partes[0])

	if (partes.length > 1) {
		return signo + entero + ',' + partes[1]
	}
	return signo + entero
}

/**
 * Formatea un numero para mostrarlo, con la cantidad de decimales que se le pida.
 *
 * No pasa por numeral a proposito: el camino de las cantidades no tiene por que arrastrar
 * el parseo de numeral, que es de donde sale el riesgo descripto en la cabecera.
 *
 * @param {*} valor valor crudo (numero, o string en formato de dato con punto decimal).
 * @param {number} decimales cantidad de decimales a mostrar (por defecto 2).
 * @returns {string} numero formateado (ej: '1.234,50'), o '' si el valor no es un numero.
 */
export function numero_es(valor, decimales = 2) {
	if (valor === null || valor === '' || typeof valor == 'undefined') {
		return ''
	}
	const numero = Number(valor)
	if (isNaN(numero)) {
		return ''
	}
	return separadores_es_desde_dato(numero.toFixed(decimales))
}
