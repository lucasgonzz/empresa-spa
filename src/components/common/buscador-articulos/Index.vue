<template>
	<div>
		<search-component
		:placeholder="placeholder"
		id="search-article"
		model_name="article"
		@setSelected="setSelected"
		:limpiar_resultados_de_busqueda="false"
		:show_selected="false"
		:model="model"
		:save_if_not_exist="false"
		:str_limint="2"
		:search_from_api="search_from_api"
		search_function="search_articles_offline"
		:props_to_show="props_to_show"
		:props_to_filter="['id', 'name', 'provider_code']"
		:props_to_send_to_api="props_to_send_to_api"
		:prop="{text: 'Articulo', key: 'article_id', store: 'article', route_to_search: 'vender/buscar-articulo-por-nombre'}">
			<template #search_input_right>

				<category-options
				:category_id.sync="category_id"
				:stock_option.sync="stock_option"></category-options>

			</template>
		</search-component>

	</div>
</template>
<script>
import SearchComponent from '@/common-vue/components/search/Index'
export default {
	props: {
		model: Object,
		placeholder: String,
	},
	components : {
		SearchComponent,
		CategoryOptions: () => import('@/components/vender/components/remito/header-form/CategoryOptions'),
	},
	data() {
		return {
			category_id: 0,
			stock_option: 'con_o_sin_stock',
			props_to_send_to_api: [
				{
					key: 'category_id',
					value: 0
				},
				{
					key: 'stock_option',
					value: 'con_o_sin_stock',
				},
			]
		}
	},
	watch: {
		category_id() {
			this.props_to_send_to_api[0].value = this.category_id
		},
		stock_option() {
			this.props_to_send_to_api[1].value = this.stock_option
		},
	},
	computed: {
		col_header_lg() {

			let col = 4

			if (
				this.hasExtencion('combos')
				|| this.hasExtencion('vinoteca')
			) {
				col -= 1
			}

			if (!this.user.ask_amount_in_vender) {
				col += 2
			}

			if (this.hasExtencion('no_usar_codigos_de_barra')) {
				col += 3
			}

			return col
		},
		articles() {
			return this.$store.state.article.models
		},
		id() {
			return 'article-sale-name'
		},
		search_from_api() {

			return this.$store.state.auth.online

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
			]

			if (!this.hasExtencion('no_usar_codigos_de_barra')) {
				props.push({
					text: 'Cod Barras',
					key: 'bar_code',
				})
			}

			props.push({
				text: 'Cod Prov',
				key: 'provider_code',
			})
			props.push({
				text: 'Nombre',
				key: 'name',
			})

			props.push({
				text: 'Proveedor',
				key: 'provider_id',
			})

			if (
				!this.hasExtencion('cambiar_price_type_en_vender')
			) {

				props.push({
					text: 'Precio',
					key: 'final_price',
					is_price: true,
					simbolo_moneda_function: 'article_simbolo_moneda',
				})

				if (this.current_acount_payment_method_discounts.length) {

					this.current_acount_payment_method_discounts.forEach(payment_method => {
						props.push({
							text: payment_method.current_acount_payment_method.name,
							key: 'payment_method_'+payment_method.current_acount_payment_method_id,
							function: 'get_price_with_discount_in_vender',
						})
					})
				}
			}


			props.push({
				text: 'Stock',
				key: 'stock',
		        is_stock: true,
			})

			if (this.addresses.length) {

				this.addresses.forEach(address => {
					props.push({
            			is_stock: true,
						text: address.street,
						key: 'address_'+address.id,
						function: 'get_address_stock_in_vender',
					})
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
		setSelected(result) {

			this.$emit('setSelected', result)

		},
		set_codigo_input_value(result) {
			if (typeof result != 'undefined' && result !== null) {

				let input = document.getElementById('article-bar-code')

				if (input) {

					if (this.hasExtencion('codigo_proveedor_en_vender')) {

						input.value = result.provider_code
					} else {

						input.value = result.bar_code

					}
				}

			}
		}
	}
}
</script>