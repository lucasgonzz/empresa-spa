import {
	MODO_PRECIO_FIJO,
	MODO_PORCENTAJE,
	MODO_NINGUNO,
	resolver,
	porcentaje_legible,
} from '@/utils/criterio_de_oferta_por_cantidad'
/*
	La regla de "este renglon tiene varios precios" (un array con al menos una fila), la misma que
	usan repetidos.js, ArticlesTable.vue y el ticket de balanza. Ver check_price_range().
*/
import { tiene_varios_precios } from '@/mixins/vender/varios_precios'

/**
 * Si el precio "Personalizado" de un renglon lo escribio alguien que NO es la oferta por cantidad:
 * el vendedor a mano (o la balanza), y no check_price_range() con el precio fijo de un tramo.
 *
 * Mientras de true, la oferta no le toca el precio al renglon (decision de Lucas, 4/10/2026: gana
 * el precio que escribio el vendedor). Ver check_price_range().
 *
 * 🔴 "Hay precio personalizado" se mide con el MISMO criterio de verdad que getPriceVender()
 * (mixins/generals.js, la rama `if (item.price_vender_personalizado)`), y no con uno "mas
 * prolijo". Si las dos reglas difirieran habria un precio que getPriceVender() cobra como
 * personalizado y que la oferta pisa o limpia creyendo que no hay nada, o al reves. Por eso un
 * '0' tipeado (texto, truthy) cuenta como escrito a mano y un 0 numerico no: es exactamente lo que
 * hace getPriceVender(). Si se cambia esa condicion alla, se cambia aca.
 *
 * "No lo escribio la oferta" se mide contra la marca `precio_fijo_de_oferta_por_cantidad`: el
 * numero que check_price_range() dejo la ultima vez que escribio el personalizado. Sin marca (null
 * o undefined) el precio es de otro; con marca, es de la oferta solo si es el mismo numero. Number()
 * de los dos lados porque el input "Personalizado" lo deja como texto ('500' contra 500).
 *
 * @param {Object} item Renglon del remito.
 * @returns {Boolean}
 */
export function precio_escrito_a_mano(item) {

	if (!item || !item.price_vender_personalizado) {
		return false
	}

	let marca = item.precio_fijo_de_oferta_por_cantidad

	if (marca === null || typeof marca == 'undefined') {
		return true
	}

	return Number(item.price_vender_personalizado) !== Number(marca)
}

