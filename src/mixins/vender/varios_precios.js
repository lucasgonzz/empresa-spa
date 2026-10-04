import vender_set_total from '@/mixins/vender_set_total'

/*
	"Varios precios" de un renglon del remito, en un solo lugar (mision balanzas-configurables,
	3/10/2026).

	Un renglon con `varios_precios` es en realidad VARIOS renglones del mismo articulo, cada uno con
	su precio y su cantidad: la API guarda una fila por cada uno (SaleHelper::attachArticles) y
	getTotalItem() (mixins/model_functions.js) suma `calculated_price_vender` en lugar de
	precio x cantidad.

	Hasta esta mision la logica vivia solo en ArticlesTable.vue, atada al Enter del input
	"Personalizado" (extension `varios_precios`). Ahora la usan dos lugares:
	  - ArticlesTable.vue, el Enter de siempre, que despues hace su propio foco.
	  - El ticket de balanza con importe (ArticleBarCode.vue): si el articulo ya esta en la venta, el
	    importe se suma como un precio mas del mismo renglon.

	🔴 Este mixin NO toca el foco, a proposito. El Enter de ArticlesTable.vue deja el foco en el
	precio o en el codigo de barras segun el articulo; el ticket de balanza lo tiene que devolver
	SIEMPRE al codigo de barras para el proximo ticket. Cada llamador decide el suyo.
*/

/**
 * Si un renglon esta en modo "varios precios": tiene al menos una fila.
 *
 * 🔴 Un array VACIO cuenta como "sin varios precios", a proposito. Queda asi cuando el vendedor
 * borra todas las filas con el tachito (remove_otro_precio): calculated_price_vender vuelve a 0 y
 * getTotalItem() vuelve a sumar precio x cantidad, o sea que el renglon vuelve a valer su precio de
 * lista. Tratarlo como "ya tiene varios precios" (Array.isArray a secas) haria que un ticket de
 * balanza le borre ese precio sin aviso.
 *
 * @param {Object} item Renglon del remito.
 * @returns {Boolean}
 */
export function tiene_varios_precios(item) {
	return !!item
		&& Array.isArray(item.varios_precios)
		&& item.varios_precios.length > 0
}

/**
 * El id de la proxima fila de `varios_precios`: el mayor que ya hay + 1 (0 si no hay ninguna).
 *
 * Antes era `varios_precios.length`, y despues de borrar una fila se repetian ids: con las filas
 * 2, 1, 0, borrar la 1 deja dos filas y la proxima nacia con id 2, igual que otra que ya estaba.
 * remove_otro_precio() de ArticlesTable.vue busca la fila por id, asi que borraba la equivocada.
 * Con la lista vacia da 0, el mismo id que tenia la primera fila con `length`.
 *
 * @param {Array} varios_precios Filas actuales del renglon.
 * @returns {Number}
 */
export function siguiente_id_de_otro_precio(varios_precios) {
	let mayor = -1
	varios_precios.forEach(otro_precio => {
		let id = Number(otro_precio.id)
		if (!isNaN(id) && id > mayor) {
			mayor = id
		}
	})
	return mayor + 1
}

export default {
	/* setTotal() sale de vender_set_total, como en repetidos.js */
	mixins: [vender_set_total],
	methods: {
		/**
		 * Agrega una fila de precio al renglon y recalcula el renglon y el total de la venta.
		 *
		 * La fila nueva va ADELANTE (unshift), igual que siempre en el Enter de "Personalizado".
		 * No toca el foco (ver el comentario de arriba).
		 *
		 * @param {Object} item Renglon del remito (el objeto del store vender.items).
		 * @param {Number|String} precio Precio de la fila, tal como lo escribio el vendedor o lo trajo
		 *        la balanza. Es el precio SIN recargos de venta: set_varios_precios_con_recargos()
		 *        (set_items_prices.js) le suma el recargo en su propia clave.
		 * @param {Number|String} [cantidad=''] Cantidad de la fila. Vacia cuenta como 1 (en la SPA y en
		 *        la API), que es lo que deja el Enter.
		 * @returns {void}
		 */
		agregar_otro_precio(item, precio, cantidad = '') {

			/*
				Asignacion directa y no $set, como siempre: el renglon se vuelve a meter en el store
				con replceItem (recalcular_varios_precios) y setTotal() reemplaza la lista entera,
				que es lo que redibuja la tabla. Se deja igual para no cambiar el comportamiento del
				Enter.
			*/
			if (typeof item.varios_precios == 'undefined') {
				item.varios_precios = []
			}

			item.varios_precios.unshift({
				price_vender: precio,
				amount: cantidad,
				id: siguiente_id_de_otro_precio(item.varios_precios),
			})

			this.recalcular_varios_precios(item)
		},

		/**
		 * Recalcula `calculated_price_vender` del renglon (suma de precio x cantidad de cada fila,
		 * cantidad vacia = 1), lo vuelve a meter en el store y recalcula el total de la venta.
		 *
		 * Es la cuenta que hacia ArticlesTable.vue::calculate_price_vender(), sin el foco. El numero
		 * con los recargos de venta lo rearma setTotal() -> set_varios_precios_con_recargos(), que
		 * replica esta misma cuenta con el factor.
		 *
		 * @param {Object} item Renglon del remito con `varios_precios`.
		 * @returns {void}
		 */
		recalcular_varios_precios(item) {

			let calculated_price_vender = 0
			let amount = 1

			item.varios_precios.forEach(otro_precio => {
				if (otro_precio.amount != '') {
					amount = Number(otro_precio.amount)
				} else {
					amount = 1
				}
				calculated_price_vender += (Number(otro_precio.price_vender) * amount)
			})

			item.calculated_price_vender = calculated_price_vender
			this.$store.commit('vender/replceItem', item)

			this.setTotal()
		},
	},
}
