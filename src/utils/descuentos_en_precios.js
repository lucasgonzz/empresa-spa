/**
 * Descuentos de venta ADENTRO de los precios de los renglones (mision
 * descuentos-aplicar-al-precio-del-articulo, 8/10/2026). Es el espejo, para el panel Descuentos de
 * VENDER, de lo que utils/recargos_en_precios.js hace para el panel Recargos.
 *
 * La opcion "Aplicar los descuentos de esta venta directamente a los precios de los articulos"
 * decide DONDE se ve el descuento -adentro del precio de cada renglon o al pie, restado al total- y
 * NUNCA si se cobra (decision 1 de Lucas, la misma que con los recargos). Prenderla o apagarla no
 * puede mover el total, salvo algun centavo por unidad: con la opcion prendida el precio del
 * renglon se redondea a centavos (redondear_a_centavos, de utils/recargos_en_precios.js).
 *
 * UNA PILA DE CAPAS. Los renglones ahora pueden llevar dos ajustes de venta adentro del precio, y
 * como todo lo que le pasa a un precio en VENDER es multiplicativo, se apilan asi:
 *
 *   precio base ──► [capa DESCUENTOS] ──► [capa RECARGOS] ──► cuotas · IVA · moneda · oferta
 *        X                × fd = Π(1 − p/100)     × fr = Π(1 + p/100)
 *
 * El orden no cambia el precio final (X·fd·fr·m), pero SI importa para definir lo que se guarda.
 * Cada columna de los renglones guarda el precio JUSTO DEBAJO de su capa:
 *
 *   - pivot.price_sin_recargos_de_venta (la de siempre, NO cambia de significado):
 *       NO NULL <=> el `price` tiene recargos adentro; vale price / fr  = X·fd·m
 *       (si hay descuentos adentro, quedan: es el precio justo debajo de los recargos).
 *   - pivot.price_sin_descuentos_de_venta (NUEVA):
 *       NO NULL <=> el `price` tiene descuentos adentro; vale price / (fd·fr) = X·m
 *       (sin descuentos y sin recargos: es el precio ORIGINAL del renglon).
 *
 * EL PRECIO ORIGINAL de un renglon es entonces la columna de descuentos si no es NULL; si no, la de
 * recargos si no es NULL; si no, el renglon no tiene ningun ajuste de venta adentro y no hay nada
 * que mostrar. Sale gratis de la pila porque los descuentos son la capa de abajo
 * (precio_original_guardado). Con el original a mano, el precio de un renglon guardado se
 * reconstruye siempre desde ese numero y los ajustes de HOY, sin dividir por factores viejos: es
 * exacto y no depende de que descuentos o recargos haya elegido el vendedor al guardar
 * (precio_base_guardado, mixins/generals.js::getPriceVender).
 *
 * Lo que vive aca son las reglas puras (sin `this`) que comparten VENDER (generals.js,
 * vender_set_total.js, set_items_prices.js, previus_sale/index.js, el store), el modal "Actualizar
 * precios" y el panel de descuentos. Si una cambia, cambian todas. Los imports son RELATIVOS (nada
 * de `@/`) para que utils/varios_precios_guardados.js, que no puede usar el alias, siga pudiendo
 * cargar este archivo desde un harness de node.
 */
import { numero_o_null, precio_sin_recargos_guardado } from './recargos_en_precios'

/**
 * El producto de los descuentos elegidos: Π(1 − p/100), SIN filtrar el caso del 100%. Es la cuenta
 * cruda de factor_de_descuentos() y de descuentos_dejan_el_precio_en_cero(), que difieren
 * solamente en que hacen con un resultado que no es positivo.
 *
 * Devuelve null si no hay ningun porcentaje usable ("no hay descuento que meter", que no es lo
 * mismo que un factor 1).
 *
 * @param {Array} porcentajes Porcentajes de los descuentos elegidos (numero o string decimal).
 * @returns {Number|null}
 */
