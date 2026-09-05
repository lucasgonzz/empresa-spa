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
 * Corre el armado de UNA familia de columnas dinamicas aislando su error del resto.
 *
 * 🔴 POR QUE EXISTE: las tres familias (listas de precio, descuentos por metodo de pago y
 * sucursales) se arman una atras de otra en add_article_dynamic_columns(). Sin aislarlas, un dato
 * inconsistente en la segunda deja al listado sin la tercera — y el usuario ve desaparecer las
 * columnas de sucursal y el boton de editar stock por algo que no tiene ninguna relacion con eso.
 *
 * Paso de verdad en la produccion de masquito el 3/9/2026, con un descuento cuyo metodo de pago
 * habia sido borrado. La causa puntual de ese dia ya tiene su guarda propia mas abajo; esto es para
 * la proxima, que va a ser otro dato y otra familia.
 *
 * ⚠️ NO se traga el error en silencio: lo escribe en la consola con el nombre de la familia. Un
 * catch mudo cambiaria un listado roto por un listado incompleto sin explicacion, que es peor de
 * diagnosticar.
 *
 * @param {string} familia Nombre legible, para el mensaje de consola.
 * @param {Function} armar Funcion que agrega las columnas de esa familia.
 * @return {void}
 */
function agregar_familia(familia, armar) {
	try {
		armar()
	} catch (error) {
		console.error(
			'No se pudieron armar las columnas dinamicas de articulo de "' + familia + '". '
			+ 'Las demas columnas se arman igual. Detalle:',
			error
		)
	}
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

		agregar_familia('listas de precio', function () {
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
		})
	}

	// Sin sentido como columna del Listado si el dueno usa listas de precio (prompt 254):
	// el descuento se calcula sobre final_price, que deja de ser la base de venta real.
	if (!usa_listas && (collections.payment_method_discounts || []).length) {

		/**
		 * 🔴 SE FILTRAN LOS DESCUENTOS SIN METODO DE PAGO, Y ESTO NO ES DEFENSIVO PORQUE SI:
		 * paso en la produccion de masquito el 3/9/2026 y dejo el listado de articulos inutilizable.
		 *
		 * Borrar un metodo de pago desde el ABM no borra sus current_acount_payment_method_discounts
		 * (CurrentAcountPaymentMethodController::destroy no los toca y la tabla no tiene FK con
		 * cascade), asi que el descuento queda apuntando a un metodo que ya no existe. Leerle `.name`
		 * a esa relacion nula tiraba un TypeError, y como las columnas de sucursal se agregan MAS
		 * ABAJO en esta misma funcion, la excepcion se las llevaba puestas junto con el boton de
		 * editar stock. Tres sintomas que no se parecen en nada a "borre un metodo de pago".
		 *
		 * Un descuento sin metodo no puede ser una columna: no tiene nombre que mostrar ni regla que
		 * aplicar. Se omite y listo.
		 */
		agregar_familia('descuentos por metodo de pago', function () {
			let discounts_utilizables = collections.payment_method_discounts.filter(function (discount) {
				return !!(discount && discount.current_acount_payment_method)
			})

			let discount_props = discounts_utilizables.map(function (discount) {
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
		})
	}

	agregar_familia('sucursales', function () {
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
	})

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
