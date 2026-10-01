import { numero_o_null, redondear_a_centavos } from '@/utils/recargos_en_precios'

// Decimales de article_budget.price_sin_recargos_de_venta (decimal(25,6)): la base sin recargos.
const DECIMALES_BASE_SIN_RECARGOS = 6

/**
 * Re-expresa en otra moneda (de $ a USD o de USD a $) los importes FIJOS de un presupuesto que se
 * esta editando en VENDER (mision 2r-presupuestos-editables, 1/10/2026).
 *
 * POR QUE EXISTE. Un renglon que viene de un presupuesto guardado toma su precio del pivot
 * (generals.js::getPriceVender, rama `price_desde_pivot`) y check_moneda NO lo vuelve a cotizar:
 * "ya esta en la moneda del comprobante". Eso es correcto mientras la moneda no cambia, pero si el
 * vendedor cambia el selector, el pivot sigue diciendo el numero viejo en la moneda vieja y el
 * presupuesto quedaria en USD con precios en pesos. Hay que convertir el valor GUARDADO, no
 * recalcularlo del catalogo (decision 1 de Lucas, 1/10/2026): cada renglon conserva su valor real,
 * incluidos los precios y los descuentos puestos a mano.
 *
 * LA REGLA, SIMETRICA, con `c` = la cotizacion que muestra el campo USD en ese momento:
 *   - $ -> USD:  importe_usd  = importe_pesos / c
 *   - USD -> $:  importe_pesos = importe_usd * c
 *
 * 🔴 SE CONVIERTE SIEMPRE DESDE LOS ORIGINALES, NUNCA DE LO YA CONVERTIDO. Cada renglon (y el
 * monto forzado, y cada `varios_precios`) guarda su importe ORIGINAL con la moneda en que estaba
 * cuando se abrio el presupuesto (el primer momento en que se re-expresa; null = pesos). Cada vez
 * que cambia la moneda O la cotizacion, el importe vigente se recalcula desde ese original:
 *   - si la moneda vigente es la original -> el original EXACTO, sin conversion ni redondeo;
 *   - si es la otra -> el original convertido con la cotizacion vigente, redondeado.
 * Dos defectos que esto evita (los dos salieron de la revision independiente):
 *   1. Convertir "de lo vigente a lo nuevo" encadena redondeos: $1.000 -> 0,64 USD -> $998,40, y
 *      cada ida y vuelta pierde plata para siempre (en renglones baratos, hasta ~6%).
 *   2. Cambiar la cotizacion DESPUES de convertir dejaba los renglones con la cotizacion vieja y
 *      `valor_dolar` con la nueva: el presupuesto se guardaba mezclado y al volver a pesos con
 *      otra cotizacion no devolvia el valor. Ahora el cambio de cotizacion re-expresa los renglones
 *      (Moneda.vue lo dispara desde el watcher de `valor_dolar`, asi tambien cubre el cartel de
 *      "restaurar el dolar del sistema" y el chequeo de guardado).
 * Si el original es USD y solo se edita la cotizacion (sin cambiar de moneda) no hay nada que
 * convertir: los precios son los originales y no se tocan.
 *
 * DONDE VIVEN LOS ORIGENES. En propiedades NO enumerables de cada renglon (`_origen_moneda`,
 * `_origen_forzar`) y de cada fila de `varios_precios` (`_origen_moneda`): no son reactivas, no
 * viajan en ningun payload ni en el log de la venta, y se van con el renglon, o sea que
 * limpiar_vender(), cancelar y guardar las descartan solas (todas hacen setItems([])). Si un
 * renglon pierde su origen (se lo clona, o alguien le cambia el precio por otro camino), se toma
 * como nuevo origen lo que tiene AHORA en la moneda vigente: se pierde la exactitud de la vuelta,
 * nunca la coherencia entre precio y moneda.
 *
 * 🔴 CADA IMPORTE CONVERTIDO SE REDONDEA A LO QUE GUARDA LA BASE. La API guarda
 * article_budget.price y .cost con 2 decimales (decimal(12,2)), el monto forzado con 2 y la base
 * sin recargos con 6: si la SPA mandara el numero sin redondear, el total que calcula (suma de
 * renglones sin redondear) no coincidiria con la suma de los renglones guardados, y PUT
 * budget/{id} no valida ese total. Redondeando aca, lo que se ve es lo que se guarda.
 *
 * QUE SE CONVIERTE (todo lo que es un importe fijo y NO se vuelve a derivar del catalogo):
 *   - pivot.price y pivot.price_sin_recargos_de_venta de cada renglon guardado (articulos,
 *     servicios, combos y promociones de vinoteca). La base sin recargos tiene que ir en la misma
 *     moneda que el price: getPriceVender() rearma el precio desde ella.
 *   - el costo del renglon (item.cost y pivot.cost): la API devuelve tal cual el costo que trae el
 *     pivot ("ya cotizado", SaleHelper::getCost), asi que un precio en USD con el costo en pesos
 *     daria una ganancia absurda y dispararia la correccion de "costo de bulto".
 *   - el monto del total forzado (`vender/forzar_total_monto`).
 *   - los `varios_precios` que el vendedor escribio a mano en esta edicion.
 * Los PORCENTAJES (descuentos, recargos, bonificaciones) no se tocan.
 *
 * QUE NO SE CONVIERTE, Y POR QUE ESTA BIEN:
 *   - Un renglon que se agrego durante la edicion (sin pivot) o un precio personalizado: su precio
 *     sale del catalogo (o de lo tipeado, que getPriceVender trata como moneda del articulo) y
 *     check_moneda lo cotiza con la moneda y la cotizacion vigentes en el setTotal() siguiente.
 *     Convertirlos aca los cotizaria dos veces.
 *
 * LIMITE CONOCIDO, a proposito sin adivinar: un renglon con `price_type_monedas` trae sus propios
 * precios por moneda y check_moneda NUNCA lo cotiza. Si la lista de precios del renglon no tiene
 * una fila para la moneda vigente, su precio queda como estaba. Esos renglones se cuentan en
 * `con_precios_propios_por_moneda` para que el vendedor los revise; no se convierten.
 *
 * Los nombres de este mixin llevan "reexpresar" a proposito: un metodo nuevo con el nombre de uno
 * global de la SPA lo pisa en silencio (paso el 30/9/2026 con check_cotizacion_dolar).
 */
