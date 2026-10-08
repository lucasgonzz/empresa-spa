/**
 * Variantes de un articulo de la cache de articulos (Dexie, src/offline/db.js) para VENDER (mision
 * variantes-mismo-articulo-en-vender, 8/10/2026).
 *
 * El defecto que arregla: con "Usar cache de articulos" o sin conexion, el escaneo busca el codigo en
 * la cache y, si lo encontraba, agregaba el articulo PELADO aunque tuviera variantes: el renglon
 * quedaba sin variante (article_variant_id 0) y el stock se descontaba del articulo y no de la
 * variante. Con conexion y sin cache, la API responde `has_variants` y VENDER abre el selector
 * (SelectVariant.vue); el codigo de una variante, en cambio, sin conexion era "No se encontro
 * articulo" porque el indice local solo conoce articles.bar_code.
 *
 * Que guarda la cache de cada articulo: lo que devuelve GET article/index/from-status
 * (ArticleController@index de la API, con withAll()), o sea el articulo entero con
 * `article_variants` y, de cada variante, sus columnas (`id`, `variant_description`, `price`,
 * `stock`, `image_url`, `bar_code`, `oculta`) y sus `addresses` (con `pivot.amount`). Con eso
 * alcanza para armar lo mismo que manda la API, con UNA diferencia: `precios_por_metodo_pago` de la
 * variante no se puede calcular aca (lo calcula la API con la configuracion del comercio), asi que no
 * se manda y el item conserva el del articulo. Es lo mismo que pasa con una API vieja, y
 * PaymentMethod.vue solo lee de ahi el porcentaje de descuento por metodo, que no depende del precio.
 *
 * Funciones puras (sin store, sin `this`, sin imports): no mutan lo que reciben.
 */

/**
 * Si una variante de la cache esta disponible para vender: la API solo ofrece las que no estan
 * ocultas (`oculta = 0`, VenderController@search_bar_code y ArticleVariantBarCodeHelper). La columna
 * puede llegar como booleano, numero o texto ('0'), y una fila sin la columna (null/undefined) es
 * "no oculta", igual que en la base (default 0).
 *
 * @param {Object} variante Fila de `article.article_variants`.
 * @returns {Boolean}
 */
function variante_disponible(variante) {
	return !Number(variante.oculta || 0)
}

/**
 * El precio de la variante: el propio si tiene (`article_variants.price`), si no el `final_price` del
 * articulo. Misma regla que VenderSearchHelper::get_variant_price de la API (is_null): un precio
 * propio en 0 es un precio valido.
 *
 * @param {Object} article Articulo de la cache.
 * @param {Object} variante Fila de `article.article_variants`.
 * @returns {Number|String|null}
 */
function precio_de_la_variante(article, variante) {
	if (variante.price !== null && typeof variante.price != 'undefined') {
		return variante.price
	}
	return article.final_price
}

/**
 * Las imagenes de la variante: la propia si tiene `image_url`, si no las del articulo. Misma regla que
 * VenderSearchHelper::get_variant_images de la API (clave `hosting_url`, la que lee SelectVariant).
 *
 * @param {Object} article Articulo de la cache.
 * @param {Object} variante Fila de `article.article_variants`.
 * @returns {Array}
 */
function imagenes_de_la_variante(article, variante) {
	if (variante.image_url) {
		return [
			{
				hosting_url: variante.image_url,
			},
		]
	}
	return article.images || []
}

/**
 * Las variantes disponibles (no ocultas) de un articulo de la cache, con la MISMA forma que manda la
 * API en `variants[]` cuando responde `has_variants: true`, que es la que lee SelectVariant.vue y
 * armar_item_de_variante (utils/item_de_variante.js): `variant_id`, `variant_description`,
 * `final_price`, `bar_code`, `images`, `addresses`, `oculta`. Sin `precios_por_metodo_pago` (ver el
 * encabezado).
 *
 * Si el articulo no tiene variantes (o la cache no trajo la relacion), devuelve [] y el escaneo sigue
 * como siempre.
 *
 * @param {Object} article Articulo de la cache.
 * @returns {Array}
 */
export function variantes_disponibles_en_cache(article) {

	let variantes = []

	if (!article || !Array.isArray(article.article_variants)) {
		return variantes
	}

	article.article_variants.forEach(variante => {

		if (!variante_disponible(variante)) {
			return
		}

		variantes.push({
			variant_id: variante.id,
			variant_description: variante.variant_description,
			final_price: precio_de_la_variante(article, variante),
			bar_code: variante.bar_code,
			images: imagenes_de_la_variante(article, variante),
			addresses: variante.addresses || [],
			oculta: variante.oculta,
		})
	})

	return variantes
}

/**
 * La variante disponible de un articulo de la cache cuyo codigo de barras es `codigo`, o null.
 *
 * Se compara el texto tal cual (la API busca `bar_code = codigo`). Las ocultas no cuentan: la API
 * tampoco las encuentra por codigo.
 *
 * @param {Object} article Articulo de la cache.
 * @param {String} codigo Codigo escaneado.
 * @returns {Object|null}
 */
export function variante_por_codigo_en_cache(article, codigo) {

	if (!article || !Array.isArray(article.article_variants) || !codigo) {
		return null
	}

	let encontrada = article.article_variants.find(variante => {
		return variante.bar_code
			&& String(variante.bar_code) === String(codigo)
			&& variante_disponible(variante)
	})

	return encontrada ? encontrada : null
}

/**
 * La fila de una variante escaneada por su codigo, armada desde la cache con la MISMA forma que la
 * `variant_row` de la API (VenderSearchHelper::build_row): `is_variant`, `id` (el del articulo),
 * `variant_id`, `variant_description`, `final_price`, `price_types`, `bar_code`, `stock`, `cost`,
 * `costo_real`, `cost_in_dollars`, `presentacion`, `name`, `article`, `images`, `addresses`.
 *
 * Quien la usa la pone ENCIMA del articulo completo (`Object.assign({}, article, fila)`), igual que
 * ArticleBarCode.vue hace con la `variant_row` de la API: asi stock, depositos, precio y codigo son
 * los de la variante y todo lo demas (costo, iva, descuentos...) el del articulo.
 *
 * @param {Object} article Articulo de la cache.
 * @param {Object} variante Fila de `article.article_variants` (la de variante_por_codigo_en_cache).
 * @returns {Object}
 */
export function fila_de_variante_en_cache(article, variante) {
	return {
		is_variant: true,
		id: article.id,
		variant_id: variante.id,
		variant_description: variante.variant_description,
		final_price: precio_de_la_variante(article, variante),
		price_types: article.price_types,
		bar_code: variante.bar_code,
		stock: typeof variante.stock == 'undefined' ? null : variante.stock,
		cost: article.cost,
		costo_real: article.costo_real,
		cost_in_dollars: article.cost_in_dollars,
		presentacion: article.presentacion,
		// Sin descripcion, el nombre del articulo solo (la API armaba "<nombre> " con un espacio colgando)
		name: variante.variant_description ? article.name + ' ' + variante.variant_description : article.name,
		article: article,
		images: imagenes_de_la_variante(article, variante),
		addresses: variante.addresses || [],
	}
}
