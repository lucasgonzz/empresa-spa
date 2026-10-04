/**
 * Las filas de un comprobante GUARDADO que en VENDER eran UN renglon con "varios precios" vuelven a
 * ser ese renglon al abrirlo para editarlo (mision varios-precios-descuento-renglon, 3/10/2026).
 *
 * POR QUE EXISTE. Un renglon con `varios_precios` se guarda como VARIAS filas del mismo articulo,
 * una por precio (en la venta, SaleHelper::attachArticles de la API; en el presupuesto,
 * vender_presupuestos.js::renglon_de_presupuesto_desde_otro_precio). Al reabrir el comprobante,
 * getItemsPreviusSale() (mixins/vender/previus_sale/index.js) armaba un renglon por fila del pivot:
 * dos o mas renglones con el mismo id y la misma variante, que para el store de VENDER son LA MISMA
 * linea (store/vender/vender.js::es_la_misma_linea). Borrar o editar uno tocaba al primero, el foco
 * de `price-vender-<id>` iba al primero, y al guardar la API contaba dos veces la diferencia de
 * stock (cada edicion sin tocar nada devolvia mercaderia). Es la clase "la identidad de un renglon
 * es id + tipo + variante" (APRENDER_NO_PARCHEAR, 3/10/2026).
 *
 * Aca esas filas pasan a UN renglon con `varios_precios`, con la MISMA forma que arma un ticket de
 * balanza (ArticleBarCode.vue::agregar_linea_de_ticket) y que la API ya sabe guardar: no hay claves
 * nuevas en el contrato. La marca `desde_comprobante_guardado` de cada fila es solo de la SPA (la API
 * no la lee): la usa set_items_prices.js::set_varios_precios_con_recargos() para no recargar, en un
 * comprobante legado, un precio que ya trae el recargo adentro.
 *
 * Regla PURA: sin store, sin `this` y con imports RELATIVOS (nada de `@/`), para que un harness de
 * node la pueda cargar tal cual, sin webpack.
 */
import { numero_o_null, precio_sin_recargos_guardado } from './recargos_en_precios'

/**
 * Si una cantidad de deposito, de devolucion o de acopio (checked_amount, returned_amount,
 * delivered_amount) esta "vacia": null, undefined, '', algo que no es un numero, o 0.
 *
 * El 0 cuenta como vacio a proposito: getItemsPreviusSale() pasa esas columnas por
 * get_pivot_amount(), que deja '' para el null y Number() para el resto, y un "0.00" de la base es
 * "no se chequeo / no se devolvio / no se entrego nada".
 *
 * @param {*} valor
 * @returns {Boolean}
 */
function cantidad_vacia(valor) {
	let numero = numero_o_null(valor)

	return numero === null || numero === 0
}

/**
 * Un id opcional (variante, lista de precios personalizada) normalizado: null, undefined, '', 0 o
 * algo que no es un numero valen 0 ("no tiene"); el resto, el numero.
 *
 * Es el mismo criterio que es_la_misma_linea() del store (`Number(x || 0)`), mas el NaN: un pivot
 * sin la columna (un presupuesto no guarda variante) llega como undefined y getItemsPreviusSale()
 * lo deja en Number(undefined) = NaN, que tiene que ser "sin variante" y no una variante distinta.
 *
 * @param {*} valor
 * @returns {Number}
 */
function id_opcional_normalizado(valor) {
	let numero = Number(valor || 0)

	if (isNaN(numero)) {
		return 0
	}

	return numero
}

/**
 * El descuento de renglon normalizado: sin descuento (null, undefined, '', NaN, 0) vale 0; si no,
 * el porcentaje como numero ("10.00" y 10 son el mismo descuento).
 *
 * El NaN no es teorico: en una VENTA getItemsPreviusSale() lee `pivot.discount ? pivot.discount :
 * pivot.bonus`, y con el descuento en null cae a `bonus`, que solo existe en el presupuesto, y
 * get_pivot_amount(undefined) da NaN. getTotalItem() lo trata como "sin descuento", y aca tambien.
 *
 * @param {*} valor
 * @returns {Number}
 */
function descuento_normalizado(valor) {
	let numero = numero_o_null(valor)

	return numero === null ? 0 : numero
}

/**
 * El nombre personalizado de la linea normalizado: sin nombre (null, undefined) es ''.
 *
 * @param {*} valor
 * @returns {String}
 */
function nombre_normalizado(valor) {
	if (valor === null || typeof valor == 'undefined') {
		return ''
	}

	return String(valor)
}

