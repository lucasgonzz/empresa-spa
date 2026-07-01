import article from '@/models/article'

/**
 * Propiedades del articulo visibles por defecto en la tabla de vender.
 * Todo lo que no este en esta lista arranca oculto (not_show: true) para no
 * romper la vista de los clientes actuales al desplegar este cambio.
 */
const ARTICLE_KEYS_VISIBLE_BY_DEFAULT_IN_VENDER = ['name', 'bar_code']

/**
 * Overrides puntuales por key: en vender, bar_code usa un gate de extension
 * propio (bar_codes_in_vender_table), distinto al que pueda tener en el
 * modelo articulo (ABM articulos).
 */
const ARTICLE_PROPERTY_OVERRIDES_IN_VENDER = {
	bar_code: { if_has_extencion: 'bar_codes_in_vender_table' },
}

/**
 * Catalogo de propiedades del articulo, adaptado al contexto de vender.
 * Se excluyen: separadores (group_title), props sin key, y columnas de
 * tipo boton (no configurables en ningun modulo del sistema).
 *
 * @return {Array}
 */
function build_article_properties_for_vender() {
	return article.properties
		.filter(function (prop) {
			return typeof prop.group_title == 'undefined'
				&& typeof prop.key != 'undefined'
				&& prop.key !== null
				&& prop.key !== ''
				&& prop.type != 'button'
		})
		.map(function (prop) {
			var override = ARTICLE_PROPERTY_OVERRIDES_IN_VENDER[prop.key] || {}
			return Object.assign({}, prop, override, {
				not_show: ARTICLE_KEYS_VISIBLE_BY_DEFAULT_IN_VENDER.indexOf(prop.key) === -1,
			})
		})
}

/**
 * Propiedades propias del modulo vender, sin equivalente en el modelo articulo.
 * Todas visibles por defecto: reemplazan/eran ya columnas fijas siempre visibles hoy.
 */
var VENDER_OWN_PROPERTIES = [
	{
		key: 'price_vender',
		text: 'Precio de venta',
		type: 'number',
	},
	{
		key: 'discount',
		text: 'Descuento',
		type: 'number',
		can: 'vender.article_discount',
	},
	{
		key: 'total',
		text: 'Total',
		type: 'number',
	},
	{
		key: 'price_type_personalizado_id',
		text: 'Lista de precio individual',
		type: 'display',
		if_has_extencion: 'cambiar_price_type_en_vender_item_por_item',
	},
]

export default {
	properties: build_article_properties_for_vender().concat(VENDER_OWN_PROPERTIES),
}
