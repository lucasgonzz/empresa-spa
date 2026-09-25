import {
	MODO_PRECIO_FIJO,
	MODO_PORCENTAJE,
	MODO_NINGUNO,
	resolver,
	porcentaje_legible,
} from '@/utils/criterio_de_oferta_por_cantidad'

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
		 * corresponde a una linea del remito, segun la cantidad que se esta vendiendo.
		 *
		 * El tramo GANADOR se elige solo por `amount`, igual que siempre, SIN mirar si tiene
		 * precio fijo o porcentaje; recien sobre el ganador se pregunta el modo con el criterio
		 * unico (utils/criterio_de_oferta_por_cantidad.js). Filtrar por modo antes del desempate
		 * daria otro precio en el borde exacto de dos tramos.
		 *
		 * Deja el item marcado de una de estas tres formas, y NUNCA con las dos marcas juntas:
		 *
		 *   - `price_vender_personalizado`      -> precio fijo, el numero absoluto del tramo
		 *   - `porcentaje_oferta_por_cantidad`  -> porcentaje, que aplica getPriceVender() AL FINAL
		 *   - las dos en null                   -> la oferta no aplica, la linea va al precio normal
		 *
		 * 🔴 Limpiar las DOS marcas en todas las ramas es obligatorio: si no, un item que dejo de
		 * calificar (bajo la cantidad, o el tramo quedo sin valor usable) se queda con el
		 * descuento viejo pegado.
		 */
		check_price_range(item) {

			console.log('check_price_range')
			console.log(item.is_article)
			console.log(item.article_price_ranges)
			
			if (item.is_article) {

				if (
					item.article_price_ranges
					&& item.article_price_ranges.length
				) {

					console.log('check_price_range entro con '+item.name)

					let amount = Number(item.amount)

					// Filtrar los rangos válidos según el modo
				    const validRanges = item.article_price_ranges.filter(range => {
				        if (range.modo === "Mayor o igual") {
				            return amount >= Number(range.amount);
				        }
				        if (range.modo === "Igual") {
				        	console.log('Comparando '+amount+' con '+Number(range.amount))
				            return amount === Number(range.amount);
				        }
				        return false; // Por seguridad si viene un modo desconocido
				    });


				    if (validRanges.length === 0) {
				    	item.price_vender_personalizado = null
				    	item.porcentaje_oferta_por_cantidad = null
				    	item.price_vender = item.final_price
				    	return item
				    }

				    // Elegir el que tiene mayor amount
				    let range = validRanges.reduce((prev, curr) => 
				        Number(curr.amount) > Number(prev.amount) ? curr : prev
				    );

				    let modo = resolver(range.price, range.porcentaje)

				    console.log('modo de la oferta por cantidad: ')
				    console.log(modo)

				    if (modo === MODO_PRECIO_FIJO) {

				    	item.price_vender_personalizado = Number(range.price)
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
				    	item.porcentaje_oferta_por_cantidad = Number(range.porcentaje)

				    } else {

				    	// MODO_NINGUNO: el tramo gano por cantidad pero no tiene ningun valor
				    	// usable, asi que la linea sale al precio normal.
				    	item.price_vender_personalizado = null
				    	item.porcentaje_oferta_por_cantidad = null
				    	item.price_vender = item.final_price
				    }
				}
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
