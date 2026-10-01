/**
 * Criterio UNICO para saber a que precio se vende un combo segun la lista de precios (mision
 * combos-calculados, 30/9/2026).
 *
 * Es puro a proposito: sin Vuex, sin `this`, sin efectos. Se puede probar con node sin levantar
 * nada, y es lo unico que hay que razonar para saber por que un combo sale a tal precio.
 *
 * DE DONDE SALEN LOS DATOS
 * El servidor arma cada combo con dos cosas (empresa-api, ComboCalculadoHelper):
 *   - `price`: el precio de la lista por defecto PARA EL PUBLICO (la de mayor position entre las no
 *     ocultas; o el precio unico si la cuenta no usa listas). Es lo que ya leian las pantallas
 *     viejas y las tiendas viejas, por eso sigue existiendo.
 *   - `price_types`: una fila por lista, en el mismo formato belongsToMany que
 *     `article.price_types` -> `{id, name, position, pivot: {price_type_id, price}}`. OJO que el
 *     pivote lleva `price` y NO `final_price` como el del articulo. Solo se llena para los combos
 *     calculados de una cuenta con listas; un combo manual llega con el arreglo vacio.
 *
 * Todo el descuento del combo ya viene aplicado en esos precios (el servidor lo resuelve al
 * guardar), asi que el front NO calcula nada: elige la fila que corresponde y listo.
 *
 * REGLA: fila de esa lista -> su precio. Sin fila (combo manual, cuenta sin listas, lista creada
 * despues del ultimo calculo, servidor viejo que no manda `price_types`) -> `combo.price`. Nunca
 * queda un combo sin precio por no tener fila.
 *
 * 🔴 Este helper reemplaza a tres lugares que fijaban el precio del combo a mano desde
 * `combo.price` sin mirar la lista: Combos.vue::setSelectedCombo,
 * mixins/vender/deteccion_combos.js::agregar_combo_al_remito y el rearmado de precios de
 * generals.js::aplicar_tipos_de_precio. Si los tres eligieran distinto, el mismo combo saldria a
 * precios diferentes segun por donde entro al remito, sin que nada lo avise.
 */

/**
 * Convierte un precio a numero SOLO si es un numero finito. Devuelve null si no lo es.
 *
 * El pivote llega de la API como STRING con punto decimal ("1500.00"): la columna es decimal y
 * PDO la devuelve asi. Number() se lo come sin problema, pero `null`, `''`, `undefined` y el
 * texto que no es numerico NO pueden convertirse en un precio de $0: Number(null) y Number('')
 * dan 0 y el combo saldria regalado. Por eso se descartan antes.
 *
 * @param {*} valor
 * @returns {Number|null}
 */
export function a_precio(valor) {
	if (valor === null || typeof valor == 'undefined') {
		return null
	}
	if (typeof valor == 'string' && valor.trim() === '') {
		return null
	}
	let numero = Number(valor)
	if (!isFinite(numero)) {
		return null
	}
	return numero
}

/**
 * La lista de mayor `position` de un conjunto de listas; a igual position, la de id mas alto.
 *
 * 🔴 Es EL MISMO criterio que mixins/vender/price_types.js::lista_de_mayor_posicion() y que
 * ArticlePricesHelper::resolver_precio_de_venta() del back (rama "lista_por_defecto"), y no puede
 * divergir. `price_types` no tiene indice unico en (user_id, position): dos listas pueden compartir
 * position, y sin el desempate por id el resultado dependeria del orden en que llegaron. Una
 * position nula vale 0, igual que alla.
 *
 * @param {Array} listas objetos con `id` y `position`
 * @returns {Object|null}
 */
