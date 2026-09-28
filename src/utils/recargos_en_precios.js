/**
 * Recargos de venta ADENTRO de los precios de los renglones (mision
 * recargos-en-precios-editable, 28/9/2026).
 *
 * La opcion de VENDER "Aplicar los recargos de esta venta directamente a los precios de los
 * articulos" decide DONDE se ve el recargo -adentro del precio de cada renglon o al pie, sobre el
 * total- y NUNCA si se cobra (decision 2 de Lucas). Prenderla o apagarla no puede mover el total,
 * salvo algun centavo por unidad: con la opcion prendida el precio con recargos se redondea a
 * centavos (redondear_a_centavos, decision de Lucas del 28/9/2026).
 *
 * Para poder apagarla en una venta o un presupuesto YA GUARDADO, cada renglon guarda, ademas de
 * su `price`, el precio SIN los recargos de venta en `pivot.price_sin_recargos_de_venta`. La
 * invariante, que es la misma que sostiene empresa-api y que no se negocia:
 *
 *   - NO NULL <=> el `price` de ese renglon TIENE ADENTRO los recargos de venta, y el valor es el
 *     precio unitario SIN ellos (mismo contexto de IVA y moneda que `price`).
 *   - NULL    <=> el `price` NO tiene recargos de venta adentro (opcion apagada, servicio sin
 *     "recargos en servicios", o renglon guardado antes de esta mision).
 *
 * Lo que vive aca son las reglas puras (sin store ni `this`) que comparten VENDER
 * (mixins/generals.js y mixins/vender/previus_sale/index.js) y el modal "Actualizar precios"
 * (components/ventas/modals/update-prices/Index.vue). Si una cambia, cambian las tres pantallas.
 */

/**
 * Un numero, o null si el valor no es un numero usable. La columna es decimal y Laravel la
 * serializa como STRING ("100.000000"), y una clave ausente -API vieja, columna sin migrar- llega
 * como undefined: los dos casos tienen que terminar en null y no en 0, porque 0 es un precio.
 *
 * @param {*} valor
 * @returns {Number|null}
 */
export function numero_o_null(valor) {
	if (valor === null || typeof valor == 'undefined' || valor === '') {
		return null
	}

	let numero = Number(valor)

	if (isNaN(numero) || !isFinite(numero)) {
		return null
	}

	return numero
}

/**
 * Redondeo a CENTAVOS (2 decimales, mitad hacia arriba) de un precio que lleva los recargos de
 * venta adentro. Decision de Lucas del 28/9/2026: ese precio se redondea en la SPA y ESE numero
 * es el que se muestra, se suma al total y se manda. El porque esta en getPriceVender()
 * (mixins/generals.js), que es donde alguien lo va a querer sacar.
 *
 * 🔴 No es Math.round(x * 100) / 100 a secas: en binario 1,005 * 100 da 100,49999999999999 y eso
 * redondearia para abajo un precio que MySQL (decimal) y PHP (round) redondean para arriba. Se
 * corta primero a 15 cifras significativas -las que un double representa sin ruido-, que deja
 * 100,5 limpio, y recien ahi se redondea. Tampoco sirve el `redondear()` de generals.js: ese
 * redondea a enteros, decenas o centenas segun la configuracion del comercio.
 *
 * @param {Number} valor
 * @returns {Number}
 */
export function redondear_a_centavos(valor) {
	let numero = Number(valor)

	if (isNaN(numero) || !isFinite(numero)) {
		return numero
	}

	return Math.round(Number((numero * 100).toPrecision(15))) / 100
}

/**
 * El factor por el que los recargos de venta multiplican un precio: Π(1 + p/100).
 *
 * 🔴 Es un PRODUCTO y no una suma, igual que el `price += price * p / 100` de a un recargo que se
 * usaba antes y que aplicar_surchages() sigue haciendo al pie (vender_set_total.js). Con 10% y 5%
 * el factor es 1,155 y no 1,15: si se sumaran los porcentajes, el precio con la opcion prendida y
 * el total con la opcion apagada diferirian en cada venta con dos recargos.
 *
 * Devuelve null si no hay ningun porcentaje usable: "no hay recargo que meter", que no es lo mismo
 * que un factor 1.
 *
 * @param {Array} porcentajes Porcentajes de los recargos elegidos (numero o string decimal).
 * @returns {Number|null}
 */
