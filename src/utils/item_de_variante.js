/**
 * Item de VENDER para una variante elegida en el selector de variantes (mision
 * selector-de-variantes-con-precio-propio, 3/10/2026).
 *
 * El defecto que arregla: al escanear el codigo de un ARTICULO que tiene variantes se abre el selector
 * (components/vender/modals/SelectVariant.vue) y, al elegir una, el item se armaba con
 * `{...article, is_variant, variant_id, variant_description}`. O sea que `final_price` era el del
 * ARTICULO aunque la variante tuviera un precio propio: getPriceVender() (mixins/generals.js) lee
 * `item.final_price`, y el guardado de la venta usa lo que calcula la SPA, asi que la variante se
 * vendia al precio del articulo. La MISMA variante escaneada por su propio codigo (`variant_row`,
 * ArticleBarCode.vue) o elegida por nombre ya usa su precio propio: el mismo producto salia a precios
 * distintos segun el camino por el que entraba.
 *
 * La API ya manda lo necesario en cada `variants[]` (VenderController@search_bar_code, rama
 * `has_variants`): `final_price` es el precio propio de la variante si lo tiene y, si no, el del
 * articulo (VenderSearchHelper::get_variant_price, la misma cuenta que usa el escaneo por codigo de
 * variante). La SPA nunca lo leia. Esta funcion lo lee.
 *
 * Es una funcion pura (sin store ni `this`, sin imports) y no muta lo que recibe: devuelve un objeto
 * NUEVO. Por eso se puede probar sin DOM.
 */

/**
 * Si la variante trae un valor utilizable para `final_price`. `undefined`, `null` y `''` son "no
 * trae" (API vieja, o un precio que no llego); el `0` y el `'0.00'` SI son un precio propio: una
 * variante a $0 es valida y se vende a $0, igual que en el escaneo por codigo de variante y en la
 * busqueda por nombre. Preguntar por la veracidad (`if (variant.final_price)`) tiraria ese precio a
 * la basura y volveria a vender la variante al precio del articulo.
 *
 * @param {*} valor
 * @returns {Boolean}
 */
function trae_precio(valor) {
	return valor !== null && typeof valor != 'undefined' && valor !== ''
}

/**
 * Arma el item de venta de una variante elegida en el selector: el articulo padre + la marca de que
 * es una variante puntual + lo PROPIO de la variante que cambia lo que se cobra.
 *
 * Shape real que manda el back para cada variante: `variant_id`, `variant_description`, `images`,
 * `final_price`, `bar_code`, `addresses`, `oculta` y, desde esta mision, `precios_por_metodo_pago`
 * (opcional: una API vieja no lo manda).
 *
 * Lo que se pisa, y solo si la variante lo trae:
 *
 *   - `final_price`: el precio de la variante. Ya es el del articulo cuando la variante no tiene uno
 *     propio, asi que pisarlo nunca empeora nada. Si no llegara (API muy vieja, o `null` / `''`), el
 *     item queda como hasta ahora, con el del articulo.
 *   - `precios_por_metodo_pago`: el desglose por metodo de pago calculado sobre ESE precio. Ojo con
 *     la diferencia: aca `null` SI es un valor valido y se pisa (es lo que manda la API cuando el
 *     flag `precio_base_incluye_tarjeta` esta apagado: "no hay desglose"), y lo que cuenta es que la
 *     clave exista. Con una API vieja la clave no viene y el item conserva el del articulo, que da el
 *     mismo porcentaje de descuento por metodo (PaymentMethod.vue solo lee
 *     `discount_percentage_vs_etiqueta`, que no depende del precio).
 *
 * 🔴 Lo que NO se pisa, a proposito, aunque la variante lo traiga: `stock`, `addresses`, `cost`,
 * `costo_real`, `cost_in_dollars`, `bar_code`, `images`, `name`, `price_types`, `final_price_blanco`.
 * Es el lugar exacto donde alguien va a querer "simplificar" haciendo
 * `Object.assign({}, article, variant)` o copiando todo lo de la variante, y no es lo que se pidio:
 *
 *   - `stock` y `addresses`: son los que usan `check_stock_mayor_a_cero` y `check_stock_disponible`
 *     (los bloqueos y avisos de venta) y lo que pide la sucursal. Hoy el selector los toma del
 *     articulo; cambiarlos a los de la variante cambiaria cuando se bloquea o se avisa una venta, y
 *     eso es una decision aparte (el escaneo por codigo de variante y la busqueda por nombre SI usan
 *     los de la variante: es una diferencia conocida entre caminos, no un olvido de esta funcion).
 *   - `cost` / `costo_real` / `cost_in_dollars`: el guardado de la venta (SaleHelper::getCost) los lee
 *     de la RAIZ del item y la variante no los trae. Por eso el item parte del ARTICULO COMPLETO y no
 *     de una fila de variante (build_row es plana): con la fila sola la linea saldria sin costo y con
 *     ganancia igual al precio.
 *   - `name`, `bar_code`, `images`: el nombre del item es solo el del articulo (getItemDisplayName,
 *     mixins/generals.js, le suma la variante al mostrarlo); tomar el `name` de una fila de variante
 *     ("Articulo Azul 36") duplicaria la variante en el nombre.
 *
 * `variant_description` ("Azul 36") va si o si: sin ella la columna "Variante" del remito queda vacia
 * y el nombre sale sin la variante, porque el articulo padre no la trae.
 *
 * @param {Object} article Articulo padre (el que deja SelectVariant en el store: `vender/article_for_sale`).
 * @param {Object} variant Variante elegida (variant_id, variant_description, final_price, precios_por_metodo_pago opcional, ...).
 * @returns {Object} Item nuevo para set_item_vender (mixins/vender/index.js); `article` y `variant` quedan intactos.
 */
export function armar_item_de_variante(article, variant) {

	let item = {
		...article,
		is_article: true,
		is_variant: true,
		variant_id: variant.variant_id,
		variant_description: variant.variant_description,
	}

	if (trae_precio(variant.final_price)) {
		item.final_price = variant.final_price
	}

	/*
		Se mira que la clave EXISTA, no que tenga contenido: `null` es un valor valido de la API
		("flag apagado") y tiene que pisar al del articulo, que se calculo con otro precio.
	*/
	if (typeof variant.precios_por_metodo_pago != 'undefined') {
		item.precios_por_metodo_pago = variant.precios_por_metodo_pago
	}

	return item
}
