<template>
	<!--
		Elemento `buscador_de_articulos` del diseño de Vender (mision diseno-vender-configurable,
		28/9/2026). La raiz era un <b-col cols="12" :md="col_header_lg"> que calculaba su ancho segun
		las extensiones; ahora es un div suelto y el ancho lo da el diseño en uso a traves de
		layout/GrillaDeEtapa.vue. La cuenta de ese ancho se mudo tal cual al `cols` del buscador en
		layout/elementos.js, y rige para el diseño predeterminado.

		La grilla le pone a esta raiz el ancla `vender.buscador_articulos` del tour de la demo.
	-->
	<div class="col-autocomplete">
		<buscador-articulos
		@setSelected="setSelected"
		:model="item_vender"></buscador-articulos>
		<!-- <search-component
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

				<category-options
				:category_id.sync="category_id"
				:stock_option.sync="stock_option"></category-options>

			</template>
		</search-component> -->

	</div>
</template>
<script>
// import SearchComponent from '@/common-vue/components/search/Index'
import vender from '@/mixins/vender/index'
/*
	Variantes de un articulo de la cache (busqueda por nombre sin conexion): ver setSelected() y
	src/utils/variantes_en_cache.js.
*/
import { variantes_disponibles_en_cache } from '@/utils/variantes_en_cache'
// import vender from '@/mixins/vender'
export default {
	mixins: [vender],
	components : {
		// SearchComponent,
		BuscadorArticulos: () => import('@/components/common/buscador-articulos/Index'),
		// CategoryOptions: () => import('@/components/vender/components/remito/header-form/CategoryOptions'),
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
		/*
			Aca estaba col_header_lg(), el ancho del buscador segun las extensiones. Se saco con los
			diseños de Vender: la misma cuenta vive ahora en el `cols` de `buscador_de_articulos` en
			layout/elementos.js.
		*/
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
		/**
		 * Al elegir un artículo por nombre, lo deja en cabecera y pide cantidad si corresponde.
		 *
		 * @param {Object} result - Resultado del buscador ({ model, query, ... })
		 */
		setSelected(result) {

			const article = {
				...result.model,
				is_article: true,
			}

			/*
				🔴 Articulo de la CACHE con variantes (mision variantes-mismo-articulo-en-vender,
				8/10/2026). Sin conexion el buscador busca en la cache (search_articles_offline,
				mixins/model_functions.js) y devuelve el articulo crudo, que entraba PELADO: sin
				variante, y el stock salia del articulo. Con conexion eso no pasa porque la API
				devuelve una fila por variante (VenderSearchHelper::match_descriptors).

				Ahora se abre el selector de variantes con las de la cache, igual que el escaneo del
				codigo del padre sin conexion. Es el mismo armado que abrir_selector_de_variantes() de
				ArticleBarCode.vue (que es un metodo de ese componente y no se puede llamar desde
				aca): si se cambia uno, se cambia el otro. Al elegir, SelectVariant.vue arma el item
				con armar_item_de_variante (utils/item_de_variante.js), como en todos los caminos.

				Como se sabe que viene de la cache: las filas de la API traen SIEMPRE is_variant
				(true en una variante, false en el articulo, build_row); el articulo de la cache no
				trae esa clave. Solo con la extension article_variants, como la API.
			*/
			if (
				typeof result.model.is_variant == 'undefined'
				&& this.hasExtencion('article_variants')
			) {

				let variantes = variantes_disponibles_en_cache(result.model)

				if (variantes.length) {

					this.$store.commit('vender/setArticleForSale', {
						...result.model,
						variants: variantes,
					})

					this.$bvModal.show('select-variant')

					let input = document.getElementById('search-article')

					if (input) {
						this.setInputValueSync(input, '')
					}

					return
				}
			}

			this.set_codigo_input_value(article)

			// true en el 4º parámetro: el modal de búsqueda cierra después y puede robar el foco
			this.set_item_vender(article, false, true, true)

			if (this.owner.ask_amount_in_vender) {
				const input = document.getElementById('search-article')
				if (input) {
					this.setInputValueSync(input, article.name)
				}
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