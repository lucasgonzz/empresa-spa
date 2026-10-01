<template>
	<!--
		Buscador de artículos para una nota de crédito SIN comprobante (venta o compra libre). El id
		`article` es el default del buscador y lo usa limpiar_input() para vaciarlo.
	-->
	<div class="dev-buscador-articulos">
		<search-component
		:show_selected="false"
		@setSelected="setSelected"
		model_name="article"
		placeholder="Buscar artículo por nombre, código de barras o de proveedor"
		search_from_api
		:props_to_filter="['name', 'bar_code', 'provider_code']"></search-component>
	</div>
</template>
<script>
export default {
	components: {
		SearchComponent: () => import('@/common-vue/components/search/Index'),
	},
	computed: {
		/**
		 * @returns {Boolean} true si el módulo está en modo Compra.
		 */
		es_compra() {
			return this.$store.state.devoluciones.tipo == 'compra'
		},
	},
	methods: {
		/**
		 * Agrega el artículo elegido como renglón a devolver.
		 *
		 * Venta: precio = precio final de venta (lo de siempre).
		 * Compra: precio = costo del artículo (ver costo_del_articulo()).
		 *
		 * @param {Object} result Resultado del buscador; el artículo viene en `result.model`.
		 */
		setSelected(result) {
			let precio = result.model.final_price
			let costo_real = result.model.costo_real

			if (this.es_compra) {
				precio = this.costo_del_articulo(result.model)
				costo_real = precio
			}

			let article = {
				...result.model,
				is_article: true,
				price_vender: precio,
				costo_real: costo_real,
				amount: '',
				article_variant_id: 0,
				discount: '',
				returned_amount: '',
				ya_devueltas: null,
				pivot: {},
			}
			this.$store.commit('devoluciones/add_item', article)

			this.limpiar_input()
		},

		/**
		 * Costo con el que se precarga un renglón de una nota de crédito libre a proveedor.
		 *
		 * Es una PROPUESTA (el costo es editable en la tabla): sin compra de origen no hay un
		 * costo "de esa compra" que respetar. Se usa `costo_real` (el costo con los descuentos del
		 * proveedor ya aplicados) y, si el artículo cuesta en dólares, se pasa a pesos con el
		 * dólar del sistema, igual que costoReal() de model_functions.js. La nota libre va en
		 * pesos (moneda 1, plan §4.2).
		 *
		 * @param {Object} article Artículo del buscador.
		 * @returns {Number}
		 */
		costo_del_articulo(article) {
			let costo = Number(article.costo_real || article.cost) || 0

			if (
				article.cost_in_dollars
				&& this.owner
				&& Number(this.owner.dollar) > 0
			) {
				costo = costo * Number(this.owner.dollar)
			}

			return Math.round(costo * 100) / 100
		},

		/**
		 * Vacía el input del buscador después de agregar. Con setInputValueSync y no con un
		 * `value = ''` suelto: el input está atado a v-model y el próximo render lo volvería a
		 * llenar (ver el comentario en common-vue/components/search/Index.vue).
		 */
		limpiar_input() {
			let input = document.getElementById('article')
			if (input) {
				this.setInputValueSync(input, '')
			}
		},
	},
}
</script>
<style lang="sass">
.devoluciones-modulo
	.dev-buscador-articulos
		margin-bottom: 16px
</style>