export function producto_de_descuentos(porcentajes) {
	if (!Array.isArray(porcentajes)) {
		return null
	}

	let factor = null

	porcentajes.forEach(porcentaje => {
		let numero = numero_o_null(porcentaje)

		if (numero === null) {
			return
		}

		factor = (factor === null ? 1 : factor) * (1 - numero / 100)
	})

	return factor
}

/**
 * El factor por el que los descuentos de venta multiplican un precio: Π(1 − p/100).
 *
 * 🔴 Es un PRODUCTO y no una suma, igual que el `total -= total * p / 100` de a un descuento que
 * hace aplicar_discounts() al pie (vender_set_total.js): con 10% y 5% el factor es 0,855 y no 0,85.
 * Si se sumaran los porcentajes, el precio con la opcion prendida y el total con la opcion
 * apagada diferirian en toda venta con dos descuentos.
 *
 * 🔴 Devuelve null tambien cuando el factor NO ES POSITIVO (un descuento del 100%, o una cascada
 * que llega a cero o a negativo). Con el precio en cero el original es irrecuperable -habria que
 * dividir por 0 para sacarlo- y apagar la opcion al editar no podria devolver el precio. Ese null es
 * lo que hace que la opcion "no sea efectiva" y que el descuento se siga cobrando al pie: un
 * descuento del 100% NUNCA puede dejar de cobrarse. NO "ARREGLARLO" DEVOLVIENDO 0.
 *
 * @param {Array} porcentajes Porcentajes de los descuentos elegidos (numero o string decimal).
 * @returns {Number|null}
 */
export function factor_de_descuentos(porcentajes) {
	let factor = producto_de_descuentos(porcentajes)

	if (factor === null || !(factor > 0) || !isFinite(factor)) {
		return null
	}

	return factor
}

/**
 * Si los descuentos elegidos, juntos, dejarian el precio en cero (o por debajo): hay al menos un
 * porcentaje usable y el producto Π(1 − p/100) no es positivo. Es la condicion del aviso del panel
 * de descuentos ("con estos descuentos el precio queda en $0 y no se puede aplicar al precio").
 *
 * @param {Array} porcentajes
 * @returns {Boolean}
 */
export function descuentos_dejan_el_precio_en_cero(porcentajes) {
	let producto = producto_de_descuentos(porcentajes)

	return producto !== null && !(producto > 0)
}

/**
 * Los porcentajes de los descuentos elegidos en la venta, en el orden en que estan elegidos. Un id
 * que no esta en el store (un descuento borrado que el catalogo ya no trae) se descarta: lo mismo
 * que hace generals.js con los recargos, para no tirar un TypeError en medio del calculo del
 * precio.
 *
 * El porcentaje es el del store, que al editar un comprobante tiene el HISTORICO del pivot
 * (previus_sale/index.js::set_discounts_store_with_pivot_percetage).
 *
 * @param {Array} discounts_id Ids elegidos (vender.discounts_id).
 * @param {Array} discount_models Modelos del store de descuentos.
 * @returns {Array} Porcentajes (numero o string decimal, tal cual los trae el store).
 */
export function porcentajes_de_descuentos_elegidos(discounts_id, discount_models) {
	if (!Array.isArray(discounts_id) || !Array.isArray(discount_models)) {
		return []
	}

	let porcentajes = []

	discounts_id.forEach(discount_id => {
		let descuento = discount_models.find(discount => discount && discount.id == discount_id)

		if (descuento) {
			porcentajes.push(descuento.percentage)
		}
	})

	return porcentajes
}

