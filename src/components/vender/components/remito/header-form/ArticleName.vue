<template>
	<b-col
	cols="12"
	:md="col_header_lg"
	class="col-autocomplete margin-bottom-since-lg">
		<search-component
		id="search-article"
		model_name="article"
		@setSelected="setSelected"
		:show_selected="false"
		:model="article"
		:save_if_not_exist="false"
		:str_limint="str_limint"
		:search_from_api="search_from_api"
		:props_to_show="props_to_show"
		:props_to_filter="['num', 'name', 'provider_code']"
		:prop="{text: 'Articulo', key: 'article_id', store: 'article'}"></search-component>
	</b-col>
</template>
<script>
import SearchComponent from '@/common-vue/components/search/Index'
import vender from '@/mixins/vender'
export default {
	mixins: [vender],
	components : {
		SearchComponent,
	},
	computed: {
		str_limint() {
			return this.owner.str_limint_en_vender
		},
		articles() {
			return this.$store.state.article.models
		},
		id() {
			return 'article-sale-name'
		},
		search_from_api() {
			if (!this.owner.download_articles) {
				console.log('SI SE BUSCA POR API')
				return true
			}
			console.log('NO SE BUSCA POR API')
			return false
		},
		price_types() {
			return this.$store.state.price_type.models 
		},
		props_to_show() {
			if (this.price_types.length) {
				let props = [
					{
						text: 'N°',
						key: 'num',	
					},
					{
						text: 'Imagen',
						key: 'images',
						type: 'images',	
					},
					{
						text: 'Nombre',
						key: 'name',	
					},
					{
						text: 'Stock',
						key: 'stock',	
					},
				]
				// if (this.client) {
				// 	props.push({
				// 		{
				// 			text: 'Stock',
				// 			key: 'stock',	
				// 		},
				// 	})
				// }
				return props
			} 
			return null
		}
	},
	methods: {
		setSelected(result) {
			console.log('llego este resultado:')
			console.log(result)
			this.article.name = result.query
			this.setVenderArticle(result.model)

			this.set_codigo_input_value(result.model)

			if (this.owner.ask_amount_in_vender) {
				let input = document.getElementById('search-article')
				input.value = result.model.name
			}
		},
		set_codigo_input_value(finded_article) {
			if (typeof finded_article != 'undefined') {

				let input = document.getElementById('article-bar-code')

				if (this.hasExtencion('codigo_proveedor_en_vender')) {
					
					input.value = finded_article.provider_code
					console.log('se puso el codigo de proveedor: '+finded_article.provider_code)
				} else {

					input.value = finded_article.bar_code

				}
			}
		}
	}
}
</script>