export function lista_de_mayor_posicion(listas) {
	if (!Array.isArray(listas)) {
		return null
	}

	let elegida = null

	listas.forEach(lista => {
		if (!lista) {
			return
		}
		if (elegida === null) {
			elegida = lista
			return
		}

		let position = (lista.position === null || typeof lista.position == 'undefined') ? 0 : Number(lista.position)
		let position_elegida = (elegida.position === null || typeof elegida.position == 'undefined') ? 0 : Number(elegida.position)

		if (position > position_elegida) {
			elegida = lista
			return
		}
		if (position == position_elegida && Number(lista.id) > Number(elegida.id)) {
			elegida = lista
		}
	})

	return elegida
}

/**
 * El id de lista de una fila de `combo.price_types`. Se prefiere el del pivote
 * (`pivot.price_type_id`, la columna real de combo_price_type) y se cae al `id` de la fila, que es
 * el de la lista en el formato belongsToMany.
 *
 * @param {Object} fila
 * @returns {Number|null}
 */
function id_de_lista_de_la_fila(fila) {
	if (fila && fila.pivot && fila.pivot.price_type_id !== null && typeof fila.pivot.price_type_id != 'undefined') {
		return Number(fila.pivot.price_type_id)
	}
	if (fila && fila.id !== null && typeof fila.id != 'undefined') {
		return Number(fila.id)
	}
	return null
}

/**
 * El precio que el combo tiene guardado para UNA lista, o null si esa lista no tiene fila.
 *
 * Es la version "sin red": no cae a `combo.price`. La usa quien necesita distinguir "el combo
 * tiene precio propio para esta lista" de "no lo tiene" (aplicar_tipos_de_precio, que en el
 * segundo caso deja el precio que ya traia el renglon).
 *
 * @param {Object} combo
 * @param {Number|String} price_type_id
 * @returns {Number|null}
 */
export function precio_de_lista_del_combo(combo, price_type_id) {
	if (!combo || !Array.isArray(combo.price_types) || !price_type_id) {
		return null
	}

	let buscado = Number(price_type_id)

	for (let i = 0; i < combo.price_types.length; i++) {
		let fila = combo.price_types[i]
		if (id_de_lista_de_la_fila(fila) !== buscado) {
			continue
		}
		return a_precio(fila.pivot ? fila.pivot.price : null)
	}

	return null
}

/**
 * A que precio se vende el combo con la lista pedida.
 *
 * - Con `price_type_id` y fila para esa lista: el precio de esa fila.
 * - Sin `price_type_id` (la venta no tiene lista): el de la lista de mayor position ENTRE TODAS
 *   las filas del combo (desempate por id mayor), sin mirar si la lista esta oculta al publico.
 *   Es un criterio DISTINTO al del servidor, a proposito: `combo.price` sale de la lista de mayor
 *   position entre las NO ocultas al publico (es lo que lee la tienda), mientras que aca estamos
 *   en Vender, donde el vendedor si puede usar listas ocultas y es la misma eleccion que hace
 *   mixins/vender/price_types.js para un articulo. Por eso los dos numeros pueden diferir y este
 *   helper NO da por sentado que coincidan.
 * - Sin fila (o sin `price_types`): `combo.price`, que queda solo como respaldo.
 *
 * Devuelve null si ni siquiera `combo.price` es un numero: el llamador decide que hacer (en
 * Vender, dejar el precio que ya tenia el renglon).
 *
 * @param {Object} combo
 * @param {Number|String|null} price_type_id lista de la venta, o null/0 si no tiene
 * @returns {Number|null}
 */
export function precio_de_combo_para_lista(combo, price_type_id) {
	if (!combo) {
		return null
	}

	if (price_type_id) {
		let precio_de_la_lista = precio_de_lista_del_combo(combo, price_type_id)
		if (precio_de_la_lista !== null) {
			return precio_de_la_lista
		}
		return a_precio(combo.price)
	}

	let lista_por_defecto = lista_de_mayor_posicion(combo.price_types)
	if (lista_por_defecto) {
		let precio_por_defecto = a_precio(lista_por_defecto.pivot ? lista_por_defecto.pivot.price : null)
		if (precio_por_defecto !== null) {
			return precio_por_defecto
		}
	}

	return a_precio(combo.price)
}
