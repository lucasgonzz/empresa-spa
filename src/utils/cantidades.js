/**
 * Sumas de cantidades de VENDER sin el ruido de la coma flotante (mision
 * cantidad-balanza-redondeo, 10/10/2026).
 *
 * El defecto que arregla: en JS 0.17 + 0.25 da 0.42000000000000004. Medido en la demo (4.3.8) con
 * dos tickets de balanza por PLU del mismo articulo por kilo (170 g y 250 g): el total del renglon
 * daba bien, pero la Cantidad del renglon mostraba 0.420000000 (el valor cortado por el ancho del
 * input) y el resumen de la barra decia "1 producto · 0,42000000000000004 unidades". La lectura del
 * ticket no tiene ruido (170 / 1000 = 0.17 exacto): el ruido nace en la SUMA de dos cantidades, y
 * ademas viaja en el payload de la venta.
 *
 * 🔴 POR QUE 6 DECIMALES Y NO "3 PARA KILO, ENTEROS PARA GRAMO"
 *
 * - El ruido de la coma flotante aparece en el decimal 15 a 17. Redondear a 6 lo saca entero sin
 *   comerse nada que alguien haya cargado a mano.
 * - Para los tickets de balanza da justo lo que se espera: en kilos los sumandos traen como mucho
 *   3 decimales, asi que la suma tambien; en gramos son enteros, asi que la suma tambien.
 * - Redondear por unidad de medida SI le cambiaria la cantidad a quien tipea 0,3333 m o 1,5 g.
 * - La base guarda 2 decimales (`article_sale.amount decimal(8,2)`): 6 nunca agrega precision que
 *   no exista.
 *
 * 🔴 ES PARA SUMAS DE CANTIDADES, NO PARA LO QUE EL VENDEDOR ESTA TIPEANDO. Pasarle por aca el
 * valor de un input mientras se escribe le borraria al vendedor un "0." o un "1,50" a medio
 * escribir (Number('') es 0, Number('1.') es 1). Se usa donde el sistema suma, no donde la persona
 * escribe.
 *
 * Funciones puras, sin imports: se usan desde mixins y computeds de VENDER.
 */

/**
 * Cantidad de decimales con la que se limpia una cantidad sumada. Ver la cabecera del archivo.
 *
 * @type {Number}
 */
export const DECIMALES_DE_UNA_CANTIDAD = 6

/**
 * Saca el ruido de la coma flotante de una cantidad.
 *
 * Lo que no es un numero finito se devuelve tal cual lo deja Number(): NaN sigue siendo NaN (y
 * Infinity sigue siendo Infinity). Convertirlo en 0 esconderia el error de quien lo mando.
 *
 * @param {Number|String} valor Cantidad a limpiar (puede venir como texto, como manda Laravel los
 *   decimales: '0.170').
 * @returns {Number} La cantidad redondeada a DECIMALES_DE_UNA_CANTIDAD decimales, o Number(valor)
 *   si no es un numero finito.
 */
export function redondear_cantidad(valor) {

	// La cantidad ya pasada a numero ('0.170' -> 0.17, '' -> 0, 'abc' -> NaN)
	let numero = Number(valor)

	if (!isFinite(numero)) {
		return numero
	}

	return Number(numero.toFixed(DECIMALES_DE_UNA_CANTIDAD))
}

/**
 * Suma dos cantidades y le saca a la suma el ruido de la coma flotante.
 *
 * 0.17 + 0.25 da 0.42 (y no 0.42000000000000004); 0.7 + 0.1 da 0.8 (y no 0.7999999999999999).
 *
 * @param {Number|String} a Primera cantidad (numero o texto numerico).
 * @param {Number|String} b Segunda cantidad (numero o texto numerico).
 * @returns {Number} La suma, redondeada con redondear_cantidad().
 */
export function sumar_cantidades(a, b) {
	return redondear_cantidad(Number(a) + Number(b))
}
