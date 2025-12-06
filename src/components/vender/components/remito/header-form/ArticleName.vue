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
		:model="item_vender"
		:save_if_not_exist="false"
		:str_limint="str_limint"
		:search_from_api="search_from_api"
		search_function="search_articles_offline"
		:props_to_show="props_to_show"
		:props_to_filter="['id', 'name', 'provider_code']"
		:props_to_send_to_api="props_to_send_to_api"
		:prop="{text: 'Articulo', key: 'article_id', store: 'article', route_to_search: 'vender/buscar-articulo-por-nombre'}">
			<template #search_input_right>

				<b-form-select
				v-if="hasExtencion('buscar_por_categoria_en_vender')"
				class="select-category"
				v-model="category_id"
				:options="get_options_simple('category')"></b-form-select>

			</template>
		</search-component>
	</b-col>
</template>
<script>
import SearchComponent from '@/common-vue/components/search/Index'
import vender from '@/mixins/vender/index'
// import vender from '@/mixins/vender'
export default {
	mixins: [vender],
	components : {
		SearchComponent,
	},
	data() {
		return {
			category_id: 0,
			props_to_send_to_api: [
				{
					key: 'category_id',
					value: 0
				}
			]
		}
	},
	watch: {
		category_id() {
			this.props_to_send_to_api[0].value = this.category_id
		}
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
		setSelected(result, results) {


			// this.item.name = result.query

			let article = {
				...result.model,
				is_article: true,
			}

			this.set_codigo_input_value(article)

			this.set_item_vender(article)

			if (this.owner.ask_amount_in_vender) {
				let input = document.getElementById('search-article')
				input.value = article.name
			}
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
<style lang="sass">
.select-category
	width: 350px !important
	margin: 0 15px
</style>