/**
 * La clave con la que se juntan las filas: dos renglones guardados son filas del MISMO renglon de
 * varios precios si coinciden en todo lo que la API copia del renglon a cada fila.
 *
 *   - id y variante: la identidad del renglon en VENDER (es_la_misma_linea).
 *   - descuento: cada fila guarda el descuento del renglon. Dos filas con descuentos distintos NO
 *     salieron del mismo renglon, y juntarlas le cambiaria el descuento (y el total) a una de ellas.
 *   - nombre personalizado y lista de precios personalizada: idem, son del renglon y la fila los
 *     hereda. Juntar dos filas con nombres o listas distintas reescribiria el de una al guardar.
 *
 * El costo NO entra, a proposito (decision del plan): las filas de un mismo renglon comparten el
 * costo del renglon, y las ventas guardadas antes de esta mision tienen las filas sin costo (todas
 * NULL), asi que tampoco las separaria. El renglon reagrupado lleva el pivot del primero, y con el
 * su costo.
 *
 * JSON.stringify de un array y no un join con separador: el nombre personalizado es texto libre y
 * podria traer cualquier separador adentro.
 *
 * @param {Object} item Renglon de articulo armado por getItemsPreviusSale().
 * @returns {String}
 */
function clave_de_agrupacion(item) {
	return JSON.stringify([
		Number(item.id),
		id_opcional_normalizado(item.article_variant_id),
		descuento_normalizado(item.discount),
		nombre_normalizado(item.name_vender_personalizado),
		id_opcional_normalizado(item.price_type_personalizado_id),
	])
}

/**
 * Si un renglon guardado puede pasar a ser una fila de varios precios.
 *
 * 🔴 NO se reagrupa un renglon que tenga cantidad chequeada, devuelta o entregada, aunque comparta
 * la clave con otros. Esas cantidades son del renglon (deposito, nota de credito, acopio) y una fila
 * de varios precios no las lleva: la API arma cada fila desde el renglon padre y le saca las
 * cantidades a proposito (decision de Lucas: "las cantidades NO se copian"). Juntarlo las borraria en
 * silencio al guardar: la mercaderia chequeada o entregada dejaria de constar y la devuelta volveria
 * a figurar como vendida. Queda como renglon suelto, igual que hasta esta mision.
 *
 * 🔴 Tampoco uno con cantidad 0 (o sin cantidad): en una fila de varios precios la cantidad vacia
 * cuenta como 1, en la SPA (`amount != ''`, y en javascript 0 == '') y en la API (`amount == ''`,
 * que en PHP 7.4 tambien es cierto para el 0). Una fila guardada con cantidad 0 suma 0, y como fila
 * de varios precios pasaria a sumar su precio una vez: abrir y guardar sin tocar nada subiria el
 * total. Es un caso raro (una fila tipeada con cantidad "0", o el unico renglon de un articulo que
 * la API adjunta igual en check_que_este_el_articulos()), pero el total de un comprobante guardado
 * no se mueve solo por abrirlo.
 *
 * Y tampoco uno sin precio guardado en el pivot: la fila toma su precio del pivot, y sin el no hay
 * de donde sacarlo (getPriceVender() tampoco lo usaria: cae al precio del catalogo).
 *
 * @param {Object} item Renglon armado por getItemsPreviusSale().
 * @returns {Boolean}
 */
function se_puede_reagrupar(item) {

	if (!item || !item.is_article) {
		return false
	}

	// Ya es un renglon de varios precios: no hay nada que juntar.
	if (Array.isArray(item.varios_precios)) {
		return false
	}

	if (!item.pivot || numero_o_null(item.pivot.price) === null) {
		return false
	}

	let cantidad = numero_o_null(item.amount)

	if (cantidad === null || cantidad === 0) {
		return false
	}

	return cantidad_vacia(item.checked_amount)
		&& cantidad_vacia(item.returned_amount)
		&& cantidad_vacia(item.delivered_amount)
}