/**
 * EL PREDICADO "EFECTIVO": el factor con el que los descuentos de venta van adentro del precio de
 * los renglones elegibles, o null si NO van adentro. Es lo unico que decide, en VENDER:
 *   (a) si el pie se saltea aplicar_discounts() (vender_set_total.js),
 *   (b) si getPriceVender() mete el factor en el precio (generals.js), y
 *   (c) que flag viaja al guardar (aplicar_descuentos_directo_a_items).
 * Las tres miran ESTE resultado y no el flag crudo del store, y no pueden desacordarse:
 *
 *   efectivo  =  la opcion esta prendida
 *             Y  hay al menos un descuento elegido con porcentaje usable
 *             Y  el factor es positivo (un 100% NO es efectivo).
 *
 * (Ver mas abajo descuentos_en_precios_efectivos(): un comprobante LEGADO DE DESCUENTOS cuenta como
 * efectivo aunque su factor no sirva, porque el descuento ya esta adentro de sus precios.)
 *
 * 🔴 NO SUSTITUIR ESTO POR `state.aplicar_descuentos_directo_a_items` A SECAS en ninguno de los tres
 * lugares. Con un descuento del 100% el flag crudo seguiria en 1: el pie se saltearia el descuento
 * (porque "va adentro"), getPriceVender() no lo metaria (porque el factor no sirve) y el flag
 * viajaria en 1 -> el 100% no se cobraria y quedaria un comprobante con la opcion prendida y los
 * precios sin descuento. Es la regla "la opcion decide DONDE, nunca SI".
 *
 * 🔴 Un comprobante LEGADO DE RECARGOS (vender.recargos_en_precios_sin_registro) NO cambia este
 * resultado, y no hay que "protegerlo" con una guarda que lo apague. Una primera version de esta
 * mision lo hacia, pensando que un legado de recargos nunca tiene el flag de descuentos en 1 (el
 * panel se lo deshabilita) y que, si lo tuviera, no habria precio original sobre el cual meter el
 * descuento. Pero SI lo puede tener: lo hereda de lo guardado cuando los dos flags estaban en 1 y
 * las bases en NULL (un comprobante reescrito por una SPA vieja, o editado en el ABM generico de
 * Presupuestos). Ahi los precios YA traen el descuento adentro, y apagar el efectivo hacia que el pie
 * lo restara de nuevo (doble descuento) y que se guardara con el flag en 0, o sea permanente. Cuando
 * el flag viene en 1, el descuento esta adentro, y de eso se encarga el legado de descuentos
 * (comprobante_con_descuentos_en_precios_sin_registro), no este predicado.
 *
 * @param {Object} vender_state state.vender (necesita aplicar_descuentos_directo_a_items y
 *        discounts_id).
 * @param {Array} discount_models state.discount.models.
 * @returns {Number|null}
 */
export function factor_de_descuentos_de_venta(vender_state, discount_models) {
	if (!vender_state || !Number(vender_state.aplicar_descuentos_directo_a_items)) {
		return null
	}

	return factor_de_descuentos(porcentajes_de_descuentos_elegidos(vender_state.discounts_id, discount_models))
}

/**
 * "La opcion esta efectivamente prendida": hay factor (ver factor_de_descuentos_de_venta) O el
 * comprobante abierto es un LEGADO DE DESCUENTOS (vender.descuentos_en_precios_sin_registro).
 *
 * 🔴 El segundo termino es lo que cierra el doble descuento. En un legado de descuentos el comprobante
 * se guardo con la opcion en 1 y sus precios YA tienen el descuento adentro, de una base que no se
 * conoce. Para el pie, para el flag que viaja al guardar y para los renglones NUEVOS eso es
 * exactamente "efectivo": el pie no puede volver a restar el descuento, el flag tiene que seguir en 1
 * (si viajara 0 el doble descuento quedaria guardado para siempre) y un renglon nuevo se tiene que
 * preciar igual que los demas, con el descuento adentro. Lo unico que cambia en un legado es que los
 * renglones guardados se usan tal cual, sin volver a descontar (generals.js, rama del pivot). Con el
 * factor solo, un legado cuyo factor no sirviera (no deberia pasar: viene de una opcion efectiva)
 * dejaria al pie restando lo que ya esta adentro.
 *
 * @param {Object} vender_state
 * @param {Array} discount_models
 * @returns {Boolean}
 */
