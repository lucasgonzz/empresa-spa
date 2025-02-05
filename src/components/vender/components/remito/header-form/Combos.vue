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
		add_combo(result) {

			this.combo = {
				...result.model,
				is_combo: true,
			}

			if (this.check_stock()) {

				let combo_to_add = {
					...this.combo,
				}

				if (this.user.ask_amount_in_vender) {
					combo_to_add.amount = ''
				} else {
					combo_to_add.amount = 1
				}

				this.$store.commit('vender/setArticle', combo_to_add)
				
				let time = 200
				if (from_mobile) {
					time = 700
				}
				if (this.user.ask_amount_in_vender) {
					setTimeout(() => {
						document.getElementById('article-amount').focus()
					}, time)
				} else {
					this.addArticleToSale()
				}
			}
		},
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
			
			return

			combo.final_price = Number(combo.price)
			this.$store.commit('vender/addItem', combo)
			if (this.index_previus_sales > 0) {
				this.setItemsPrices(true, false)
			} else {
				this.setItemsPrices(true, false)
			}
		},
	}
}
</script>