export default {
	methods: {
		/**
		 * Si la moneda es el dolar. Todo lo demas (1, null, 0) es pesos: una venta o un presupuesto
		 * sin moneda se trata como pesos (decision de Lucas, 30/9/2026).
		 *
		 * @param {Number|String|null} moneda_id
		 * @returns {Boolean}
		 */
		reexpresar_moneda_es_dolar(moneda_id) {
			return Number(moneda_id) === 2
		},

		/**
		 * Lleva UN importe fijo de una moneda a la otra con la regla simetrica y lo redondea a los
		 * decimales con que lo guarda la base. Un valor vacio o no numerico vuelve tal cual: no se
		 * inventa un 0.
		 *
		 * @param {*} importe
		 * @param {Boolean} hacia_dolares true: $ -> USD (divide); false: USD -> $ (multiplica).
		 * @param {Number} cotizacion Mayor que cero (lo valida quien llama).
		 * @param {Number} decimales 2 (precio, costo, monto forzado) o 6 (base sin recargos).
		 * @returns {*}
		 */
		reexpresar_importe_del_comprobante(importe, hacia_dolares, cotizacion, decimales = 2) {

			let numero = numero_o_null(importe)

			if (numero === null) {
				return importe
			}

			let convertido = hacia_dolares ? numero / cotizacion : numero * cotizacion

			if (decimales === 2) {
				return redondear_a_centavos(convertido)
			}

			/*
				toPrecision(15) antes de redondear, por lo mismo que redondear_a_centavos(): en binario
				un .5 puede quedar en .49999999 y bajar donde MySQL (decimal) y PHP (round) suben.
			*/
			let escala = Math.pow(10, decimales)

			return Math.round(Number((convertido * escala).toPrecision(15))) / escala
		},

		/**
		 * Deja el comprobante en curso expresado en `moneda_nueva` con `cotizacion`, recalculando
		 * TODO desde los importes originales (ver "SE CONVIERTE SIEMPRE DESDE LOS ORIGENES" arriba).
		 * Sirve igual para un cambio de moneda que para un cambio de cotizacion con la moneda
		 * quieta (en ese caso pasar la misma moneda en los dos primeros parametros). Es idempotente.
		 * NO commitea la moneda ni recalcula el total: eso lo hace quien llama (Moneda.vue), en ese
		 * orden, despues de esta funcion.
		 *
		 * Los renglones con pivot se REEMPLAZAN por una copia con los importes recalculados, y no se
		 * mutan en el lugar: `item.pivot` es el mismo objeto que `budget.articles[i].pivot` del store
		 * de presupuestos, y mutarlo dejaria el listado con los precios convertidos aunque el
		 * vendedor cancele la edicion.
		 *
		 * Sin cotizacion mayor que cero NO se convierte nada (dividir por 0 deja precios en
		 * Infinity); volver a la moneda original si se puede, porque no necesita cotizacion.
		 *
		 * @param {Number|String|null} moneda_anterior La moneda vigente ANTES de este cambio. Solo
		 *        se usa para tomar el origen de lo que todavia no lo tiene.
		 * @param {Number|String|null} moneda_nueva
		 * @param {Number} cotizacion Cotizacion del dolar vigente.
		 * @returns {Object} { convertidos, con_precios_propios_por_moneda }
		 */
		reexpresar_comprobante_en_otra_moneda(moneda_anterior, moneda_nueva, cotizacion) {

			let resultado = {
				convertidos: 0,
				con_precios_propios_por_moneda: 0,
			}

			let anterior_es_dolar = this.reexpresar_moneda_es_dolar(moneda_anterior)
			let nueva_es_dolar = this.reexpresar_moneda_es_dolar(moneda_nueva)

			cotizacion = Number(cotizacion)

			let hay_cotizacion = cotizacion > 0

			let items = this.$store.state.vender.items

			items.forEach(item => {

				if (
					Array.isArray(item.price_type_monedas)
					&& item.price_type_monedas.length
				) {
					// Trae sus propios precios por moneda: ver "LIMITE CONOCIDO" arriba.
					resultado.con_precios_propios_por_moneda++
					return
				}

				if (item.pivot) {

					if (this.reexpresar_renglon_con_pivot(item, anterior_es_dolar, nueva_es_dolar, cotizacion, hay_cotizacion)) {
						resultado.convertidos++
					}
				}

				/*
					Los `varios_precios` los escribe el vendedor a mano en el remito y no pasan por
					getPriceVender(): son importes fijos en la moneda que se estaba mostrando.
					set_items_prices.js::set_varios_precios_con_recargos() rearma
					calculated_price_vender en el setTotal() que sigue.
				*/
				if (Array.isArray(item.varios_precios)) {

					item.varios_precios.forEach(otro_precio => {

						let origen = leer_origen(otro_precio, anterior_es_dolar, { price_vender: otro_precio.price_vender })

						if (origen.dolar !== nueva_es_dolar && !hay_cotizacion) {
							return
						}

						otro_precio.price_vender = this.reexpresar_desde_origen(origen.valores.price_vender, origen.dolar, nueva_es_dolar, cotizacion)

						origen.ultimo = { price_vender: otro_precio.price_vender }
					})
				}
			})

			this.reexpresar_total_forzado(items, anterior_es_dolar, nueva_es_dolar, cotizacion, hay_cotizacion)

			return resultado
		},

		/**
		 * Recalcula UN importe vigente desde su original: en la moneda original es el original tal
		 * cual (mismo valor, mismo tipo, sin redondear); en la otra, el original convertido.
		 *
		 * @param {*} original
		 * @param {Boolean} original_es_dolar
		 * @param {Boolean} nueva_es_dolar
		 * @param {Number} cotizacion
		 * @param {Number} decimales
		 * @returns {*}
		 */
		reexpresar_desde_origen(original, original_es_dolar, nueva_es_dolar, cotizacion, decimales = 2) {

			if (original_es_dolar === nueva_es_dolar) {
				return original
			}

			return this.reexpresar_importe_del_comprobante(original, nueva_es_dolar, cotizacion, decimales)
		},

		/**
		 * Recalcula los importes de un renglon que viene de un presupuesto guardado (pivot, base
		 * sin recargos y costo) y le deja una COPIA del pivot.
		 *
		 * @returns {Boolean} true si el renglon quedo recalculado; false si no se pudo (sin cotizacion).
		 */
		reexpresar_renglon_con_pivot(item, anterior_es_dolar, nueva_es_dolar, cotizacion, hay_cotizacion) {

			let origen = leer_origen(item, anterior_es_dolar, valores_de_renglon(item))

			if (origen.dolar !== nueva_es_dolar && !hay_cotizacion) {
				return false
			}

			let o = origen.valores
			let es_articulo = Boolean(item.is_article)

			let pivot = Object.assign({}, item.pivot)

			pivot.price = this.reexpresar_desde_origen(o.price, origen.dolar, nueva_es_dolar, cotizacion)
			pivot.price_sin_recargos_de_venta = this.reexpresar_desde_origen(o.base, origen.dolar, nueva_es_dolar, cotizacion, DECIMALES_BASE_SIN_RECARGOS)

			if (es_articulo) {
				pivot.cost = this.reexpresar_desde_origen(o.pivot_cost, origen.dolar, nueva_es_dolar, cotizacion)
				item.cost = this.reexpresar_desde_origen(o.item_cost, origen.dolar, nueva_es_dolar, cotizacion)
			}

			item.pivot = pivot

			origen.ultimo = valores_de_renglon(item)

			return true
		},

		/**
		 * El monto del total forzado es un importe fijo con signo (negativo descuenta, positivo
		 * recarga) y se suma al total YA terminado: si quedara en la moneda vieja, un ajuste de
		 * -$12 se aplicaria como -12 USD. Su origen se guarda en los renglones (la misma suerte que
		 * ellos) y, si el vendedor lo cambia a mano despues de convertir, lo que tipeo pasa a ser el
		 * nuevo origen en la moneda vigente.
		 */
		reexpresar_total_forzado(items, anterior_es_dolar, nueva_es_dolar, cotizacion, hay_cotizacion) {

			let forzar_total_monto = this.$store.state.vender.forzar_total_monto

			if (!Number(forzar_total_monto)) {
				return
			}

			// El origen es compartido: se guarda en todos los renglones para que sobreviva si el vendedor borra alguno.
			let portador = items.find(item => item._origen_forzar)

			let origen = portador ? portador._origen_forzar : null

			if (
				!origen
				|| origen.ultimo !== Number(forzar_total_monto)
			) {
				origen = {
					dolar: anterior_es_dolar,
					valor: Number(forzar_total_monto),
					ultimo: Number(forzar_total_monto),
				}

				items.forEach(item => {
					definir_oculta(item, '_origen_forzar', origen)
				})
			}

			if (origen.dolar !== nueva_es_dolar && !hay_cotizacion) {
				return
			}

			let nuevo = Number(this.reexpresar_desde_origen(origen.valor, origen.dolar, nueva_es_dolar, cotizacion))

			origen.ultimo = nuevo

			if (nuevo !== Number(forzar_total_monto)) {
				this.$store.commit('vender/set_forzar_total_monto', nuevo)
			}
		},
	},
}

