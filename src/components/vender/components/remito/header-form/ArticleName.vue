<template>
	<b-col
	cols="12"
	:md="col_header_lg(true)"
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
			]

			if (!this.price_types.length) {

				props.push({
					text: 'Precio',
					key: 'final_price',
					function: 'get_price_formateado',
				})
			}

			if (this.current_acount_payment_method_discounts.length) {

				this.current_acount_payment_method_discounts.forEach(payment_method => {
					props.push({
						text: payment_method.current_acount_payment_method.name,
						key: 'payment_method_'+payment_method.current_acount_payment_method_id,
						function: 'get_price_with_discount_in_vender',
					})
				})
			}

			if (this.addresses.length) {

				this.addresses.forEach(address => {
					props.push({
						text: address.street,
						key: 'address_'+address.id,
						function: 'get_address_stock_in_vender',
					})
				})
			} else {

				props.push({
					text: 'Stock',
					key: 'stock',
				})
			}

			return props
		},
		current_acount_payment_method_discounts() {
			return this.$store.state.current_acount_payment_method_discount.models 
		},
		addresses() {
			return this.$store.state.address.models 
		},
	},
	methods: {
		setSelected(result, results) {

			console.log('setSelected:')
			console.log(result)

			this.article.name = result.query
			
			this.set_codigo_input_value(result.model)

			this.setVenderArticle(result.model)

			if (this.owner.ask_amount_in_vender) {
				let input = document.getElementById('search-article')
				input.value = result.model.name
			}
		},
		set_codigo_input_value(result) {
			if (typeof result != 'undefined' && result !== null) {

				let input = document.getElementById('article-bar-code')

				if (input) {
					
					if (this.hasExtencion('codigo_proveedor_en_vender')) {
						
						input.value = result.provider_code
						console.log('se puso el codigo de proveedor: '+result.provider_code)
					} else {

						input.value = result.bar_code

					}
				}

			}
		}
	}
}
</script>