export function descuentos_en_precios_efectivos(vender_state, discount_models) {
	if (factor_de_descuentos_de_venta(vender_state, discount_models) !== null) {
		return true
	}

	return Boolean(vender_state && vender_state.descuentos_en_precios_sin_registro)
}

/**
 * Si un renglon de VENDER lleva los descuentos de venta adentro del precio cuando la opcion esta
 * efectiva.
 *
 * Articulos, combos y promociones SIEMPRE; servicios solo con "Aplicar descuentos en los
 * servicios". Es la misma regla que usa aplicar_discounts() al pie para cada bucket
 * (vender_set_total.js), y por eso prender o apagar la opcion no cambia a quien le toca el
 * descuento. Un servicio sin esa opcion queda sin descuento adentro Y sin descuento al pie: es lo
 * que hace hoy el pie y se mantiene.
 *
 * @param {Object} item Renglon de VENDER (con is_article / is_combo / ...).
 * @param {*} discounts_in_services
 * @returns {Boolean}
 */
export function renglon_lleva_descuentos_de_venta(item, discounts_in_services) {
	if (!item) {
		return false
	}

	if (item.is_article || item.is_combo || item.is_promocion_vinoteca) {
		return true
	}

	if (item.is_service) {
		return Boolean(Number(discounts_in_services))
	}

	return false
}

/**
 * El comprobante (venta o presupuesto) esta guardado con la opcion de descuentos adentro del precio
 * prendida PERO sin el precio original de algun renglon: un LEGADO DE DESCUENTOS. Es el espejo de
 * comprobante_con_recargos_en_precios_sin_registro() (utils/recargos_en_precios.js), con la misma
 * logica de fondo: el precio guardado tiene un descuento adentro y el sistema no sabe cuanto valia
 * sin el.
 *
 * Es legado cuando las tres cosas se cumplen:
 *   1. se guardo con aplicar_descuentos_directo_a_items en 1,
 *   2. tiene al menos un descuento, y
 *   3. algun renglon ELEGIBLE -articulos, combos y promociones siempre; servicios solo con el
 *      discounts_in_services GUARDADO, la misma regla de renglon_lleva_descuentos_de_venta()- no
 *      tiene precio sin descuentos (pivot.price_sin_descuentos_de_venta en NULL).
 *
 * Como se llega a ese estado, y por eso existe:
 *   - Un presupuesto con el descuento adentro cuyo precio se edita en el ABM generico de Presupuestos:
 *     la API pone las bases en NULL (el precio cambio y la base ya no vale) y PRESERVA el flag en 1.
 *   - Una SPA vieja, cacheada, que reescribe un comprobante con el flag en 1: no conoce la columna
 *     nueva y no manda la base.
 *   - Un comprobante con los dos legados a la vez: flag de recargos y de descuentos en 1 y las bases
 *     en NULL.
 *
 * 🔴 Es el modo de falla SEGURO y no hay que "mejorarlo" adivinando la base ni volviendo a descontar.
 * Sin esta regla, getPriceVender() toma el `price` como si no tuviera ajustes adentro y le mete el
 * descuento OTRA VEZ: 95 pasaba a 85,50 al abrir el comprobante, sin tocar nada. En un legado los
 * renglones guardados se usan tal cual (el descuento ya esta adentro), el pie NO resta los descuentos
 * y el flag sigue viajando en 1; el panel de descuentos bloquea elegir y sacar descuentos,
 * "descuentos en servicios" y la opcion; y la tabla no muestra el precio original.
 *
 * @param {Object} model Venta o presupuesto tal cual lo devuelve la API (con sus relaciones).
 * @returns {Boolean}
 */
