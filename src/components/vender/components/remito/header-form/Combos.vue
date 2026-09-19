<template>
	<b-col
	v-if="authenticated && hasExtencion('combos')"
	cols="12"
	class="margin-bottom-since-lg"
	:md="2">
		<search-component
		id="select-combo"
		placeholder="Combos"
		:search_from_api="!download_articles"
		model_name="combo"
		@setSelected="setSelectedCombo"
		clear_query
		:show_selected="false"
		:str_limint="3"></search-component>
	</b-col>
</template>
<script>
import SearchComponent from '@/common-vue/components/search/Index'
import vender from '@/mixins/vender/index'
export default {
	mixins: [vender],
	components : {
		SearchComponent,
	},
	computed: {
		combos() {
			return this.$store.state.combo.models
		},
		id() {
			return 'select-combo'
		},
	},
	data() {
		return {
			combo: null
		}
	},
	methods: {
		/*
			El alta del combo elegido en el selector es setSelectedCombo() (abajo), atado a
			@setSelected del search-component: arma el final_price con el precio del combo y entra
			por set_item_vender(), el mismo camino que la promocion y el articulo por nombre.
		
			Hasta el 18/9/2026 (mision vender-lista-obligatoria, tanda 2) aca habia ademas un
			add_combo() que nadie llamaba: commiteaba vender/setArticle (una mutacion que ya no
			existe) y leia un from_mobile que no esta definido en ningun lado (ReferenceError).
			Se borro para que nadie lo vuelva a atar creyendo que anda. Ojo: check_stock() --el
			chequeo de stock de los COMPONENTES del combo con la extension
			check_article_stock_en_vender-- solo lo llamaba ese metodo muerto: hoy el combo elegido
			no pasa por el. Queda anotado en el informe de la mision como decision pendiente.
		*/
		check_stock() {

			let ok = true

			if (!this.guardar_como_presupuesto && this.hasExtencion('check_article_stock_en_vender')) {

				let articles_sin_stock = this.combo.articles.filter(article => {

					if (article.stock !== null && article.stock <= 0) {
						ok = false
						return true 
					}
				})

				articles_sin_stock.forEach(article => {

					this.$toast.error('El articulo '+article.name+' no tiene stock')
				})
			}
			return ok 
		},
		setSelectedCombo(result) {
			let combo = {
				...result.model,
				is_combo: true,
				// amount: 1,
			}

			combo.final_price = Number(combo.price)
			this.set_item_vender(combo)
		},
	}
}
</script>