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
 * Con la misma `c` la ida y la vuelta devuelven el valor original, salvo el redondeo.
 *
 * 🔴 CADA IMPORTE SE REDONDEA A LO QUE GUARDA LA BASE, y no es un detalle de display. La API guarda
 * article_budget.price y .cost con 2 decimales (decimal(12,2)), el monto forzado con 2 y la base
 * sin recargos con 6: si la SPA mandara el numero sin redondear, el vendedor veria 0,7142857 y la
 * base guardaria 0,71, y el total que calcula la SPA (suma de renglones sin redondear) no
 * coincidiria con la suma de los renglones guardados; PUT budget/{id} no valida ese total, asi que
 * la diferencia entraria sin control. Redondeando aca, lo que se ve es lo que se guarda.
 * El costo de aceptarlo es el mismo que ya aceptó Lucas en las ventas en dolares (30/9/2026): la
 * ida y la vuelta puede no dar EXACTO ($1.000 / 1.560 = 0,64 USD -> 0,64 * 1.560 = $998,40). En un
 * renglon de decenas de miles de pesos la diferencia es de centavos; en uno de pocos pesos se nota.
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
 *     check_moneda lo cotiza con la moneda y la cotizacion nuevas en el setTotal() siguiente.
 *     Convertirlos aca los cotizaria dos veces.
 *
 * LIMITE CONOCIDO, a proposito sin adivinar: un renglon con `price_type_monedas` trae sus propios
 * precios por moneda y check_moneda NUNCA lo cotiza. Si la lista de precios del renglon no tiene
 * una fila para la moneda nueva, su precio queda como estaba. Esos renglones se cuentan en
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
		 * Re-expresa los renglones y los importes fijos del comprobante en curso al pasar de una
		 * moneda a la otra. NO commitea la moneda ni recalcula el total: eso lo hace quien llama
		 * (Moneda.vue), en ese orden, despues de esta funcion.
		 *
		 * Los renglones con pivot se REEMPLAZAN por una copia con los importes convertidos, y no se
		 * mutan en el lugar: `item.pivot` es el mismo objeto que `budget.articles[i].pivot` del store
		 * de presupuestos, y mutarlo dejaria el listado con los precios convertidos aunque el
		 * vendedor cancele la edicion.
		 *
		 * @param {Number|String|null} moneda_anterior
		 * @param {Number|String|null} moneda_nueva
		 * @param {Number} cotizacion Cotizacion del dolar (mayor que cero) con la que se convierte.
		 * @returns {Object} { convertidos, con_precios_propios_por_moneda }
		 */
		reexpresar_comprobante_en_otra_moneda(moneda_anterior, moneda_nueva, cotizacion) {

			let resultado = {
				convertidos: 0,
				con_precios_propios_por_moneda: 0,
			}

			let anterior_es_dolar = this.reexpresar_moneda_es_dolar(moneda_anterior)
			let nueva_es_dolar = this.reexpresar_moneda_es_dolar(moneda_nueva)

			// Pesos -> pesos (por ejemplo null -> 1) y USD -> USD: no hay nada que convertir.
			if (anterior_es_dolar === nueva_es_dolar) {
				return resultado
			}

			cotizacion = Number(cotizacion)

			// Sin cotizacion no se convierte nada: dividir por 0 deja precios en Infinity.
			if (!(cotizacion > 0)) {
				return resultado
			}

			// Si el destino es el dolar se divide; si el destino son pesos se multiplica.
			let hacia_dolares = nueva_es_dolar

			// A 2 decimales (precio, costo, monto forzado) y la base sin recargos a 6, como la base de datos.
			let convertir = importe => this.reexpresar_importe_del_comprobante(importe, hacia_dolares, cotizacion)
			let convertir_base = importe => this.reexpresar_importe_del_comprobante(importe, hacia_dolares, cotizacion, DECIMALES_BASE_SIN_RECARGOS)

			this.$store.state.vender.items.forEach(item => {

				if (
					Array.isArray(item.price_type_monedas)
					&& item.price_type_monedas.length
				) {
					// Trae sus propios precios por moneda: ver "LIMITE CONOCIDO" arriba.
					resultado.con_precios_propios_por_moneda++
					return
				}

				if (item.pivot) {

					let pivot = Object.assign({}, item.pivot)

					pivot.price = convert_si_hay(pivot.price, convertir)
					pivot.price_sin_recargos_de_venta = convert_si_hay(pivot.price_sin_recargos_de_venta, convertir_base)

					if (item.is_article) {
						pivot.cost = convert_si_hay(pivot.cost, convertir)
						item.cost = convert_si_hay(item.cost, convertir)
					}

					item.pivot = pivot

					resultado.convertidos++
				}

				/*
					Los `varios_precios` los escribe el vendedor a mano en el remito y no pasan por
					getPriceVender(): son importes fijos en la moneda que se estaba mostrando.
					set_items_prices.js::set_varios_precios_con_recargos() rearma
					calculated_price_vender en el setTotal() que sigue.
				*/
				if (Array.isArray(item.varios_precios)) {

					item.varios_precios.forEach(otro_precio => {
						otro_precio.price_vender = convert_si_hay(otro_precio.price_vender, convertir)
					})
				}
			})

			/*
				El monto del total forzado es un importe fijo con signo (negativo descuenta, positivo
				recarga) y se suma al total YA terminado: si quedara en la moneda vieja, un ajuste de
				-$12 se aplicaria como -12 USD.
			*/
			let forzar_total_monto = this.$store.state.vender.forzar_total_monto

			if (Number(forzar_total_monto)) {
				this.$store.commit('vender/set_forzar_total_monto', convertir_numero(forzar_total_monto, convertir))
			}

			return resultado
		},
	},
}

/**
 * Convierte un importe solo si trae un valor (null, undefined y '' se dejan como estan: una clave
 * ausente no puede aparecer como 0).
 *
 * @param {*} importe
 * @param {Function} convertir
 * @returns {*}
 */
function convert_si_hay(importe, convertir) {
	if (importe === null || typeof importe == 'undefined' || importe === '') {
		return importe
	}

	return convertir(importe)
}

/**
 * Convierte un importe y lo devuelve siempre como Number (el store guarda el monto forzado como
 * numero, ver previus_sale/index.js).
 *
 * @param {*} importe
 * @param {Function} convertir
 * @returns {Number}
 */
function convertir_numero(importe, convertir) {
	return Number(convertir(importe))
}