/**
 * Los importes de un renglon que se re-expresan, tal como estan AHORA.
 *
 * @param {Object} item
 * @returns {Object}
 */
function valores_de_renglon(item) {
	return {
		price: item.pivot.price,
		base: item.pivot.price_sin_recargos_de_venta,
		pivot_cost: item.pivot.cost,
		item_cost: item.cost,
	}
}

/**
 * Define una propiedad NO enumerable (no reactiva, no se serializa, no se copia con spread) y
 * reasignable.
 *
 * @param {Object} objeto
 * @param {String} nombre
 * @param {*} valor
 */
function definir_oculta(objeto, nombre, valor) {
	Object.defineProperty(objeto, nombre, {
		value: valor,
		writable: true,
		enumerable: false,
		configurable: true,
	})
}

/**
 * Compara dos importes como numeros: el pivot trae strings ("57.12") y los recalculados numeros.
 *
 * @param {*} a
 * @param {*} b
 * @returns {Boolean}
 */
function mismo_importe(a, b) {
	return numero_o_null(a) === numero_o_null(b)
}

/**
 * El origen de un renglon (o de una fila de varios_precios): sus importes ORIGINALES y la moneda en
 * que estaban. Si todavia no tiene, o si alguien cambio sus importes por otro camino (lo vigente ya
 * no es lo ultimo que escribio este mixin), se toma lo que tiene AHORA como origen, en la moneda
 * que estaba vigente.
 *
 * @param {Object} objeto Renglon o fila de varios_precios.
 * @param {Boolean} moneda_vigente_es_dolar
 * @param {Object} valores_actuales Los importes de hoy, con las mismas claves que `valores`.
 * @returns {Object} { dolar, valores, ultimo }
 */
function leer_origen(objeto, moneda_vigente_es_dolar, valores_actuales) {

	let origen = objeto._origen_moneda

	let vigente_es_lo_ultimo = Boolean(origen)

	if (origen) {
		Object.keys(origen.ultimo).forEach(clave => {
			if (!mismo_importe(origen.ultimo[clave], valores_actuales[clave])) {
				vigente_es_lo_ultimo = false
			}
		})
	}

	if (!vigente_es_lo_ultimo) {
		origen = {
			dolar: moneda_vigente_es_dolar,
			valores: Object.assign({}, valores_actuales),
			ultimo: Object.assign({}, valores_actuales),
		}

		definir_oculta(objeto, '_origen_moneda', origen)
	}

	return origen
}
