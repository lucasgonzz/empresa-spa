/**
 * Reglas puras del reparto en varios métodos de pago (sin Vue, sin store, sin red).
 *
 * 🔴 Por qué existe (ticket #177, misión soporte-t177-m50): la fila inicial del reparto de Vender nacía con
 * el método de pago 3 fijo. Si el catálogo del negocio no tiene el 3, el select se veía sin método elegido
 * pero la guarda `hay_metodo_de_pago_sin_elegir` sólo miraba que el id fuera distinto de 0, así que lo dejaba
 * pasar; y `Buttons.vue::calcular()` empujaba al segundo paso una opción sin id ni nombre (el select mostraba
 * «null»). Acá viven las reglas para que las usen el mixin, el modal y el botón, y para poder probarlas sin
 * levantar la interfaz.
 */

/**
 * Método de pago por el que nace una fila del reparto cuando el negocio no eligió otro (Efectivo).
 *
 * @type {number}
 */
export const METODO_DE_PAGO_PREFERIDO = 3

/**
 * ¿El catálogo está cargado y trae al menos un método?
 *
 * @param {*} catalogo Lista de métodos de pago del store.
 * @returns {boolean}
 */
function catalogo_cargado(catalogo) {
	return Array.isArray(catalogo) && catalogo.length > 0
}

/**
 * ¿El método de pago existe en el catálogo del negocio?
 *
 * - 0, null, '', 'null' y undefined nunca existen.
 * - Con el catálogo vacío o que no es una lista (todavía no cargó) un id válido no se bloquea: no hay contra
 *   qué compararlo y bloquear dejaría al usuario sin poder cobrar.
 *
 * @param {*} metodo_id Id del método de pago de la fila.
 * @param {*} catalogo Lista de métodos de pago del store.
 * @returns {boolean}
 */
export function metodo_de_pago_existe(metodo_id, catalogo) {
	// Number('null') es NaN y Number(null) es 0: los dos quedan fuera con la misma pregunta.
	let id_numerico = Number(metodo_id)

	if (!id_numerico) {
		return false
	}

	if (!catalogo_cargado(catalogo)) {
		return true
	}

	return catalogo.some(metodo => metodo && Number(metodo.id) === id_numerico)
}

/**
 * Método con el que nace una fila nueva del reparto: el preferido sólo si el negocio lo tiene; si no, 0
 * («Seleccione el método de pago»), para no dejar una fila apuntando a un método que no existe.
 *
 * @param {*} catalogo Lista de métodos de pago del store.
 * @param {number} [preferido=3] Método preferido (Efectivo).
 * @returns {number} El id preferido o 0. Con el catálogo sin cargar devuelve el preferido (comportamiento anterior).
 */
export function metodo_de_pago_por_defecto(catalogo, preferido = METODO_DE_PAGO_PREFERIDO) {
	if (!catalogo_cargado(catalogo)) {
		return preferido
	}

	return metodo_de_pago_existe(preferido, catalogo) ? preferido : 0
}

/**
 * ¿La fila tiene plata? Se mira el monto en la moneda de la fila Y el cotizado (una fila en otra moneda
 * puede tener amount en 0 y amount_cotizado con valor).
 *
 * @param {Object} fila Fila del reparto.
 * @returns {boolean}
 */
export function fila_con_plata(fila) {
	return (Number(fila.amount) || 0) > 0 || (Number(fila.amount_cotizado) || 0) > 0
}

/**
 * Arma lo que "Calcular" (primer paso del reparto con descuentos) deja para el segundo paso: las opciones del
 * select, las filas con su descuento / recargo y, si alguna fila con plata no tiene un método utilizable,
 * cuál es. Nunca devuelve una opción sin id ni nombre: ante una fila inválida devuelve todo vacío para que
 * quien llama corte sin tocar el reparto.
 *
 * Una fila en blanco y en cero (método sin elegir o inexistente, sin monto) se saltea en silencio.
 *
 * @param {Array} filas Filas del reparto (selected_payment_methods_).
 * @param {Array} catalogo Métodos de pago del negocio.
 * @param {Array} descuentos Descuentos por método (current_acount_payment_method_discount).
 * @param {Array} cuotas Cuotas del negocio (cuota), con descuento / recargo en porcentaje.
 * @returns {{opciones: Array, filas_siguientes: Array, fila_invalida: ({indice: number, metodo_id: *}|null)}}
 */
export function armar_opciones_del_segundo_paso(filas, catalogo, descuentos, cuotas) {
	// Opciones del select del segundo paso (una por fila válida).
	let opciones = []
	// Filas del segundo paso (fuente de verdad del reparto), con el importe reseteado.
	let filas_siguientes = []

	let lista_de_filas = Array.isArray(filas) ? filas : []
	let lista_de_catalogo = Array.isArray(catalogo) ? catalogo : []
	let lista_de_descuentos = Array.isArray(descuentos) ? descuentos : []
	let lista_de_cuotas = Array.isArray(cuotas) ? cuotas : []

	for (let indice = 0; indice < lista_de_filas.length; indice++) {

		let fila = lista_de_filas[indice]

		if (!fila) {
			continue
		}

		// Método de la fila tal como está en el catálogo (undefined si no existe).
		let metodo = lista_de_catalogo.find(p => Number(p.id) === Number(fila.current_acount_payment_method_id))

		if (typeof metodo === 'undefined' || !metodo.id || !metodo.name) {

			// Sin plata no molesta a nadie; con plata el reparto no se puede seguir.
			if (!fila_con_plata(fila)) {
				continue
			}

			return {
				opciones: [],
				filas_siguientes: [],
				fila_invalida: { indice: indice, metodo_id: fila.current_acount_payment_method_id },
			}
		}

		let discount_amount = null
		let surchage_amount = null

		if (fila.cuota_id) {
			let cuota = lista_de_cuotas.find(c => c.id == fila.cuota_id)
			if (typeof cuota != 'undefined') {
				if (cuota.descuento) {
					discount_amount = Number(fila.amount) * Number(cuota.descuento) / 100
				} else if (cuota.recargo) {
					surchage_amount = Number(fila.amount) * Number(cuota.recargo) / 100
				}
			}
		}

		// El descuento del método pisa al de la cuota (igual que antes).
		let descuento = lista_de_descuentos.find(d => d.current_acount_payment_method_id == fila.current_acount_payment_method_id)

		if (typeof descuento != 'undefined') {
			discount_amount = Number(fila.amount) * Number(descuento.discount_percentage) / 100
		}

		opciones.push({
			...metodo,
			amount: '',
			discount_amount: discount_amount,
			surchage_amount: surchage_amount,
			caja_id: fila.caja_id,
		})

		/*
			El __row_id se arrastra: este objeto REEMPLAZA a la fila del MultiPaymentMethods y sin él la fila
			vuelve a identificarse por índice en el :key del v-for (bug del 21/8/2026).
		*/
		filas_siguientes.push({
			__row_id: fila.__row_id,
			current_acount_payment_method_id: fila.current_acount_payment_method_id,
			moneda_id: fila.moneda_id,
			caja_id: fila.caja_id,
			amount: '',
			cuota_id: fila.cuota_id,
			discount_amount: discount_amount,
			surchage_amount: surchage_amount,
		})
	}

	return { opciones, filas_siguientes, fila_invalida: null }
}
