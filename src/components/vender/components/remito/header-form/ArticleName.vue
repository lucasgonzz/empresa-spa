<template>
	<b-col
	cols="12"
	:md="col_header_lg"
	class="col-autocomplete margin-bottom-since-lg">
		<search-component
		id="search-article"
		model_name="article"
		@setSelected="setSelected"
		:limpiar_resultados_de_busqueda="false"
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
			if (!this.download_articles) {
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
			if (this.price_types.length || this.current_acount_payment_method_discounts.length) {
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
						text: 'Cod Prov',
						key: 'provider_code',	
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

				if (this.current_acount_payment_method_discounts.length) {

					props.push({
						text: 'Precio',
						key: 'final_price',
						function: 'get_price_formateado',
					})

					this.current_acount_payment_method_discounts.forEach(payment_method => {
						props.push({
							text: payment_method.current_acount_payment_method.name,
							key: 'payment_method_'+payment_method.current_acount_payment_method_id,
							function: 'get_price_with_discount_in_vender',
						})
					})
				}

				return props
			} 
			return null
		},
		current_acount_payment_method_discounts() {
			return this.$store.state.current_acount_payment_method_discount.models 
		}
	},
	methods: {
		setSelected(result, results) {

			this.article.name = result.query
			
			this.set_codigo_input_value(result.model)

			this.setVenderArticle(result.model)

			if (this.owner.ask_amount_in_vender) {
				let input = document.getElementById('search-article')
				input.value = result.model.name
			}
		},
		set_codigo_input_value(finded_article) {
			if (typeof finded_article != 'undefined') {

				let input = document.getElementById('article-bar-code')

				console.log('input:::')
				console.log(input)

				if (input) {
					
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
}
</script>