export default {
	computed: {
		items() {
			return this.$store.state.vender.items
		},
	},
	data() {
		return {
			otros_articulos_relacionados: [],
		}
	},
	methods: {
		
		/**
		 * Resuelve la oferta por cantidad ("rango de precio" hasta el 24/9/2026) que le
		 * corresponde a una linea del remito, segun la cantidad que tiene AHORA.
		 *
		 * 🔴 CRITERIO UNICO (mision oferta-por-cantidad-en-el-renglon, 4/10/2026): la oferta se
		 * recalcula en los TRES caminos que cambian la cantidad de un renglon, y en los tres SIN
		 * pedir ninguna extension:
		 *
		 *   - al agregar el articulo          -> index.js::add_item_to_sale
		 *   - al volver a escanearlo          -> repetidos.js::actualizar_cantidad
		 *   - al cambiar la columna Cantidad  -> ArticlesTable.vue::callSetTotal
		 *
		 * Hasta esta mision el tercero pedia la extension `article_price_range`, y ni con ella
		 * corria si la cuenta tambien tenia `lista_de_precios_por_rango_de_cantidad_vendida` (un
		 * if / else-if). Medido el 3/10/2026: FOCO LED con "Mayor o igual 10, 15 %", agregado de a
		 * 1 y llevado a 10 en el renglon, quedaba a $16.192,40 en vez de $13.763,54; y un renglon
		 * que entraba con la oferta y se bajaba a mano se quedaba con el descuento. La extension
		 * quedo en desuso. NO VOLVER A PONERLE UN hasExtencion A NINGUNO DE LOS TRES.
		 *
		 * El tramo GANADOR se elige solo por `amount`, igual que siempre, SIN mirar si tiene
		 * precio fijo o porcentaje; recien sobre el ganador se pregunta el modo con el criterio
		 * unico (utils/criterio_de_oferta_por_cantidad.js). Filtrar por modo antes del desempate
		 * daria otro precio en el borde exacto de dos tramos.
		 *
		 * Deja el item marcado de una de estas tres formas, y NUNCA con las dos marcas juntas:
		 *
		 *   - `price_vender_personalizado`      -> precio fijo, el numero absoluto del tramo (y
		 *                                          `precio_fijo_de_oferta_por_cantidad` con ese
		 *                                          mismo numero)
		 *   - `porcentaje_oferta_por_cantidad`  -> porcentaje, que aplica getPriceVender() AL FINAL
		 *   - las dos en null                   -> la oferta no aplica, la linea va al precio normal
		 *
		 * 🔴 Limpiar las DOS marcas en todas las ramas es obligatorio: si no, un item que dejo de
		 * calificar (bajo la cantidad, o el tramo quedo sin valor usable) se queda con el
		 * descuento viejo pegado.
		 *
		 * Hay dos renglones a los que la oferta NO les escribe el precio:
		 *
		 *   - Con varios precios: valen solo la suma de sus filas.
		 *   - Con un precio "Personalizado" que no escribio la oferta (precio_escrito_a_mano).
		 *
		 * 🔴 POR QUE LA MARCA `precio_fijo_de_oferta_por_cantidad`. El precio fijo de la oferta se
		 * escribe en `price_vender_personalizado`, que es el MISMO campo del input "Personalizado"
		 * del renglon (v-model en ArticlesTable.vue). Y el input Cantidad llama a esta funcion en
		 * CADA @keyup y en CADA @click. Sin saber quien escribio el numero, un clic en Cantidad le
		 * borraba al vendedor el precio que acababa de tipear (las ramas sin precio fijo dejan el
		 * personalizado en null): ya pasaba en las cuentas con la extension, y en todas al
		 * re-escanear. Con la marca, el numero de la oferta se recalcula y el del vendedor se respeta;
		 * si el vendedor borra el suyo, la oferta vuelve a manejar el renglon en el proximo cambio de
		 * cantidad.
		 *
		 * @param {Object} item Renglon del remito (o el item que se esta por agregar).
		 * @returns {Object} El mismo item, marcado.
		 */
		check_price_range(item) {

			if (
				!item.is_article
				|| !item.article_price_ranges
				|| !item.article_price_ranges.length
			) {
				return item
			}

			/*
				Renglon con varios precios: vale SOLO la suma de sus filas (getTotalItem suma
				calculated_price_vender y la API guarda solo las filas), asi que la oferta no le
				aplica y no se le escribe nada. repetidos.js ya cortaba antes para estos renglones;
				el input Cantidad no, y un precio fijo escrito aca en el personalizado el proximo
				ticket de balanza lo tomaria como un precio tipeado y lo sumaria como otra fila
				(precio_tipeado_pendiente, utils/balanzas.js).
			*/
			if (tiene_varios_precios(item)) {
				return item
			}

			let amount = Number(item.amount)

			// Los tramos que alcanza esta cantidad, segun el modo de cada uno.
			let tramos_validos = item.article_price_ranges.filter(range => {
				if (range.modo === 'Mayor o igual') {
					return amount >= Number(range.amount)
				}
				if (range.modo === 'Igual') {
					return amount === Number(range.amount)
				}
				return false // Por seguridad si viene un modo desconocido
			})

			/*
				Gana el de mayor cantidad (a igual cantidad, el primero). Sin ningun tramo valido
				el modo es MODO_NINGUNO, igual que un ganador sin valor usable: en los dos casos la
				linea vuelve al precio normal.
			*/
			let range = null
			let modo = MODO_NINGUNO

			if (tramos_validos.length) {

				range = tramos_validos.reduce((prev, curr) => {
					return Number(curr.amount) > Number(prev.amount) ? curr : prev
				})

				modo = resolver(range.price, range.porcentaje)
			}

			if (precio_escrito_a_mano(item)) {

				/*
					🔴 PRECIO ESCRITO A MANO: GANA EL (decision de Lucas, 4/10/2026). Aca NO se
					escribe ni se limpia price_vender_personalizado ni price_vender: es el numero
					que tipeo el vendedor (o que puso la balanza), y un clic en Cantidad no se lo
					puede borrar ni pisar.

					La marca queda en null: el personalizado ya no es el numero de la oferta. Si
					quedara la vieja, el dia que el vendedor tipee justo ese mismo numero se lo
					tomaria como de la oferta y el proximo cambio de cantidad se lo podria limpiar.

					El porcentaje, en cambio, SI se deja resuelto para la cantidad actual (y no en
					null), a proposito. Mientras haya personalizado getPriceVender() no lo aplica (la
					oferta porcentual de generals.js pide !item.price_vender_personalizado), asi que
					no cambia ningun precio. Pero si el vendedor borra su precio, el @keyup de
					"Personalizado" recalcula el renglon en el acto (callSetTotal(false) ->
					setTotal) y sale con el porcentaje de la cantidad que tiene AHORA, sin esperar a
					que toque la cantidad. No puede quedar uno de una cantidad vieja: se vuelve a
					resolver en cada cambio de cantidad de los tres caminos, igual que en las otras
					ramas. El precio fijo no se puede dejar armado asi porque vive en el mismo campo
					que el del vendedor: ese vuelve en el proximo cambio de cantidad.
				*/
				item.precio_fijo_de_oferta_por_cantidad = null
				item.porcentaje_oferta_por_cantidad = modo === MODO_PORCENTAJE ? Number(range.porcentaje) : null

				return item
			}

			if (modo === MODO_PRECIO_FIJO) {

				item.price_vender_personalizado = Number(range.price)
				item.precio_fijo_de_oferta_por_cantidad = Number(range.price)
				item.porcentaje_oferta_por_cantidad = null

			} else if (modo === MODO_PORCENTAJE) {

				/*
					El porcentaje NO se convierte en un numero absoluto aca: se deja
					marcado y lo aplica getPriceVender() recien cuando el precio de la
					linea esta completo (lista de precios, metodo de pago, recargos,
					cuotas, IVA y moneda). Escribir un absoluto aca congelaria la oferta,
					que es justo lo contrario de lo que se pidio.
				*/
				item.price_vender_personalizado = null
				item.precio_fijo_de_oferta_por_cantidad = null
				item.porcentaje_oferta_por_cantidad = Number(range.porcentaje)

			} else {

				// MODO_NINGUNO: ningun tramo alcanza, o el que gano por cantidad no tiene ningun
				// valor usable, asi que la linea sale al precio normal.
				item.price_vender_personalizado = null
				item.precio_fijo_de_oferta_por_cantidad = null
				item.porcentaje_oferta_por_cantidad = null
				item.price_vender = item.final_price
			}

			return item 
		},

		/**
		 * El texto del aviso de ofertas por cantidad de un articulo, listo para el toast de
		 * VENDER. Una oferta por renglon, de menor a mayor cantidad, para que el vendedor las
		 * pueda ofrecer todas.
		 *
		 * Sale SIEMPRE que el articulo tenga alguna oferta usable, alcance o no el tramo la
		 * cantidad que se esta cargando (decision de Lucas, 24/9/2026): el vendedor tiene que
		 * poder decirle al cliente "llevando 10 te sale mas barato".
		 *
		 * Los tramos sin ningun valor usable (MODO_NINGUNO) no se muestran: no descuentan nada,
		 * anunciarlos seria prometer algo que la venta no va a hacer.
		 *
		 * @param {Object} item Linea del remito.
		 * @returns {String|null} El texto con los renglones separados por <br>, o null si el
		 *                        articulo no tiene ninguna oferta para anunciar.
		 */
		texto_de_ofertas_por_cantidad(item) {

			if (
				!item
				|| !item.is_article
				|| !item.article_price_ranges
				|| !item.article_price_ranges.length
			) {
				return null
			}

			let renglones = []

			let ofertas = item.article_price_ranges.slice().sort((prev, curr) => {
				return Number(prev.amount) - Number(curr.amount)
			})

			ofertas.forEach(range => {

				/*
					Mismo criterio que el filtro de check_price_range: un modo desconocido no
					aplica nunca, asi que tampoco se anuncia. Anunciar una oferta que la venta no
					va a hacer es peor que no anunciarla.
				*/
				if (range.modo !== 'Igual' && range.modo !== 'Mayor o igual') {
					return
				}

				let modo = resolver(range.price, range.porcentaje)

				if (modo === MODO_NINGUNO) {
					return
				}

				let cantidad = Number(range.amount)

				let condicion = range.modo === 'Igual'
					? 'Comprando exactamente '+cantidad
					: 'Comprando '+cantidad+' o más'

				/*
					El porcentaje se anuncia con el mismo formato que usa la tienda y los carteles
					del local (porcentaje_legible): 15.00 se lee "15" y 12.50 se lee "12,5".
				*/
				let beneficio = modo === MODO_PRECIO_FIJO
					? this.price(Number(range.price))+' por unidad'
					: porcentaje_legible(range.porcentaje)+'% de descuento'

				renglones.push(condicion+': '+beneficio)
			})

			if (!renglones.length) {
				return null
			}

			/* El toast renderiza el mensaje con innerHTML, asi que el salto de linea va en <br>. */
			return renglones.join('<br>')
		},
	}
}
