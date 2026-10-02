/**
 * Recargo o descuento propio de la SUCURSAL, ADENTRO del precio de cada renglon de VENDER (mision
 * sucursal-recargo-descuento, 2/10/2026).
 *
 * La sucursal puede llevar un porcentaje de recargo o de descuento (columnas
 * addresses.ajuste_precio_tipo y addresses.ajuste_precio_porcentaje, que escribe empresa-api).
 * Cuando en VENDER se elige esa sucursal, el porcentaje se mete en el precio de CADA renglon, como
 * ya hacen el descuento por metodo de pago y las cuotas, y NO se suma ni se resta al total: el
 * vendedor ve el precio ya ajustado en cada linea y el total sale de sumar esas lineas.
 *
 * El contrato con la API, que es lo que decide que una sucursal "tiene ajuste":
 *
 *   - ajuste_precio_tipo        'recargo' | 'descuento' | null  (null = sin ajuste)
 *   - ajuste_precio_porcentaje  decimal, LLEGA COMO STRING ("10.00"); null si no hay ajuste
 *
 * Las dos tienen valor valido o las dos son null. Cualquier otra combinacion (tipo desconocido,
 * porcentaje que no es un numero, cero o negativo, un descuento del 100% o mas) se IGNORA: la
 * sucursal se trata como sin ajuste y el precio queda exactamente como hoy. Lo mismo pasa con una
 * API vieja, que no devuelve las columnas (llegan undefined): no hay ajuste, y no hay error.
 *
 * Lo que vive aca son las reglas puras (sin store ni `this`), igual criterio que
 * utils/recargos_en_precios.js, que es de donde sale el parseo del numero. Las llama
 * mixins/generals.js (getPriceVender() y ajuste_de_sucursal_vigente()), y desde ahi los
 * componentes de VENDER que muestran el ajuste.
 */
import { numero_o_null } from '@/utils/recargos_en_precios'
/* El mismo porcentaje legible que usan los carteles de las ofertas: 10.00 -> "10", 5.50 -> "5,5". */
import { porcentaje_legible } from '@/utils/criterio_de_oferta_por_cantidad'

/** Valor de ajuste_precio_tipo para un recargo. */
export const AJUSTE_RECARGO = 'recargo'

/** Valor de ajuste_precio_tipo para un descuento. */
export const AJUSTE_DESCUENTO = 'descuento'

/**
 * Tope de un recargo. Es el mismo que valida empresa-api al guardar la sucursal
 * (la columna es DECIMAL(8,2) y se acepta hasta 999,99%): si la base trajera algo mayor, no lo
 * escribio la API y se ignora igual que cualquier otro valor invalido.
 */
export const RECARGO_MAXIMO = 999.99

/**
 * Signo menos "de verdad" (U+2212) para el texto corto de un descuento: con el guion comun
 * ("-5%") se confunde con un guion de separacion al lado del nombre de la sucursal.
 * Va escapado para que ningun editor ni codificacion de archivo lo convierta.
 */
const SIGNO_MENOS = '\u2212'

/**
 * El ajuste de precios de una sucursal, ya interpretado, o null si no tiene ninguno valido.
 *
 * `factor` es lo que multiplica el precio de catalogo: 1 + p/100 en un recargo, 1 - p/100 en un
 * descuento (un descuento del 5% multiplica por 0,95; NO se resta p puntos de un 100 recargado).
 *
 * 🔴 Se calcula con los porcentajes en CENTESIMAS ENTERAS: (10000 + c) / 10000 y
 * (10000 - c) / 10000, con c = p x 100. Es lo mismo que 1 + p/100 y 1 - p/100 en papel, pero no
 * en binario: 93,26 no existe como double, y 1 - 0,9326 (o 100 - 93,26) deja un error de 1e-15 que
 * basta para que un precio que en exacto es medio centavo -14525 x 0,0674 = 978,985- se redondee
 * para abajo, distinto de lo que hacen MySQL (decimal) y PHP (round). Con enteros, la unica
 * operacion inexacta es la division final, que da el double mas cercano al factor verdadero, y el
 * redondear_a_centavos() de quien lo use se come ese ultimo digito. La columna es DECIMAL(8,2), asi
 * que pasar a centesimas no pierde nada.
 *
 * Los textos salen de aca para que la pastilla de la sucursal, el chip de la barra de resumen y
 * la descripcion del calculo del renglon digan exactamente lo mismo:
 *   - `texto`       "Recargo del 10%" / "Descuento del 5,5%"   (frase completa)
 *   - `texto_corto` "Recargo +10%"    / "Descuento −5,5%"      (la pastilla, entra en un celular)
 *   - `marca`       "+10%"            / "−5,5%"                (el chip, pegado al nombre)
 *
 * @param {Object|null|undefined} address Sucursal tal cual la devuelve la API.
 * @returns {{tipo: String, porcentaje: Number, factor: Number, texto: String, texto_corto: String, marca: String}|null}
 */
export function ajuste_de_sucursal(address) {

	if (!address) {
		return null
	}

	let tipo = address.ajuste_precio_tipo

	if (tipo !== AJUSTE_RECARGO && tipo !== AJUSTE_DESCUENTO) {
		return null
	}

	/* numero_o_null: la decimal llega como string, y una clave ausente (API vieja) como undefined. */
	let porcentaje = numero_o_null(address.ajuste_precio_porcentaje)

	if (porcentaje === null || porcentaje <= 0) {
		return null
	}

	/* El porcentaje en centesimas enteras (10,5% -> 1050): ver el porque en la documentacion de arriba. */
	let centesimas = Math.round(porcentaje * 100)

	if (centesimas < 1) {
		/* Menos de una centesima de punto no mueve ningun precio: no hay ajuste que mostrar. */
		return null
	}

	if (tipo === AJUSTE_DESCUENTO && centesimas >= 10000) {
		/* Un 100% o mas dejaria el precio en cero o negativo: nadie lo quiere, no se aplica. */
		return null
	}

	if (tipo === AJUSTE_RECARGO && porcentaje > RECARGO_MAXIMO) {
		return null
	}

	let legible = porcentaje_legible(porcentaje)

	if (tipo === AJUSTE_RECARGO) {
		return {
			tipo: tipo,
			porcentaje: porcentaje,
			factor: (10000 + centesimas) / 10000,
			texto: 'Recargo del ' + legible + '%',
			texto_corto: 'Recargo +' + legible + '%',
			marca: '+' + legible + '%',
		}
	}

	return {
		tipo: tipo,
		porcentaje: porcentaje,
		factor: (10000 - centesimas) / 10000,
		texto: 'Descuento del ' + legible + '%',
		texto_corto: 'Descuento ' + SIGNO_MENOS + legible + '%',
		marca: SIGNO_MENOS + legible + '%',
	}
}

/**
 * Si un renglon de VENDER lleva el ajuste de la sucursal adentro del precio.
 *
 * Articulos, combos y promociones SI; servicios NO (Lucas pidio que se aplique "a cada articulo").
 * Es la regla de renglon_lleva_recargos_de_venta() de utils/recargos_en_precios.js SIN la
 * excepcion de "recargos en servicios": el ajuste de la sucursal no tiene esa opcion.
 *
 * @param {Object} item Renglon de VENDER (con is_article / is_combo / ...).
 * @returns {Boolean}
 */
export function renglon_lleva_ajuste_de_sucursal(item) {

	if (!item) {
		return false
	}

	return Boolean(item.is_article || item.is_combo || item.is_promocion_vinoteca)
}
