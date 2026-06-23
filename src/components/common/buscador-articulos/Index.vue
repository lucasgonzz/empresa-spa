<template>
	<div>
		<!-- Modo listado: búsqueda aplica resultados en article/filtered (sin modal) -->
		<div
		v-if="set_filtered_on_search"
		class="buscador-articulos-filtro-tabla">
			<b-input-group>
				<b-form-input
				autocomplete="off"
				v-model="filter_query"
				:placeholder="placeholder_filtro_tabla"
				@keyup.enter="buscar_y_filtrar"></b-form-input>
				<b-input-group-append>
					<category-options
					:category_id.sync="category_id"
					:stock_option.sync="stock_option"></category-options>
					<b-button
					variant="primary"
					@click="buscar_y_filtrar">
						<i class="icon-search"></i>
						Buscar
					</b-button>
					<b-button
					v-if="is_filtered_by_buscador"
					variant="outline-secondary"
					@click="limpiar_filtro">
						<i class="icon-undo"></i>
					</b-button>
				</b-input-group-append>
			</b-input-group>
		</div>

		<!-- Modo habitual: modal de búsqueda y selección de un artículo -->
		<search-component
		v-else
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
		/**
		 * Si es true, la búsqueda carga resultados en article/filtered del store
		 * para operar sobre la tabla del listado (sin abrir modal de selección).
		 */
		set_filtered_on_search: {
			type: Boolean,
			default: false,
		},
	},
	components : {
		SearchComponent,
		CategoryOptions: () => import('@/components/vender/components/remito/header-form/CategoryOptions'),
	},
	data() {
		return {
			/** Criterio de texto para el modo filtrar tabla */
			filter_query: '',
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
		/**
		 * Placeholder del input en modo filtrar tabla.
		 */
		placeholder_filtro_tabla() {
			if (this.placeholder) {
				return this.placeholder
			}
			return 'Buscar y filtrar en tabla...'
		},
		/**
		 * Indica si la búsqueda en modo filtro puede ir a la API.
		 */
		can_search_from_api() {
			return this.$store.state.auth.online
		},
		/**
		 * Muestra el botón limpiar cuando el filtrado activo es de este buscador.
		 */
		is_filtered_by_buscador() {
			return this.$store.state.article.filtered_without_filter_form
		},
		/**
		 * Permite crear un artículo al vuelo en VENDER si la extensión está activa.
		 */
		create_if_not_exist() {
			if (this.route_name == 'vender') {
				return this.hasExtencion('crear_articulos_desde_vender') && this.can('vender.create_article')
			}
			return false
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
		/**
		 * Arma el cuerpo del POST de búsqueda (mismo contrato que el modal de búsqueda).
		 *
		 * @returns {Object}
		 */
		get_filter_search_info() {
			let info = {
				query_value: this.filter_query,
				props_to_filter: ['id', 'name', 'provider_code'],
				per_page: 200,
			}
			this.props_to_send_to_api.forEach(prop_to_send => {
				info[prop_to_send.key] = prop_to_send.value
			})
			return info
		},
		/**
		 * Extrae filas y metadatos de paginación de la respuesta del endpoint de búsqueda.
		 *
		 * @param {Object} res Respuesta de $api.post
		 * @returns {{ rows: Array, last_page: number, total: number }}
		 */
		parse_filter_search_response(res) {
			let response = res.data.models
			if (!res.data.models) {
				response = res.data
			}
			let rows = []
			let last_page = 1
			let total = 0
			if (response && response.data) {
				rows = response.data
				last_page = response.last_page || 1
				total = response.total || rows.length
			} else if (Array.isArray(response)) {
				rows = response
				total = rows.length
			}
			return {
				rows: rows,
				last_page: last_page,
				total: total,
			}
		},
		/**
		 * Busca artículos y los carga en article/filtered para la tabla del listado.
		 */
		buscar_y_filtrar() {
			if (this.filter_query.length < 2) {
				this.$toast.error('Ingrese al menos 2 caracteres')
				return
			}
			if (!this.can_search_from_api) {
				this.$toast.error('Requiere conexión para buscar')
				return
			}
			this.$store.commit('auth/setMessage', 'Buscando artículos')
			this.$store.commit('auth/setLoading', true)
			this.$api.post('vender/buscar-articulo-por-nombre?page=1', this.get_filter_search_info())
				.then(res => {
					let parsed = this.parse_filter_search_response(res)
					this.$store.commit('article/setSelected', [])
					this.$store.commit('article/setFilterPage', 1)
					this.$store.commit('article/setFiltered', parsed.rows)
					this.$store.commit('article/setIsFiltered', true)
					this.$store.commit('article/setTotalFilterPages', parsed.last_page)
					this.$store.commit('article/setTotalFilterResults', parsed.total)
					this.$store.commit('article/set_filtered_without_filter_form', true)
					this.$store.commit('auth/setLoading', false)
					this.$store.commit('auth/setMessage', '')
					if (!parsed.rows.length) {
						this.$toast.info('No se encontraron artículos')
					}
				})
				.catch(err => {
					console.log(err)
					this.$store.commit('auth/setLoading', false)
					this.$store.commit('auth/setMessage', '')
					this.$toast.error('Error al buscar artículos')
				})
		},
		/**
		 * Quita el filtro aplicado por este buscador y restaura la tabla normal del listado.
		 */
		limpiar_filtro() {
			this.$store.commit('article/setFiltered', [])
			this.$store.commit('article/setIsFiltered', false)
			this.$store.commit('article/setSelected', [])
			this.$store.commit('article/setFilterPage', 1)
			this.$store.commit('article/setTotalFilterPages', null)
			this.$store.commit('article/setTotalFilterResults', 0)
			this.$store.commit('article/set_filtered_without_filter_form', false)
			this.filter_query = ''
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
<style lang="sass" scoped>
.buscador-articulos-filtro-tabla
	width: 100%
</style>
