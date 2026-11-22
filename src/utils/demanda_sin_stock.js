// Demanda no satisfecha en Vender (misión demanda-sin-stock-vender, 21/11/2026).
//
// Funciones PURAS (sin store, sin red, sin DOM) que arman lo que la SPA le manda a la API cuando
// Vender frena un artículo por falta de stock, y el texto del aviso que se le muestra al vendedor.
// Viven acá y no en el mixin para poder probarlas con `node --test` sin levantar nada.

/** Motivo: no había nada de stock (o el artículo estaba en 0 al elegirlo). */
export const MOTIVO_SIN_STOCK = 'sin_stock'

/** Motivo: había stock pero no alcanzaba para la cantidad pedida. */
export const MOTIVO_STOCK_INSUFICIENTE = 'stock_insuficiente'

/**
 * Normaliza un id opcional: 0, '' o ausente pasan a null (así lo pide el contrato de la API).
 *
 * @param {number|string|null|undefined} valor Id crudo.
 * @returns {number|null}
 */
function id_o_null(valor) {
	if (valor === undefined || valor === null || valor === '' || Number(valor) === 0) {
		return null
	}
	return Number(valor)
}

/**
 * Arma el registro de un freno para un artículo (o para un componente de combo).
 * `item.id` es SIEMPRE el id del artículo, también en variantes; la variante viaja aparte.
 *
 * @param {object} item Artículo (o componente) frenado.
 * @param {string} motivo MOTIVO_SIN_STOCK | MOTIVO_STOCK_INSUFICIENTE.
 * @param {number|null} cantidad_pedida Cantidad que se quiso vender; null si el freno fue al elegir.
 * @param {number|null} stock_disponible Stock contra el que el sistema comparó.
 * @param {number|null} combo_id Id del combo cuando el freno fue por uno de sus componentes.
 * @returns {object} Registro con las seis claves del contrato (sin sucursal ni empleado).
 */
export function registro_de_articulo(item, motivo, cantidad_pedida, stock_disponible, combo_id) {
	return {
		article_id: item.id,
		article_variant_id: id_o_null(item.article_variant_id || item.variant_id),
		combo_id: id_o_null(combo_id),
		motivo: motivo,
		cantidad_pedida: cantidad_pedida === undefined ? null : cantidad_pedida,
		stock_disponible: stock_disponible === undefined ? null : stock_disponible,
	}
}

/**
 * Arma el cuerpo del POST `unmet-demand`: el registro más la sucursal y el empleado de Vender.
 *
 * @param {object} registro Salida de registro_de_articulo.
 * @param {number} address_id Sucursal elegida en Vender (0 = sin elegir).
 * @param {number} employee_id Empleado elegido en Vender (0 = ninguno).
 * @returns {object} Payload del contrato (§2.3 del plan).
 */
export function payload_de_registro(registro, address_id, employee_id) {
	return {
		article_id: registro.article_id,
		article_variant_id: id_o_null(registro.article_variant_id),
		combo_id: id_o_null(registro.combo_id),
		address_id: id_o_null(address_id),
		employee_id: id_o_null(employee_id),
		motivo: registro.motivo,
		cantidad_pedida: registro.cantidad_pedida === undefined ? null : registro.cantidad_pedida,
		stock_disponible: registro.stock_disponible === undefined ? null : registro.stock_disponible,
	}
}

/**
 * Une nombres entre «» con comas y una "y" final: «A», «B» y «C».
 *
 * @param {string[]} nombres Nombres de artículos.
 * @returns {string}
 */
function nombres_entre_comillas(nombres) {
	let entrecomillados = []
	nombres.forEach(nombre => {
		entrecomillados.push('«' + nombre + '»')
	})
	if (entrecomillados.length <= 1) {
		return entrecomillados.join('')
	}
	let ultimo = entrecomillados.pop()
	return entrecomillados.join(', ') + ' y ' + ultimo
}

/**
 * Texto del aviso que se muestra tras guardar el freno.
 *
 * @param {object} aviso `{ ids, nombres, motivo, combo_nombre }` guardado en el store.
 * @returns {{titulo: string, cuerpo: string, pregunta: string}}
 */
export function texto_del_aviso(aviso) {
	let nombres = aviso.nombres && aviso.nombres.length ? aviso.nombres : []
	let que_stock = aviso.motivo === MOTIVO_STOCK_INSUFICIENTE ? 'no había stock suficiente' : 'no había stock'
	let sujeto = nombres_entre_comillas(nombres)
	if (aviso.combo_nombre) {
		sujeto += ' del combo «' + aviso.combo_nombre + '»'
	}
	return {
		titulo: 'Se guardó como sugerencia de compra',
		cuerpo: 'El sistema no dejó agregar ' + sujeto + ' porque ' + que_stock + '. '
			+ 'Lo tomamos como que lo quisieron comprar y no había, '
			+ 'así que quedó anotado como sugerencia de compra.',
		pregunta: '¿Fue un error? Tocá Cancelar.',
	}
}
