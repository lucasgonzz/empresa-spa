import computed from '@/mixins/vender/computed'
import vender_set_total from '@/mixins/vender_set_total'
import deteccion_combos from '@/mixins/vender/deteccion_combos'
export default {
	mixins: [computed, vender_set_total, deteccion_combos],
	methods: {
		personalizar_price_en_vender() {

			let finded = this.get_item_repetido()

			if (finded.personalizar_price_en_vender) {

				setTimeout(() => {
					document.getElementById('price-vender-'+finded.id).focus()
				}, 300)
				return true
			}

		},
		/**
		 * Dice si el item de cabecera (el que se esta por agregar) ya tiene su renglon en el remito.
		 *
		 * 🔴 Aca vivia una regla: "si el repetido tiene variante (article_variant_id) devolve false",
		 * o sea, un articulo con variantes SIEMPRE abria un renglon nuevo. Nacio cuando el item que se
		 * agregaba no decia que variante era: el repetido podia ser otra y fusionarlos sumaba cantidad
		 * de una variante a otra, asi que ante la duda no se fusionaba. Hoy el item siempre lo dice
		 * (SelectVariant, buscador por nombre y escaneo con variant_row) y get_item_repetido ya compara
		 * la variante, de modo que si devuelve un renglon es de la MISMA variante y fusionarlo es lo
		 * correcto. Dejar la regla vieja era un bug en dos sentidos: escanear cinco veces la misma
		 * variante daba cinco renglones, y el primer renglon del articulo decidia por todos (con la
		 * variante A en el remito, escanear la B dos veces nunca sumaba cantidad).
		 *
		 * @return {boolean}
		 */
		ya_esta_en_la_venta() {

			let finded = this.get_item_repetido()

			if (typeof finded == 'undefined') {
				console.log('No esta repetido')
				return false
			}

			return true
		},
		/**
		 * Renglon del remito que es "lo mismo" que el item de cabecera, o undefined si no hay.
		 *
		 * Articulos: mismo id Y misma variante. Una variante no se fusiona con otra variante del mismo
		 * articulo ni con el renglon del articulo sin variante (ni al reves): son renglones distintos,
		 * con su propio precio, stock y descripcion. Mismo criterio que es_la_misma_linea() del store
		 * (store/vender/vender.js), que es lo que despues usa updateItem para reemplazar el renglon:
		 * si los dos criterios difirieran, actualizar_cantidad no encontraria el renglon que acaba de
		 * sumar.
		 *
		 * Combos: mismo id, sin variante (no tienen).
		 *
		 * @return {Object|undefined}
		 */
		get_item_repetido() {

			/*
				Variante del item que se esta por agregar, calculada IGUAL que la que add_item_to_sale le
				va a poner al renglon (article_variant_id = is_variant ? variant_id : 0), y no leyendo
				item_vender.article_variant_id: set_item_vender copia ahi el variant_id aunque el item no
				traiga is_variant (lo que pasa al escanear contra un back viejo, sin variant_row), y en ese
				caso el renglon queda con 0. Comparar contra ese campo haria que un articulo escaneado con
				un back viejo nunca se fusione con su propio renglon. El Number(... || 0) hace que el id
				como texto ('173') y como numero (173) sean la misma variante, y que "sin variante" (0,
				null, undefined) sea siempre 0.
			*/
			let variante_a_agregar = Number((this.item_vender.is_variant ? this.item_vender.variant_id : 0) || 0)

			return this.items.find(item => {
				if (
					item.is_article && this.item_vender.is_article
					&& item.id == this.item_vender.id
					&& Number(item.article_variant_id || 0) == variante_a_agregar
				) {
					return true
				}
				if (
					item.is_combo && this.item_vender.is_combo
					&& item.id == this.item_vender.id
				) {
					return true
				}
				return false
			})
		},
		actualizar_cantidad() {

			console.log('actualizar_cantidad')

			// if (!is_default_article) {

				let repetido = this.get_item_repetido()

				repetido.amount = Number(repetido.amount)
				
				let amount = this.item_vender.amount

				if (amount == '') {
					amount = 1
				}

				repetido.amount += Number(amount)
				
				if (this.check_stock_disponible(repetido)) {

					repetido = this.check_price_type_ranges(repetido)
					
					repetido = this.check_price_range(repetido)

					/*
						Aca NO va el aviso de ofertas por cantidad, a proposito. Este es el camino
						del articulo que YA ESTA en el remito y al que se le suma cantidad: el
						vendedor ya vio el cartel cuando lo agrego por primera vez, y un comercio
						que pasa diez unidades de a una por el lector se comeria diez toasts
						seguidos. Si algun dia se quiere avisar justo cuando la cantidad CRUZA un
						tramo, hay que comparar el tramo de antes contra el de despues, no
						anunciar las ofertas de nuevo.
					*/
					this.$store.commit('vender/updateItem', repetido)

					/*
						Segundo punto donde cambia la cantidad de algo en el remito: el vendedor
						volvio a pasar un articulo que ya estaba y se le sumo cantidad. Es
						exactamente el caso del ejemplo de Lucas -- carga la tercera mecha y recien
						ahi alcanza para el combo.
					*/
					this.programar_deteccion_de_combos()

					this.setTotal()
					this.limpiar_item()
				}


			// }
		},
	}
}