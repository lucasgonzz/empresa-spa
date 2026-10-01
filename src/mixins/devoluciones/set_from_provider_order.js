/*
	Carga una COMPRA en el módulo de devoluciones para hacerle una nota de crédito al proveedor
	(misión devoluciones-compras-y-rediseno). Gemelo de set_from_sale.js del lado compra.

	Contrato con la API (plan §4.1): GET devoluciones/search-provider-order/{num} responde
	`{ provider_order: <ProviderOrder withAll> | null }` y cada `articles[i]` trae, además de su
	`pivot`, tres campos calculados en el servidor:
	- `cantidad_efectiva`: lo que la compra ingresó, en la unidad de la compra (bultos).
	- `ya_devueltas`: lo ya devuelto al proveedor sobre esta compra, leído del libro de stock.
	- `costo_unitario_devolucion`: costo por unidad con el mismo criterio con que la compra armó su
		total (dólar, descuento del renglón, IVA, bonificaciones).

	🔴 El costo se toma TAL CUAL lo manda el servidor. No se recalcula acá: la cuenta (dólar,
	descuentos, IVA, bonificaciones prorrateadas) vive en NewProviderOrderHelper y duplicarla en el
	SPA es la receta para que la nota de crédito no coincida con la compra.
*/
import limpiar from '@/mixins/devoluciones/limpiar'
export default {
	mixins: [limpiar],
	computed: {
		num_provider_order() {
			return this.$store.state.devoluciones.num_provider_order
		},
	},
	methods: {
		/**
		 * Busca la compra por su NÚMERO (`num_provider_order` del store) y arma los renglones a
		 * devolver.
		 *
		 * Si el módulo estaba en modo Venta (p. ej. el botón "Nota de crédito" de Compras), limpia
		 * lo de venta y pasa a Compra antes de buscar, conservando el número pedido.
		 */
		search_provider_order() {

			let num = this.num_provider_order
			if (num === '' || num === null || typeof num == 'undefined') {
				this.$toast.error('Ingresá el número de la compra')
				return
			}

			if (this.$store.state.devoluciones.tipo != 'compra') {
				this.limpiar_devolucion()
				this.$store.commit('devoluciones/set_tipo', 'compra')
				this.$store.commit('devoluciones/set_num_provider_order', num)
			}

			let self = this

			this.$store.commit('auth/setMessage', 'Buscando compra')
			this.$store.commit('auth/setLoading', true)

			this.$api.get('devoluciones/search-provider-order/'+num)
			.then(res => {

				self.$store.commit('auth/setLoading', false)

				let provider_order = res.data.provider_order

				if (provider_order) {
					self.set_from_provider_order(provider_order)
				} else {
					self.$store.commit('devoluciones/set_provider_order', null)
					self.$toast.error('No se encontró la compra N° '+num)
				}
			})
			.catch(() => {
				// El toast del error lo pone el interceptor global (main.js); acá solo se apaga
				// el indicador de carga, como en search_sale.
				self.$store.commit('auth/setLoading', false)
			})
		},

		/**
		 * Vuelca una compra traída de la API al store de devoluciones.
		 *
		 * @param {Object} provider_order Compra con `provider`, `articles` (con los tres campos
		 *                                calculados del contrato) y sus datos de cabecera.
		 */
		set_from_provider_order(provider_order) {

			this.$store.commit('devoluciones/set_provider_order', provider_order)
			this.$store.commit('devoluciones/set_provider', provider_order.provider || null)

			// En compra no hay descuentos/recargos de venta, ni ARCA, ni "actualizar unidades
			// devueltas": se dejan en cero para que nada de una venta anterior viaje en el POST.
			this.$store.commit('devoluciones/set_discounts_id', [])
			this.$store.commit('devoluciones/set_surchages_id', [])
			this.$store.commit('devoluciones/set_facturar_nota_credito', 0)
			this.$store.commit('devoluciones/set_update_unidades_devueltas', 0)

			// El depósito por defecto es el mismo al que entró la compra: la mercadería sale de
			// donde se guardó.
			if (provider_order.address_id) {
				this.$store.commit('devoluciones/set_address_id', provider_order.address_id)
			}

			// Si la compra fue a cuenta corriente, la nota de crédito también va por defecto: es
			// el haber que baja lo que se le debe al proveedor.
			this.$store.commit('devoluciones/set_generar_current_acount', provider_order.generate_current_acount ? 1 : 0)

			this.$store.commit('devoluciones/set_items', this.items_de_la_compra(provider_order))

			// Recién cargada, nada está marcado para devolver (returned_amount = ya_devueltas).
			this.$store.commit('devoluciones/set_total_devolucion_manual', 0)
		},

		/**
		 * Arma los renglones de la tabla de devolución a partir de los artículos de la compra.
		 *
		 * Mismo formato que los items de venta (store/devoluciones.js `format_items`), así la
		 * tabla, el total (set_total.js) y el POST son los mismos para los dos modos.
		 *
		 * 🔴 `pivot.discount` se pisa con 0: set_total.js descuenta `pivot.discount` de cada
		 * renglón, y en una compra el descuento del renglón YA está adentro de
		 * `costo_unitario_devolucion`. Sin esto se descontaría dos veces.
		 *
		 * @param {Object} provider_order Compra con sus `articles`.
		 * @returns {Array} Items listos para `devoluciones/set_items`.
		 */
		items_de_la_compra(provider_order) {
			let items = []

			provider_order.articles.forEach(article => {

				let costo = Number(article.costo_unitario_devolucion) || 0
				let ya_devueltas = Number(article.ya_devueltas) || 0

				items.push({
					...article,
					is_article: true,
					price_vender: costo,
					costo_real: costo,
					discount: 0,
					amount: Number(article.cantidad_efectiva) || 0,
					article_variant_id: 0,
					ya_devueltas: ya_devueltas,
					returned_amount: ya_devueltas,
					unidades_devueltas: 0,
					pivot: {
						...(article.pivot || {}),
						discount: 0,
					},
				})
			})

			return items
		},
	}
}
