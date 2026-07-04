const PRICE_TYPE_INSERT_AFTER = ['costo_real', 'cost', 'price', 'name', 'provider_order', 'bar_code', 'images', 'num']
const ADDRESS_INSERT_AFTER = ['stock', 'name', 'price', 'cost', 'provider_order', 'bar_code', 'images', 'num']
const PAYMENT_DISCOUNT_INSERT_AFTER = ['final_price', 'price', 'cost', 'name', 'provider_order', 'bar_code', 'images', 'num']

/**
 * Primer indice de props cuya key este en keys_priority (en ese orden de prioridad),
 * +1 para insertar justo despues. Si ninguna existe, al final del array.
 *
 * @param {Array} props
 * @param {Array} keys_priority
 * @returns {number}
 */
function find_insert_index(props, keys_priority) {
	let index = -1
	let i = 0
	while (index === -1 && i < keys_priority.length) {
		index = props.findIndex(function (p) { return p.key === keys_priority[i] })
		i++
	}
	return index === -1 ? props.length : index + 1
}

/**
 * Inserta new_props (mutando y retornando props) despues de la primera key encontrada
 * en insert_after_keys, preservando el orden entre si de new_props.
 *
 * @param {Array} props
 * @param {Array} new_props
 * @param {Array} insert_after_keys
 * @returns {Array}
 */
function splice_props(props, new_props, insert_after_keys) {
	let index = find_insert_index(props, insert_after_keys)
	new_props.forEach(function (prop, i) {
		props.splice(index + i, 0, prop)
	})
	return props
}

/**
 * Unico lugar de la regla "el dueno usa listas de precio". Cualquier chequeo nuevo en JS
 * debe llamar a esta funcion en vez de repetir el OR de extensiones (la duplicacion de esta
 * regla en dos lugares fue la causa del bug del prompt 254).
 *
 * @param {Object} context objeto con authenticated y hasExtencion()
 * @returns {boolean}
 */
export function usa_lista_de_precios(context) {
	return !!(
		context.authenticated
		&& (
			context.hasExtencion('articulo_margen_de_ganancia_segun_lista_de_precios')
			|| context.hasExtencion('lista_de_precios_por_categoria')
		)
	)
}

/**
 * Mismo criterio que puede_ver_address() de payment_method_discounts_addresses_columns.js:
 * empleados con permiso article.stock_only_sucursal solo ven su propio deposito asignado.
 *
 * @param {Object} context objeto con is_admin, can(), user
 * @param {Object} address
 * @returns {boolean}
 */
export function puede_ver_address(context, address) {
	if (!context.is_admin && context.can('article.stock_only_sucursal')) {
		return !!(context.user && context.user.address_id == address.id)
	}
	return true
}

/**
 * Agrega (mutando y retornando) las columnas calculadas dinamicamente del articulo: listas
 * de precio, depositos y descuentos por metodo de pago — con el mismo gating y orden por
 * defecto que aplica hoy el Listado. Unico lugar de esta logica: la usan tanto el catalogo
 * de columnas elegibles (ojito) como el fallback sin personalizar.
 *
 * Si el dueno usa listas de precio, ademas quita percentage_gain/price/final_price del
 * catalogo base (no tienen sentido como precio unico cuando el precio depende de la lista) —
 * mismo comportamiento que quitar_props_de_precios() tenia hoy.
 *
 * @param {Array} props
 * @param {Object} context { authenticated, hasExtencion, is_admin, can, user }
 * @param {Object} collections { price_types, addresses, payment_method_discounts }
 * @returns {Array}
 */
export function add_article_dynamic_columns(props, context, collections) {
	let usa_listas = usa_lista_de_precios(context)

	if (usa_listas) {

		props = props.filter(function (prop) {
			return prop.key != 'percentage_gain' && prop.key != 'price' && prop.key != 'final_price'
		})

		let price_type_props = (collections.price_types || []).map(function (price_type) {
			return {
				key: 'price_type_' + price_type.id,
				text: price_type.name,
				type: 'text',
				no_usar_en_filtros: true,
				not_show_on_form: true,
				dynamic_article_column: true,
			}
		})
		splice_props(props, price_type_props, PRICE_TYPE_INSERT_AFTER)
	}

	// Sin sentido como columna del Listado si el dueno usa listas de precio (prompt 254):
	// el descuento se calcula sobre final_price, que deja de ser la base de venta real.
	if (!usa_listas && (collections.payment_method_discounts || []).length) {

		let discount_props = collections.payment_method_discounts.map(function (discount) {
			return {
				key: 'payment_method_discount_' + discount.id,
				text: discount.current_acount_payment_method.name,
				type: 'text',
				no_usar_en_filtros: true,
				not_show_on_form: true,
				dynamic_article_column: true,
			}
		})
		splice_props(props, discount_props, PAYMENT_DISCOUNT_INSERT_AFTER)
	}

	let address_props = (collections.addresses || [])
		.filter(function (address) { return puede_ver_address(context, address) })
		.map(function (address) {
			return {
				key: 'address_' + address.id,
				text: address.street,
				type: 'text',
				not_show_on_form: true,
				no_usar_en_filtros: true,
				dynamic_article_column: true,
			}
		})
	splice_props(props, address_props, ADDRESS_INSERT_AFTER)

	return props
}

/**
 * Propiedades de price_type para las tarjetas del modal de edicion de articulo (margen/precio
 * por lista) — SIEMPRE completas, independientes de que el usuario haya ocultado esa lista como
 * columna de la tabla. Vease check_propiedades_extras() en view/Index.vue: las inserta via el
 * flag propiedad_extra_para_modal, sin pasar por props_to_show/visibilidad de tabla.
 *
 * @param {Object} context objeto con authenticated y hasExtencion()
 * @param {Array} price_types
 * @returns {Array}
 */
export function build_price_type_modal_extra_properties(context, price_types) {
	if (!usa_lista_de_precios(context)) {
		return []
	}
	return (price_types || []).map(function (price_type) {
		return {
			key: 'price_type_' + price_type.id,
			text: price_type.name,
			type: 'text',
			no_usar_en_filtros: true,
			propiedad_extra_para_modal: true,
			insert_after_keys: PRICE_TYPE_INSERT_AFTER,
		}
	})
}
