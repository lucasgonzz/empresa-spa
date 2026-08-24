/**
 * Propiedades que arrancan tildadas en el buscador general, por modelo.
 *
 * Antes el default era 'name' mas las `default_extra_props` que pasara cada vista, y la unica
 * vista que pasaba alguna era el Listado de articulos. Como sale, provider_order, order y
 * movimiento_caja no tienen prop 'name', Ventas, Compras, Pedidos online y Movimientos
 * arrancaban con CERO propiedades tildadas: el buscador no buscaba por nada hasta que el
 * usuario abria el desplegable y tildaba algo a mano.
 *
 * Las keys van planas, sin separar propias de relaciones: la clasificacion la hace
 * buscador-general/Index.vue contra own_props / relation_props, que es donde ya vive ese
 * conocimiento (y ademas depende de las extensiones activas del cliente).
 *
 * 🔴 ESTA TABLA ESTA DUPLICADA A PROPOSITO. Su espejo en la API es
 * `empresa-api/app/Http/Controllers/Helpers/GlobalSearchDefaultsHelper.php`, que es el que
 * siembra las preferencias en la base. Si tocas esta tabla, toca tambien ese archivo.
 * No se unifican con un endpoint: el front necesita el mapa de forma sincronica para el
 * instante anterior a que responda el GET de la preferencia, y para las bases donde el seeder
 * todavia no corrio. Un endpoint convertiria un default sincronico en una llamada de red mas
 * en el arranque de cada vista.
 */
export const global_search_defaults = {
	article: ['bar_code', 'provider_code', 'name'],
	sale: ['num', 'client_id', 'employee_id', 'observations'],
	provider: ['name', 'razon_social'],
	provider_order: ['num', 'provider_id'],
	client: ['name', 'cuit', 'razon_social'],
	seller: ['name'],
	order: ['num', 'buyer_id'],
	buyer: ['name', 'email'],
	caja: ['name', 'address_id', 'employee_id'],
	movimiento_caja: ['concepto_movimiento_caja_id'],
}

/**
 * Keys tildadas por defecto para un modelo. Los modelos que no estan en la tabla (los ABM, por
 * ejemplo) mantienen el comportamiento de siempre: 'name' y nada mas.
 *
 * Devuelve una copia: quien la recibe arma su seleccion sobre el array y no debe poder mutar la
 * tabla compartida.
 *
 * @param {String} model_name
 * @returns {Array} keys
 */
export function global_search_default_keys(model_name) {
	if (model_name && Object.prototype.hasOwnProperty.call(global_search_defaults, model_name)) {
		return global_search_defaults[model_name].slice()
	}
	return ['name']
}