export function factor_de_recargos(porcentajes) {
	if (!Array.isArray(porcentajes)) {
		return null
	}

	let factor = null

	porcentajes.forEach(porcentaje => {
		let numero = numero_o_null(porcentaje)

		if (numero === null) {
			return
		}

		factor = (factor === null ? 1 : factor) * (1 + numero / 100)
	})

	return factor
}

/**
 * Si un renglon de VENDER lleva los recargos de venta adentro del precio cuando la opcion esta
 * prendida.
 *
 * 🔴 Articulos, combos y promociones SIEMPRE; servicios solo con "recargos en servicios". Hasta
 * esta mision los combos y las promociones quedaban afuera, y con la opcion prendida el recargo
 * NO se les cobraba en ningun lado: aplicar_recargos() no los tocaba y aplicar_surchages() se
 * salteaba el pie. Es la misma regla que usa el pie para cada bucket.
 *
 * @param {Object} item Renglon de VENDER (con is_article / is_combo / ...).
 * @param {*} surchages_in_services
 * @returns {Boolean}
 */
export function renglon_lleva_recargos_de_venta(item, surchages_in_services) {
	if (!item) {
		return false
	}

	if (item.is_article || item.is_combo || item.is_promocion_vinoteca) {
		return true
	}

	if (item.is_service) {
		return Boolean(Number(surchages_in_services))
	}

	return false
}

/**
 * El precio sin recargos que guardo un renglon, o null si no tiene (ver la invariante arriba).
 *
 * @param {Object} pivot
 * @returns {Number|null}
 */
export function precio_sin_recargos_guardado(pivot) {
	if (!pivot) {
		return null
	}
	return numero_o_null(pivot.price_sin_recargos_de_venta)
}

/**
 * Decision 1 de Lucas: un comprobante (venta o presupuesto) guardado ANTES de esta mision con la
 * opcion PRENDIDA queda bloqueado como estaba, porque sus precios tienen el recargo adentro y el
 * sistema no sabe cuanto valian sin el.
 *
 * Es "legado" cuando las tres cosas se cumplen:
 *   1. se guardo con aplicar_recargos_directo_a_items en 1,
 *   2. tiene al menos un recargo, y
 *   3. algun renglon ELEGIBLE -con la regla nueva y con el surchages_in_services GUARDADO- no
 *      tiene precio sin recargos.
 *
 * 🔴 Es el modo de falla SEGURO y no hay que "mejorarlo" adivinando la base con price / factor.
 * Un renglon sin base puede ser un precio escrito a mano que la version vieja NO recargaba, un
 * combo que tampoco, o un renglon que escribio una SPA vieja contra una API nueva: dividirlo por
 * el factor inventaria un precio que nadie cobro. Cualquier camino que deje un renglon elegible
 * sin base en un comprobante con la opcion prendida lo deja bloqueado, y eso esta bien.
 *
 * @param {Object} model Venta o presupuesto tal cual lo devuelve la API (con sus relaciones).
 * @returns {Boolean}
 */
export function comprobante_con_recargos_en_precios_sin_registro(model) {
	if (!model) {
		return false
	}

	if (!Number(model.aplicar_recargos_directo_a_items)) {
		return false
	}

	if (!Array.isArray(model.surchages) || !model.surchages.length) {
		return false
	}

	let renglones_elegibles = []

	let agregar = coleccion => {
		if (Array.isArray(coleccion)) {
			renglones_elegibles = renglones_elegibles.concat(coleccion)
		}
	}

	agregar(model.articles)
	agregar(model.combos)
	agregar(model.promocion_vinotecas)

	if (Number(model.surchages_in_services)) {
		agregar(model.services)
	}

	return renglones_elegibles.some(renglon => {
		return precio_sin_recargos_guardado(renglon ? renglon.pivot : null) === null
	})
}