export function comprobante_con_descuentos_en_precios_sin_registro(model) {
	if (!model) {
		return false
	}

	if (!Number(model.aplicar_descuentos_directo_a_items)) {
		return false
	}

	if (!Array.isArray(model.discounts) || !model.discounts.length) {
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

	if (Number(model.discounts_in_services)) {
		agregar(model.services)
	}

	return renglones_elegibles.some(renglon => {
		return precio_sin_descuentos_guardado(renglon ? renglon.pivot : null) === null
	})
}

/**
 * El precio sin descuentos de venta que guardo un renglon, o null si no tiene (ver la pila de
 * capas arriba). Un valor ausente -API vieja, columna sin migrar- tambien es null.
 *
 * @param {Object} pivot
 * @returns {Number|null}
 */
export function precio_sin_descuentos_guardado(pivot) {
	if (!pivot) {
		return null
	}
	return numero_o_null(pivot.price_sin_descuentos_de_venta)
}

/**
 * El precio ORIGINAL que guardo un renglon -sin descuentos y sin recargos de venta-, o null si no
 * tiene ningun ajuste de venta adentro. La columna de descuentos si no es NULL; si no, la de
 * recargos si no es NULL; si no, null.
 *
 * @param {Object} pivot
 * @returns {Number|null}
 */
export function precio_original_guardado(pivot) {
	let sin_descuentos = precio_sin_descuentos_guardado(pivot)

	if (sin_descuentos !== null) {
		return sin_descuentos
	}

	return precio_sin_recargos_guardado(pivot)
}

/**
 * El precio BASE desde el que getPriceVender() reconstruye un renglon guardado: su precio original
 * si lo tiene, y si no el `price` tal cual. Con las dos columnas en NULL el price del pivot NO
 * tiene ningun ajuste de venta adentro (la invariante), asi que el price ES la base.
 *
 * Sobre este numero se vuelven a meter los descuentos y los recargos de HOY (los que el vendedor
 * tiene elegidos ahora, con el porcentaje historico que les restauro previus_sale/index.js). Asi,
 * apagar una opcion devuelve cada precio exacto a como estaba, cambiar un ajuste re-precia el
 * renglon, y prender la opcion sobre un comprobante guardado sin ella mete el ajuste adentro.
 *
 * @param {Object} pivot Pivot del renglon guardado (con un `price` ya validado).
 * @returns {Number}
 */
export function precio_base_guardado(pivot) {
	let original = precio_original_guardado(pivot)

	if (original !== null) {
		return original
	}

	return Number(pivot.price)
}

/**
 * El precio original que la tabla de VENDER muestra como "(orig. $ 1.000,00)" debajo del precio de
 * un renglon, o null si no hay que mostrar nada. Lo deja calculado getPriceVender() en
 * item.price_vender_original cada vez que precia el renglon, y solo cuando metio algun factor
 * (de descuentos o de recargos) adentro del precio.
 *
 * No se muestra:
 *   - en un comprobante LEGADO (de recargos o de descuentos): el precio guardado tiene un ajuste
 *     adentro de base desconocida y no se sabe cual era el original;
 *   - en un renglon con `varios_precios`: no tiene UN precio, tiene una suma de filas (y la tabla
 *     muestra esa suma, no `price_vender`);
 *   - si el original no es un numero, o si es igual al precio (un 0% adentro, o un redondeo que no
 *     cambio nada): una linea "(orig. $ 100)" debajo de un "$ 100" es ruido.
 *
 * @param {Object} item Renglon de VENDER.
 * @param {Boolean} legado vender.recargos_en_precios_sin_registro O
 *        vender.descuentos_en_precios_sin_registro (cualquiera de los dos legados).
 * @returns {Number|null}
 */
export function precio_original_a_mostrar(item, legado) {
	if (!item || legado) {
		return null
	}

	if (Array.isArray(item.varios_precios) && item.varios_precios.length) {
		return null
	}

	let original = numero_o_null(item.price_vender_original)
	let precio = numero_o_null(item.price_vender)

	if (original === null || precio === null) {
		return null
	}

	// Los dos vienen redondeados a centavos: medio centavo es la frontera entre "igual" y "distinto".
	if (Math.abs(original - precio) < 0.005) {
		return null
	}

	return original
}