/**
 * El precio de la fila de varios precios que sale de un renglon guardado.
 *
 * Una fila de varios precios lleva en `price_vender` el precio SIN los recargos de venta (lo que
 * tipeo el vendedor): set_varios_precios_con_recargos() le aplica el factor de los recargos en su
 * propia clave. Por eso, en un comprobante normal, es el precio sin recargos que guardo el renglon
 * (pivot.price_sin_recargos_de_venta) y, si esa base es null, el price tal cual: con base null el
 * price NO tiene recargos adentro (la invariante de utils/recargos_en_precios.js). Es exactamente lo
 * que hace getPriceVender() en la rama del pivot.
 *
 * 🔴 En un comprobante LEGADO el precio es SIEMPRE el price tal cual, tenga o no base, porque ahi
 * getPriceVender() usa `item.pivot.price` sin mirar la base, y set_varios_precios_con_recargos() no
 * recarga las filas marcadas `desde_comprobante_guardado`. No alcanza con "base o price": un legado
 * puede tener renglones CON base (los que se agregaron al editarlo despues del 28/9/2026) al lado de
 * los viejos sin base, y si la fila tomara la base -que es el precio sin el recargo- y despues no se
 * recargara, el renglon perderia el recargo y el total bajaria solo al abrirlo.
 *
 * Number() porque la API devuelve las columnas decimales como string ("100.00").
 *
 * @param {Object} pivot Pivot del renglon guardado.
 * @param {Boolean} legado comprobante_con_recargos_en_precios_sin_registro() del comprobante.
 * @returns {Number}
 */
function precio_de_la_fila(pivot, legado) {

	if (!legado) {

		let precio_sin_recargos = precio_sin_recargos_guardado(pivot)

		if (precio_sin_recargos !== null) {
			return precio_sin_recargos
		}
	}

	return Number(pivot.price)
}

/**
 * Junta en UN renglon con `varios_precios` los renglones de articulo de un comprobante guardado que
 * salieron de un mismo renglon de varios precios (ver el encabezado de este archivo).
 *
 * Dos o mas renglones que se pueden reagrupar (se_puede_reagrupar) y que tienen la misma clave
 * (clave_de_agrupacion) pasan a ser UN renglon:
 *   - es el PRIMERO del grupo, con su `pivot` (que en la API congela el costo de las filas, como en
 *     cualquier renglon editado) y todo lo demas que armo getItemsPreviusSale();
 *   - con `varios_precios`: una fila por renglon, en el orden del pivot, con
 *     `{id, price_vender, amount, desde_comprobante_guardado: true}` (precio_de_la_fila);
 *   - con `amount: 1`, como el renglon que arma un ticket de balanza: con varios precios la cantidad
 *     del renglon no cuenta para su total (getTotalItem() suma calculated_price_vender) y la API la
 *     ignora (guarda las filas y descuenta del stock la suma de sus cantidades);
 *   - con `price_vender_personalizado: ''`: un precio "Personalizado" pendiente se tomaria como una
 *     fila sin confirmar (balanzas.js::precio_tipeado_pendiente) y getPriceVender() lo usaria como
 *     precio del renglon;
 *   - y queda en la POSICION del primero del grupo. El resto de los renglones (sueltos, servicios,
 *     combos, promociones, los que no se pueden reagrupar) no se tocan ni cambian de orden.
 *
 * Los ids de las filas son 0, 1, 2... en el orden del pivot: no se repiten y son exactamente los que
 * daria siguiente_id_de_otro_precio() (mixins/vender/varios_precios.js, el mayor + 1) agregando las
 * filas de a una. Una fila que el vendedor agregue despues nace con el siguiente (el mayor + 1).
 * No se importa esa funcion a proposito: vive en un mixin que trae media SPA con imports `@/`, y
 * esta regla tiene que poder cargarse sola.
 *
 * 🔴 Si el comprobante esta en el circuito de DEPOSITO (`to_check` o `checked`), NO se reagrupa
 * nada. Ahi cada renglon es lo que el deposito chequea, con su propia cantidad chequeada, y la API
 * guarda los renglones tal cual llegan (sin descontar stock). Un renglon de varios precios perderia
 * esas cantidades (ver se_puede_reagrupar).
 *
 * 🔴 Y si la cuenta tiene la extension ACOPIOS, tampoco: la entrega se carga por renglon al editar
 * y la API no reparte las cantidades del padre entre las filas (el porque completo, en el cuerpo).
 *
 * No muta lo que recibe: el renglon reagrupado es un objeto nuevo y el pivot se comparte, igual que
 * en cualquier renglon de un comprobante abierto (nadie lo muta: reexpresar_comprobante.js lo
 * reemplaza por una copia).
 *
 * @param {Array} items Renglones armados por getItemsPreviusSale() (articulos, combos, promociones
 *        y servicios, en ese orden).
 * @param {Object} [opciones]
 * @param {*} [opciones.to_check] El `to_check` del comprobante (un presupuesto no lo tiene).
 * @param {*} [opciones.checked] El `checked` del comprobante (un presupuesto no lo tiene).
 * @param {Boolean} [opciones.legado] comprobante_con_recargos_en_precios_sin_registro() del
 *        comprobante (ver precio_de_la_fila).
 * @param {Boolean} [opciones.con_acopios] Si la cuenta tiene la extension acopios: con true no se
 *        reagrupa nada.
 * @returns {Array} Una lista NUEVA de renglones.
 */
