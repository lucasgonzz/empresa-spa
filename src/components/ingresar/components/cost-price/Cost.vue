<template>
	<b-col 
	class="col-cost"
	md="6"
	cols="12"> 
		<b-form-group
		label="Costo">
			<b-form-input
			id="article-cost"
			placeholder="Ingresa el costo del producto"
			:step="get_number_input_step(cost_prop)"
			v-model="article.cost"
			@keydown.enter="changeToPrice"
			autocomplete="off"></b-form-input>
		</b-form-group>
		<b-form-checkbox
		:value="1"
		:unchecked-value="0"
		v-model="article.cost_in_dollars">
			Costo en dolares
		</b-form-checkbox>

		<b-form-checkbox
		v-if="selectedProvider(article) && selectedProvider(article).dolar"
		:value="1"
		:unchecked-value="0"
		v-model="article.provider_cost_in_dollars">
			Costo en dolares de {{ selectedProvider(article).name }} de ${{ selectedProvider(article).dolar }}
		</b-form-checkbox>
	</b-col>
</template>
<script>
import ingresar from '@/mixins/ingresar'
import { usa_margen_del_articulo, usa_precio_manual } from '@/utils/criterio_de_precio'

export default {
	mixins: [ingresar],
	props: ['article'],
	computed: {
		special_prices() {
			return this.$store.state.special_prices.special_prices
		},
		/*
		 * Mision 44: mismo criterio que el back (utils/criterio_de_precio.js), que antes
		 * era `price != ''` / `percentage_gain != ''` -- verdadero con un 0 guardado, porque
		 * "0.00" != '' es verdadero en JS.
		 *
		 * Ojo: hoy NINGUNO DE LOS DOS se usa. El template de este componente tiene un solo
		 * input (el costo) y no tiene ningun :disabled; los que si estan conectados son los
		 * de Price.vue, que se llaman igual. Quedan alineados igual para que no vuelvan a
		 * aparecer con el criterio viejo si alguien los conecta.
		 */
		disabled_percetange_gain() {
			return usa_precio_manual(this.article)
		},
		disabled_price() {
			return usa_margen_del_articulo(this.article)
		},
		/**
		 * Definicion de la prop 'cost' del model article, para leer su variable_decimals
		 * (grupo 282, prompt 05) sin duplicar la declaracion acá.
		 * @returns {Object|undefined}
		 */
		cost_prop() {
			return this.modelPropertiesFromName('article').find(prop => prop.key == 'cost')
		},
	},
	methods: {
		changeToPrice() {
			if (this.hasExtencion('articles.percentage_gain')) {
				document.getElementById('article-percentage-gain').focus()
			} else {
				document.getElementById('article-price').focus()
			}
		},
	},
}
</script>
<style lang="sass">
.col-cost 
	display: flex
	justify-content: flex-start
</style>
