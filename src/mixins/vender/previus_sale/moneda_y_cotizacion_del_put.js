/**
 * La MONEDA y la COTIZACION que viajan en el PUT de una venta guardada (mision
 * edicion-completa-ventas-presupuestos, 8/10/2026). Las usa updateSale() en previus_sale/index.js.
 *
 * El contrato con la API (SaleController@update): `moneda_id` es la SEÑAL. Con `moneda_id` en el
 * PUT la API guarda la moneda y, si `valor_dolar` es mayor que cero, la cotizacion; con
 * `valor_dolar` null (o 0) conserva la cotizacion guardada.
 *
 * Son funciones puras (sin Vue ni store) para poder probarlas solas con node.
 */
import { moneda_de_cuenta_normalizada } from '@/mixins/vender/previus_sale/aviso_cambio_de_cuenta'

/**
 * La moneda que viaja: la del store, NORMALIZADA, nunca null (NULL, 0 o vacio -> 1, pesos), con la
 * misma regla que CotizacionDeVentaHelper::normalizar_moneda_id.
 *
 * Por que nunca null: para la API, `moneda_id` null es "no toques ni la moneda ni la cotizacion".
 * Una venta vieja sin moneda (NULL) a la que el vendedor le corrige la cotizacion perderia la
 * correccion en silencio. Mandando 1, la API la lee como pesos --que es lo que esa venta es-- y
 * guarda la cotizacion. No cambia de cuenta corriente: la API compara las monedas normalizadas.
 *
 * @param {*} moneda_del_store `vender.moneda_id`.
 * @returns {Number}
 */
export function moneda_para_el_put_de_la_venta(moneda_del_store) {
	return moneda_de_cuenta_normalizada(moneda_del_store)
}

/**
 * La cotizacion que viaja: la del store, salvo que sea una cotizacion que NADIE quiso ponerle a la
 * venta. En ese caso viaja null y la API conserva la que la venta tenia guardada.
 *
 * 🔴 EL CASO. Al abrir una venta que no tenia cotizacion (null o 0), Moneda.vue::iniciar_dolar()
 * pone el dolar del sistema en el campo USD, para que el vendedor tenga uno si pasa la venta a
 * dolares. Si el PUT lo mandara, la API --que desde esta mision honra `valor_dolar` junto con
 * `moneda_id`-- le grabaria el dolar del dia a cualquier venta sin cotizacion que se editara por
 * cualquier motivo (corregir una observacion), y eso cambia lo que diria una factura posterior. 2R
 * tiene 44 ventas en dolares asi. Por eso viaja null cuando se cumplen las TRES:
 *   (a) la venta, como estaba guardada, no tenia cotizacion (null o 0);
 *   (b) la moneda no cambia (comparadas normalizadas: NULL es pesos);
 *   (c) el vendedor no escribio en el campo USD (`cotizacion_editada_a_mano`, que prende solo el
 *       @input del campo).
 * Si cambia la moneda viaja la cotizacion vigente, como hasta ahora: es con la que se convirtieron
 * los renglones. Si el vendedor la escribio, viaja lo que escribio. Y si la venta ya tenia una, viaja
 * la del campo (que arranca siendo esa).
 *
 * @param {Object} venta_original La venta guardada (`previus_sale`).
 * @param {*} moneda_del_store `vender.moneda_id`.
 * @param {*} valor_dolar_del_store `vender.valor_dolar`.
 * @param {Boolean} cotizacion_editada_a_mano `vender/previus_sales.cotizacion_editada_a_mano`.
 * @returns {*} null o `valor_dolar_del_store` tal cual.
 */
export function cotizacion_para_el_put_de_la_venta(venta_original, moneda_del_store, valor_dolar_del_store, cotizacion_editada_a_mano) {

	if (!venta_original) {
		return valor_dolar_del_store
	}

	let no_tenia_cotizacion = !(Number(venta_original.valor_dolar) > 0)

	let misma_moneda = moneda_de_cuenta_normalizada(venta_original.moneda_id) === moneda_de_cuenta_normalizada(moneda_del_store)

	if (no_tenia_cotizacion && misma_moneda && !cotizacion_editada_a_mano) {
		return null
	}

	return valor_dolar_del_store
}
