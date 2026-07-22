<template>
	<div>
		<!--
			Buscador de articulos por nombre (modal de busqueda y seleccion). El modo "listado"
			(filtrar la tabla del Listado en linea, sin modal) se saco en el prompt 09 del grupo
			179: ya lo reemplaza el buscador general (runGlobalSearch) desde el prompt 08. El
			select hardcodeado de categoria/stock tambien se saco de aca: el modal de busqueda ya
			muestra los filtros fijos que el usuario configuro (categoria/stock incluidos para
			quien tenga la extension buscar_por_categoria_en_vender), ver buscador-general/Index.vue.
		-->
		<search-component
		:placeholder="placeholder"
		id="search-article"
		model_name="article"
		@setSelected="setSelected"
		:limpiar_resultados_de_busqueda="false"
		:show_selected="false"
		:model="model"
		:save_if_not_exist="create_if_not_exist"
		:str_limint="2"
		:search_from_api="search_from_api"
		search_function="search_articles_offline"
		:search_modal_extra_properties="search_modal_extra_properties"
		:search_modal_omit_property_keys="search_modal_omit_property_keys"
		:props_to_filter="['id', 'name', 'provider_code']"
		:contexto="contexto"
		:prop="{text: 'Articulo', key: 'article_id', store: 'article', route_to_search: 'vender/buscar-articulo-por-nombre'}"></search-component>

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
	},
	computed: {
		/**
		 * Permite crear un artículo al vuelo en VENDER si la extensión está activa.
		 */
		create_if_not_exist() {
			if (this.route_name == 'vender') {
				return this.hasExtencion('crear_articulos_desde_vender') && this.can('vender.create_article')
			}
			return false
		},
		/**
		 * Contexto que se manda a global-search (tarea 4, prompt 08 del grupo 179): 'vender' si la
		 * búsqueda se hace desde la ruta de Vender, 'provider_order' en cualquier otro caso (pedido
		 * a proveedor o receta, que son los únicos otros consumidores de este buscador). Mismo
		 * criterio (route_name) que ya usa este archivo en create_if_not_exist para distinguir
		 * Vender del resto.
		 *
		 * @returns {String}
		 */
		contexto() {
			if (this.route_name == 'vender') {
				return 'vender'
			}
			return 'provider_order'
		},
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
		list_price_extensions() {
			return this.hasExtencion('articulo_margen_de_ganancia_segun_lista_de_precios')
				|| this.hasExtencion('lista_de_precios_por_categoria')
		},
		search_modal_omit_property_keys() {
			const omit = []
			if (this.hasExtencion('no_usar_codigos_de_barra')) {
				omit.push('bar_code')
			}
			const has_price_types = this.price_types && this.price_types.length
			if (
				has_price_types
				&& (
					this.hasExtencion('cambiar_price_type_en_vender')
					|| this.list_price_extensions
				)
			) {
				omit.push('final_price')
			}
			return omit
		},
		search_modal_extra_properties() {
			const extras = []

			extras.push({
				key: 'stock',
				is_stock: true,
			})

			const use_final_price_column = !this.search_modal_omit_property_keys.includes('final_price')

			if (
				use_final_price_column
				&& !this.hasExtencion('cambiar_price_type_en_vender')
				&& this.current_acount_payment_method_discounts.length
			) {
				this.current_acount_payment_method_discounts.forEach(payment_method => {
					extras.push({
						text: payment_method.current_acount_payment_method.name,
						key: 'payment_method_' + payment_method.current_acount_payment_method_id,
						function: 'get_price_with_discount_in_vender',
					})
				})
			}

			const has_price_types = this.price_types && this.price_types.length
			if (
				has_price_types
				&& (
					this.hasExtencion('cambiar_price_type_en_vender')
					|| this.list_price_extensions
				)
			) {
				this.price_types.forEach(price_type => {
					extras.push({
						text: price_type.name,
						key: 'price_type_' + price_type.id,
						function: 'get_price_type_price_in_search_modal',
					})
				})
			}

			if (this.addresses.length) {
				this.addresses.forEach(address => {
					if (!this.search_modal_can_show_address_column(address)) {
						return
					}
					extras.push({
						is_stock: true,
						text: address.street,
						key: 'address_' + address.id,
						function: 'get_address_stock_in_vender',
					})
				})
			}

			return extras
		},
		current_acount_payment_method_discounts() {
			return this.$store.state.current_acount_payment_method_discount.models
		},
		addresses() {
			return this.$store.state.address.models
		},
	},
	methods: {
		search_modal_can_show_address_column(address) {
			if (
				!this.is_admin
				&& this.can('article.stock_only_sucursal')
				&& this.user.address_id != address.id
			) {
				return false
			}
			return true
		},
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