export function reagrupar_renglones_con_varios_precios(items, opciones) {

	if (!Array.isArray(items)) {
		return []
	}

	let config = opciones || {}

	/*
		Number() y no la verdad del valor a secas: la base devuelve 0/1 y un "0" serializado como
		string seria truthy. Number(undefined) es NaN, que tambien es falso: un presupuesto no trae
		estas columnas.
	*/
	if (Number(config.to_check) || Number(config.checked)) {
		return items.slice()
	}

	/*
		🔴 Con la extension ACOPIOS tampoco se reagrupa nada: queda un renglon por fila, como hasta
		esta mision. Los tres motivos son de hoy:
		  - Al editar un comprobante con acopios, VENDER muestra la columna "U. Entregadas"
		    (ArticlesTable.vue, con hasExtencion('acopios')): un input por renglon. Una venta con
		    varias filas que todavia no tiene entregas (todas vacias) se reagruparia, y la entrega
		    se cargaria en el renglon padre...
		  - ...pero la API arma cada fila de varios precios desde el padre SACANDOLE las cantidades
		    (entregada, devuelta, chequeada: decision de Lucas), asi que esa entrega se perderia al
		    guardar, sin ningun aviso. Con un renglon por fila, cada fila tiene su input y su
		    delivered_amount llega a la API.
		  - Y el circuito de entregas de la API (AcopioHelper::set_delivered_amount) lee y actualiza
		    el pivot por id de articulo (updateExistingPivot), o sea que pisa TODAS las filas del
		    articulo: el acopio todavia no distingue filas del mismo articulo, y no le toca a esta
		    regla taparlo.
		Lo que se resigna con acopios es justo lo que esta regla vino a arreglar en la SPA (dos
		renglones del mismo articulo son la misma linea para el store), y se acepta: la doble cuenta
		de stock de los renglones repetidos la corrige la API, que junta el descuento de stock por
		articulo + variante aunque le lleguen renglones repetidos. Una entrega perdida, en cambio,
		no la corrige nadie.

		La extension la resuelve quien llama (getItemsPreviusSale(), con hasExtencion): esta regla
		no lee el store.
	*/
	if (config.con_acopios) {
		return items.slice()
	}

	let legado = Boolean(config.legado)

	/*
		Primera pasada: los renglones que se pueden reagrupar, por clave, en el orden en que llegan
		(que es el del pivot).
	*/
	let renglones_por_clave = {}

	items.forEach(item => {

		if (!se_puede_reagrupar(item)) {
			return
		}

		let clave = clave_de_agrupacion(item)

		if (!renglones_por_clave[clave]) {
			renglones_por_clave[clave] = []
		}

		renglones_por_clave[clave].push(item)
	})

	/*
		Segunda pasada: se arma la lista final respetando el orden. El renglon reagrupado entra donde
		estaba el primero de su grupo, y los demas del grupo se saltean. Un grupo de UN renglon queda
		como estaba: un renglon suelto no es un renglon de varios precios, y pasarlo a uno le dejaria
		el precio fijo (no se volveria a calcular con la lista ni con la cantidad).
	*/
	let resultado = []

	items.forEach(item => {

		if (!se_puede_reagrupar(item)) {
			resultado.push(item)
			return
		}

		let grupo = renglones_por_clave[clave_de_agrupacion(item)]

		if (grupo.length < 2) {
			resultado.push(item)
			return
		}

		if (grupo[0] !== item) {
			// Ya entro como fila del renglon reagrupado, en la posicion del primero.
			return
		}

		let varios_precios = []

		grupo.forEach((renglon, indice) => {
			varios_precios.push({
				id: indice,
				price_vender: precio_de_la_fila(renglon.pivot, legado),
				amount: Number(renglon.amount),
				desde_comprobante_guardado: true,
			})
		})

		resultado.push(Object.assign({}, item, {
			varios_precios,
			amount: 1,
			price_vender_personalizado: '',
		}))
	})

	return resultado
}
