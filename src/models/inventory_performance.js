import article from '@/models/article'

/**
 * Propiedades del articulo visibles por defecto en la tabla de alertas de stock minimo.
 * Todo lo que no este en esta lista arranca oculto (not_show: true) para no
 * romper la vista de los clientes actuales al desplegar este cambio.
 */
const ARTICLE_KEYS_VISIBLE_BY_DEFAULT = [
	'id', 'bar_code', 'provider_code', 'name', 'final_price', 'provider_id', 'stock', 'stock_min',
]

/**
 * Catalogo de propiedades del articulo. Se excluyen: separadores (group_title),
 * props sin key, y columnas de tipo boton (no configurables en ningun modulo).
 *
 * @return {Array}
 */
function build_article_properties() {
	return article.properties
		.filter(function (prop) {
			return typeof prop.group_title == 'undefined'
				&& typeof prop.key != 'undefined'
				&& prop.key !== null
				&& prop.key !== ''
				&& prop.type != 'button'
		})
		.map(function (prop) {
			return Object.assign({}, prop, {
				not_show: ARTICLE_KEYS_VISIBLE_BY_DEFAULT.indexOf(prop.key) === -1,
			})
		})
}

/**
 * Propiedades propias de la alerta de stock minimo, sin equivalente directo en el
 * modelo articulo: vienen del pivot de la relacion InventoryPerformance::articles_stock_minimo().
 * Todas visibles por defecto: son las columnas que ya se muestran hoy siempre.
 */
var OWN_PROPERTIES = [
	{
		key: 'address_id',
		text: 'Depósito',
		type: 'search',
		use_store_models: true,
		/* address.js usa "street" como campo de nombre, no "name"/"nombre" */
		relation_prop_name: 'street',
		from_pivot: true,
	},
	{
		key: 'stock_address',
		text: 'Stock del depósito',
		type: 'number',
		from_pivot: true,
	},
	{
		key: 'stock_min_address',
		text: 'Stock mínimo del depósito',
		type: 'number',
		from_pivot: true,
	},
]

export default {
	properties: build_article_properties().concat(OWN_PROPERTIES),
}
