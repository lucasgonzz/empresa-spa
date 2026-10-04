import { redondear_a_centavos } from '@/utils/recargos_en_precios'
export default {
	computed: {
		vender_items() {
			return this.$store.state.vender.items 
		},
	},
	methods: {
		setItemsPrices(only_the_last = false, from_pivot = false) {
			if (only_the_last) {
				console.log('setenado precio el ultimo')
				let last_item = this.vender_items[0] 
				last_item.price_vender = this.getPriceVender(last_item)
				this.set_varios_precios_con_recargos(last_item)
			} else {
				console.log('seteando todos los precios. from_pivot: '+from_pivot)
				console.log(this.vender_items)
				this.vender_items.forEach(item => {
					// if (!item.default_in_vender) {
						item.price_vender = this.getPriceVender(item, from_pivot)
						this.set_varios_precios_con_recargos(item)
					// }
				})
			}
		},
		/**
		 * Recargos de venta en los `varios_precios` de un articulo (extension varios_precios).
		 *
		 * Esos precios los escribe el vendedor a mano en el remito (ArticlesTable.vue) y NO pasan
		 * por getPriceVender(): la API guarda un renglon por cada uno, con su propio precio. Hasta la
		 * mision recargos-en-precios-editable (28/9/2026), con la opcion "Aplicar los recargos de
		 * esta venta directamente a los precios" prendida, el recargo de esos renglones no se
		 * cobraba en ningun lado (el pie se lo salteaba). Ahora va adentro, como en cualquier otro
		 * precio escrito a mano (decision 2 de Lucas).
		 *
		 * 🔴 `otro_precio.price_vender` es el INPUT del vendedor y NO se pisa: es el precio SIN
		 * recargos. Si se le multiplicara el factor, cada setTotal() lo volveria a recargar (lo
		 * llaman cada tecla, cada cantidad y cada cambio de recargo) y el precio creceria solo. El
		 * precio con recargos va en su propia clave, `price_vender_con_recargos`, que es la que la
		 * API guarda como `price` (si falta, la API usa `price_vender` como antes), y
		 * `price_vender_sin_recargos` le lleva la base para pivot.price_sin_recargos_de_venta.
		 *
		 * `calculated_price_vender` se recalcula ACA, con el factor, porque es lo que getTotalItem()
		 * suma en lugar de price_vender × amount: si quedara sin el factor, prender la opcion le
		 * sacaria el recargo al total en vez de moverlo del pie al precio. Se replica la cuenta de
		 * ArticlesTable.vue::calculate_price_vender() -cantidad vacia cuenta como 1- para que los
		 * dos numeros coincidan con la opcion apagada.
		 *
		 * 🔴 El precio con recargos se redondea a centavos y calculated_price_vender suma esos
		 * redondeados, por lo mismo que en getPriceVender() (generals.js, ahi esta el detalle con
		 * los numeros medidos): la API guarda cada renglon con 2 decimales y recalcula el total, la
		 * factura y el presupuesto sumando renglones. La base (`price_vender_sin_recargos`) es el
		 * input del vendedor, sin redondear.
		 *
		 * 🔴 COMPROBANTE LEGADO (mision varios-precios-descuento-renglon, 3/10/2026). Las filas que
		 * vienen de un comprobante guardado (`desde_comprobante_guardado`, las arma
		 * utils/varios_precios_guardados.js al abrirlo) NO se recargan si el comprobante es legado
		 * (vender.recargos_en_precios_sin_registro): su precio va tal cual y la base en null, lo mismo
		 * que hace getPriceVender() en la rama del pivot del legado. NO SACAR ESTA EXCEPCION "PARA QUE
		 * TODAS LAS FILAS SE RECARGUEN IGUAL": en un legado el precio guardado ya es el que se cobro
		 * -con el recargo adentro, o sin el en las filas de varios precios de antes del 28/9/2026, que
		 * no lo llevaban (decision 2 de esa mision)- y el sistema no sabe cuanto valia sin el.
		 * Recargarlo le subiria el total solo a una venta vieja con la opcion prendida, nada mas que
		 * por abrirla. Y Surchages.vue le bloquea los recargos y la opcion a un legado, asi que el
		 * factor no puede cambiar mientras se edita.
		 *
		 * Las filas NUEVAS que el vendedor tipee en un legado (sin la marca) se recargan como
		 * cualquier precio escrito a mano, igual que el precio personalizado en getPriceVender(). Una
		 * fila cargada que el vendedor edite conserva la marca: lo que tipea reemplaza un precio que
		 * ya era el final (se le mostraba con el recargo adentro), y queda como precio final.
		 *
		 * La marca es un booleano y el precio sigue viviendo en `price_vender`, a proposito:
		 * reexpresar_comprobante.js convierte `price_vender` de cada fila al cambiar de moneda, y un
		 * precio guardado en otra clave quedaria en la moneda vieja.
		 *
		 * A esas mismas filas guardadas se les aplica tambien el ajuste de los checks de IVA, como a
		 * un renglon suelto del pivot (ver el bloque del IVA, adentro del forEach).
		 *
		 * @param {Object} item
		 */
		set_varios_precios_con_recargos(item) {

			if (
				!item
				|| !Array.isArray(item.varios_precios)
				|| !item.varios_precios.length
			) {
				return
			}

			let factor = this.factor_recargos_de_venta(item)

			/*
				Comprobante legado: lo calcula set_datos_para_actualizar_en_vender() al abrirlo, con lo
				que tiene guardado, y lo limpia limpiar_vender(). En una venta nueva es false.
			*/
			let comprobante_legado = Boolean(this.$store.state.vender.recargos_en_precios_sin_registro)

			let calculated_price_vender = 0

			item.varios_precios.forEach(otro_precio => {

				let amount = 1

				if (otro_precio.amount != '') {
					amount = Number(otro_precio.amount)
				}

				let precio_sin_recargos = Number(otro_precio.price_vender)

				/*
					El factor de ESTA fila: el del renglon, salvo la fila cargada de un comprobante
					legado, que va sin recargar (ver el bloque de arriba). Ahi `precio_sin_recargos` es
					en realidad el precio guardado tal cual, y por eso viaja sin base.
				*/
				let factor_de_la_fila = factor

				if (comprobante_legado && otro_precio.desde_comprobante_guardado) {
					factor_de_la_fila = null
				}

				// El precio de la fila con los recargos de venta adentro, o tal cual si no hay factor.
				let precio = factor_de_la_fila === null ? precio_sin_recargos : precio_sin_recargos * factor_de_la_fila

				// La base que viaja: el precio sin recargos, solo si hubo factor (ver la invariante).
				let base = factor_de_la_fila === null ? null : precio_sin_recargos

				/*
					🔴 IVA DE LA FILA QUE VIENE DEL COMPROBANTE GUARDADO (mision
					varios-precios-descuento-renglon, 3/10/2026). NO SACAR "PORQUE LAS FILAS TIPEADAS NO
					LO HACEN".

					Hasta que una venta o un presupuesto reabierto junto sus filas en un renglon
					(utils/varios_precios_guardados.js), cada fila era un renglon suelto y pasaba por la
					rama del pivot de getPriceVender() (generals.js), que despues del factor de recargos
					-o del precio tal cual, en el legado- le aplica
					ajustar_precio_segun_iva_aplicado(item, precio, true). Sin esto, si el vendedor
					apaga "Precios con IVA" (o prende "Sumar IVA a los articulos sin IVA") editando, los
					renglones sueltos se ajustan y las filas no, y se guardan con el IVA adentro en un
					comprobante que dice que no lo tiene. Mismo orden que esa rama: precio guardado ->
					factor (o tal cual) -> ajuste de IVA -> base = precio / factor -> redondeo a
					centavos solo si hubo factor. Asi la fila sale exactamente como saldria ese mismo
					precio en un renglon suelto.

					- Sin tocar los checks, el ajuste devuelve el precio TAL CUAL
					  (utils/iva_en_vender.js) y la fila sale identica a como salia antes: por eso la base
					  se recalcula SOLO si el IVA cambio el precio. Dividir siempre (p x f / f) le
					  agregaria ruido de coma flotante en el ultimo decimal a una base que no cambio.
					- Las filas TIPEADAS (sin la marca) no se ajustan, como hasta ahora: que una fila
					  tipeada siga los checks de IVA es otro tema (queda anotado en el informe).
				*/
				if (otro_precio.desde_comprobante_guardado) {

					let precio_con_iva = this.ajustar_precio_segun_iva_aplicado(item, precio, true)

					if (precio_con_iva !== precio) {

						precio = Number(precio_con_iva)

						if (factor_de_la_fila !== null) {
							base = precio / factor_de_la_fila
						}
					}
				}

				if (factor_de_la_fila === null) {
					otro_precio.price_vender_con_recargos = precio
					otro_precio.price_vender_sin_recargos = null
				} else {
					otro_precio.price_vender_con_recargos = redondear_a_centavos(precio)
					otro_precio.price_vender_sin_recargos = base
				}

				calculated_price_vender += otro_precio.price_vender_con_recargos * amount
			})

			item.calculated_price_vender = calculated_price_vender
		},
	}
}