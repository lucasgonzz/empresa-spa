<template>
<div id="listado" data-tour="listado.contenedor">	
	<!-- <article-charts></article-charts>

	<stock-min></stock-min>
	<stock-0></stock-0>


	<update-props></update-props>

	
	<images-copy></images-copy> -->

	<filter-history-modal></filter-history-modal>

	<final-price-description></final-price-description>

	<current-acounts></current-acounts>
	
	<charts></charts>
	<article-sales></article-sales>
	<article-used-in-recipes></article-used-in-recipes>
	<article-variants></article-variants>
	<providers-history></providers-history>
	<article-providers></article-providers>
	<change-provider></change-provider>
	<stock-movement></stock-movement>
	<address-movement></address-movement>
	<stock-movement-modal-info></stock-movement-modal-info>
	<confirm-reset-stock></confirm-reset-stock>
	
	<create-article-addresses></create-article-addresses>

	<price-changes></price-changes>

	<inventory-performance></inventory-performance>

	<mercado-libre></mercado-libre>

	<mercado-libre-category-predictor></mercado-libre-category-predictor>

	<article-ubications></article-ubications>
	<acopios></acopios>


	<!-- <stock-info></stock-info> -->

	<articles-pre-import-modal></articles-pre-import-modal>

	<view-component
	show_view_header
	show_filter_modal
	ask_selectable
	show_excel_drop_down
	:has_permission_create_dropdown="has_permission_create_dropdown"
	:properties_to_show="properties_to_show"
	:extra_properties_for_modal="price_type_modal_extra_properties"
	@addressMovement="addressMovement"
	:show_empty_text="show_empty_text"
	:filtros_fijos_por_defecto="filtros_fijos_por_defecto"
	model_name="article">

		<template #model_modal_header="props">
			<!-- Ficha por codigo de barras: la busca un agente de IA, asi que exige "Agentes de IA" (agentes_ia). Sin la extension ni se monta (no dispara el POST article-enrichments). -->
			<product-facts-proposal
			v-if="hasExtencion('agentes_ia')"
			:model="props.model"></product-facts-proposal>
		</template>

		<template #excel_drop_down_options>
			<excel-dropdown-options></excel-dropdown-options>
		</template>

		<template #horizontal_nav_center>

			<horizontal-nav></horizontal-nav>

		</template>

		<template #options_drop_down_seleccion>

			<drop-down-options></drop-down-options>

		</template>

		<template #options_drop_down_filtro>

			<drop-down-options></drop-down-options>

		</template>

		<template v-slot:table_left_options="props">
			<buttons :model="props.model" />	
		</template>

		<template #name>
			<name-input></name-input>  
		</template>

		<template #stock>
			<stock-input></stock-input>
		</template>

		<!-- Mercado Libre (misión mercado-libre-integracion, 27/10/2026): categoría con el predictor, los datos que pide la categoría y el estado de la publicación. La prop solo existe con la extensión usa_mercado_libre. -->
		<template #meli_category_id>
			<mercado-libre-form></mercado-libre-form>
		</template>


		<template #percentage_gain>
			<percentage-gain-input></percentage-gain-input>
		</template>
		<template #price>
			<price-input></price-input>
		</template>

		<!-- Prompt 612: "Costo base" con descripcion permanente que cambia segun RRII/Monotributista -->
		<template #cost>
			<cost-input></cost-input>
		</template>

		<!-- Prompt 612: "Aplicar iva" forzado y bloqueado para RRII migrado (check normal en configuracion vieja); oculto por completo en Monotributista via v_if_function -->
		<template #aplicar_iva>
			<aplicar-iva-input></aplicar-iva-input>
		</template>

		<template #final_price>
			<final-price></final-price>
		</template>

		
		<template
		v-for="price_type in price_types"
		v-slot:[get_model_form_price_type_slot(price_type)]="props">
			<price-type-input
			:article="props.model"
			:price_type="price_type"></price-type-input>
		</template>


		<!-- <template #table-prop-images="props">
			<google-btn
			:article="props.model"></google-btn>
		</template> -->

		<template #table-prop-price="props">
			<article-price
			:article="props.model"></article-price> 
		</template>

		<template #table-prop-stock="props">
			<stock-btn
			:article="props.model"></stock-btn>
		</template> 


		<template
		v-for="price_type in price_types"
		v-slot:[get_table_price_type_prop(price_type)]="props">
			{{ get_price_type_price(props.model, price_type) }}
		</template>

		<template
		v-for="address in addresses"
		v-slot:[get_table_address_prop(address)]="props">
			<address-stock
			:article="props.model"
			:address="address"></address-stock>
		</template>
		
		<template
		v-for="payment_method_discount in current_acount_payment_method_discounts"
		v-slot:[get_table_paymen_discount_prop(payment_method_discount)]="props">
			{{ get_payment_discount(props.model, payment_method_discount) }}
		</template>

	</view-component>
	
</div>
</template>

<script>
import payment_method_discounts_addresses_columns from '@/mixins/listado/payment_method_discounts_addresses_columns'
import actualizar_lista_de_articulos from '@/mixins/listado/actualizar_lista_de_articulos'

export default {
	mixins: [payment_method_discounts_addresses_columns, actualizar_lista_de_articulos],
	name: 'Lisado',
	components: {
		ProductFactsProposal: () => import('@/components/listado/components/ProductFactsProposal'),
		ViewComponent: () => import('@/common-vue/components/view/Index'),


		ExcelDropdownOptions: () => import('@/components/listado/components/excel-dropdown-options/Index'),
		ArticlesPreImportModal: () => import('@/components/listado/modals/articles-pre-import/Index'),
		// StockInfoButtons: () => import('@/components/listado/components/StockInfoButtons'),
		
		Buttons: () => import('@/components/listado/components/Buttons'),
		Charts: () => import('@/components/listado/modals/article-charts/Index'),
		ArticleSales: () => import('@/components/listado/modals/article-sales/Index'),
		ArticleUsedInRecipes: () => import('@/components/listado/modals/article-used-in-recipes/Index'),
		ArticleVariants: () => import('@/components/listado/modals/article-variants/Index'),
		ProvidersHistory: () => import('@/components/listado/modals/providers-history/Index'),
		ArticleProviders: () => import('@/components/listado/modals/article-providers/Index'),
		ChangeProvider: () => import('@/components/listado/modals/ChangeProvider'),
		StockMovement: () => import('@/components/listado/modals/stock-movement/Index'),
		AddressMovement: () => import('@/components/listado/modals/address-movement/Index'),
		StockMovementModalInfo: () => import('@/components/listado/modals/stock-movement-modal-info/Index'),
		CreateArticleAddresses: () => import('@/components/listado/modals/create-article-addresses/Index'),
		PriceChanges: () => import('@/components/listado/modals/price-changes/Index'),
		NameInput: () => import('@/components/listado/components/NameInput'),
		StockInput: () => import('@/components/listado/components/StockInput'),
		// StockInfo: () => import('@/components/listado/modals/stock-info/Index'),
		StockBtn: () => import('@/components/listado/components/table-props/stock-btn/Index'),
		ArticlePrice: () => import('@/components/listado/components/ArticlePrice'),
		PriceInput: () => import('@/components/listado/components/modal-props/PriceInput'),
		PercentageGainInput: () => import('@/components/listado/components/modal-props/PercentageGainInput'),
		FinalPrice: () => import('@/components/listado/components/modal-props/FinalPrice'),
		// Prompt 612: "Costo base" (descripcion permanente) y "Aplicar iva" (forzado/bloqueado en RRII, oculto en MT)
		CostInput: () => import('@/components/listado/components/modal-props/CostInput'),
		AplicarIvaInput: () => import('@/components/listado/components/modal-props/AplicarIvaInput'),

		// Dropdown options
		DropDownOptions: () => import('@/components/listado/components/selected-filtered-options/Index'),
		ConfirmResetStock: () => import('@/components/listado/modals/ConfirmResetStock'),
		PriceTypeInput: () => import('@/components/listado/components/price-type-input/Index'),
		// PriceTypeInput: () => import('@/components/listado/components/PriceTypeInput'),

		InventoryPerformance: () => import('@/components/listado/modals/inventory-performance/Index'),

		MercadoLibre: () => import('@/components/listado/modals/mercado-libre/Index'),
		MercadoLibreCategoryPredictor: () => import('@/components/listado/modals/mercado-libre/category-predictor/Index'),
		MercadoLibreForm: () => import('@/components/listado/components/mercado-libre-form/Index'),
		ArticleUbications: () => import('@/components/listado/modals/article-ubications/Index'),


		Combos: () => import('@/components/listado/components/combos/Index'),

		AddressStock: () => import('@/components/listado/components/table-props/address-stock/Index'),
		HorizontalNav: () => import('@/components/listado/components/horizontal-nav/Index'),
		GoogleBtn: () => import('@/components/listado/components/table-props/google-btn/Index'),
		Acopios: () => import('@/components/listado/modals/acopios/Index'),
		
		CurrentAcounts: () => import('@/components/common/current-acounts/Index'),

		FinalPriceDescription: () => import('@/components/listado/modals/FinalPriceDescription'),

		FilterHistoryModal: () => import('@/components/listado/modals/filter-history/Index'),
	},
	beforeRouteLeave(to, from, next) {
		this.$store.commit('article/setSelected', [])
		/*
			La edición de stock por depósito de una fila (botón verde de la columna Stock) vive en
			el store y sobrevive a la vista: sin limpiarla, al volver la fila seguía en edición con
			los originales de cuando se abrió, y el botón azul de ese artículo quedaba deshabilitado
			también en el modal del artículo (misión stock-sucursal-desde-listado, 14/10/2026).
		*/
		this.$store.commit('article/edit_addresses_stock/limpiar_edicion')
		next()
	},
	computed: {
		has_permission_create_dropdown() {
			return this.authenticated && this.can('article.export_excel_clients')
		},
		/**
		 * Si el listado no tiene nada para mostrar, hay que decirlo. Siempre.
		 *
		 * Antes esto devolvía `is_filtered`, y ese flag no habla de si hay resultados: habla de por
		 * qué camino se cargaron. Cualquier cosa que lo apague deja la tabla en blanco Y MUDA — sin
		 * filas y sin el cartel que explica que no hay nada—, que es peor que decir "no hay
		 * artículos". Pasó de verdad el 11/8/2026: al guardar el modal de propiedades para mostrar,
		 * la limpieza de filtros apagaba el flag y la tabla quedaba en blanco sin ninguna
		 * explicación (ver el comentario largo de `props-to-show/Modal.vue`, método `save`).
		 *
		 * No hay riesgo de que el cartel aparezca mientras carga: en `display/table/Index.vue` el
		 * `v-else-if="show_empty_text"` va después del tbody de skeleton, que gana con `loading`.
		 * Y el texto ya distingue solo los dos casos, mirando los filtros activos: "No hay
		 * artículos" cuando no hay ninguno, "No se encontraron resultados" cuando la búsqueda no
		 * trajo nada.
		 *
		 * @returns {boolean}
		 */
		show_empty_text() {
			return true
		},
		/**
		 * Filtros fijos por defecto del buscador general (prompt 09 del grupo 179): solo para
		 * clientes con la extensión buscar_por_categoria_en_vender, para que sigan teniendo
		 * categoría y stock ya agregados como filtro fijo la primera vez que usan el buscador
		 * (antes eran selects hardcodeados). Se siembran una sola vez; después el usuario puede
		 * sacarlos o agregar otros sin que se vuelvan a sembrar (ver buscador-general/Index.vue).
		 *
		 * @returns {Array} [{ key, filter_kind, operator, default_value }]
		 */
		filtros_fijos_por_defecto() {
			if (!this.hasExtencion('buscar_por_categoria_en_vender')) {
				return []
			}
			return [
				{ key: 'category_id', filter_kind: 'relation', operator: '=', default_value: null },
				{ key: 'stock', filter_kind: 'numeric_presence', operator: null, default_value: 'todos' },
			]
		},
	},
	methods: {
		addressMovement() {
			console.log('addressMovement')
		},
		/**
		 * Al cerrarse el formulario del artículo, saca los atributos de Mercado Libre que el
		 * componente de Mercado Libre le había agregado al modelo (misión mercado-libre-integracion,
		 * 27/10/2026).
		 *
		 * `meli_attributes` no es una prop del modelo: el componente la agrega cuando el usuario
		 * toca un atributo, y viaja con el resto del artículo al guardar. El modelo del formulario
		 * es el MISMO objeto que la fila del listado (el artículo tiene full_reactivity), así que
		 * si el usuario editaba atributos y cerraba sin guardar, la clave quedaba colgada de la
		 * fila y el próximo guardado de ese artículo la mandaba aunque nadie hubiera abierto la
		 * solapa de Mercado Libre. Sin la clave, la API no toca los atributos guardados.
		 *
		 * @param {Object} evento Evento de bootstrap-vue.
		 * @param {String} modal_id Id del modal que se cerró.
		 * @returns {void}
		 */
		limpiar_atributos_de_mercado_libre(evento, modal_id) {
			if (modal_id != 'article') {
				return
			}
			let model = this.$store.state.article.model
			if (model && Object.prototype.hasOwnProperty.call(model, 'meli_attributes')) {
				this.$delete(model, 'meli_attributes')
			}
			this.$store.commit('meli/set_nombre_escrito', '')
		},
		/**
		 * Recuerda lo que se teclea en el campo del nombre del artículo, para que la solapa de
		 * Mercado Libre pueda sugerir la categoría (misión mercado-libre-integracion, 27/10/2026).
		 *
		 * 🔴 Por qué acá y no en el componente de Mercado Libre: en un artículo NUEVO sin código de
		 * barras, el nombre se escribe en el buscador de NameInput.vue (y en el modal de búsqueda que
		 * abre) y vive en la `query` de ese buscador; pasa a `model.name` recién al guardar. Las
		 * solapas del formulario se dibujan con v-if: mientras el usuario escribe en "Datos generales"
		 * el componente de Mercado Libre no existe, y cuando pasa a esa solapa el campo del nombre ya
		 * no existe. Medido en la verificación del 27/10/2026: con el nombre tecleado, "Sugeridas"
		 * decía "Escribí el nombre…". Listado está montado todo el tiempo, así que escucha él (fase de
		 * captura sobre `document`, solo los dos campos del nombre) y lo deja en el store de meli.
		 * Solo se lee: el nombre sigue pasando al artículo como siempre.
		 *
		 * @param {Event} evento Evento `input` de cualquier campo de la página.
		 * @returns {void}
		 */
		recordar_nombre_para_mercado_libre(evento) {
			let campo = evento && evento.target
			if (!campo || (campo.id != 'article-name' && campo.id != 'article-name-search-modal-input')) {
				return
			}
			if (typeof campo.value == 'string') {
				this.$store.commit('meli/set_nombre_escrito', campo.value.trim())
			}
		},
	},
	created() {
		this.get_ultimos_articulos_actualizados()
		this.$root.$on('bv::modal::hidden', this.limpiar_atributos_de_mercado_libre)
	},
	mounted() {
		if (this.hasExtencion('usa_mercado_libre')) {
			document.addEventListener('input', this.recordar_nombre_para_mercado_libre, true)
		}
	},
	beforeDestroy() {
		this.$root.$off('bv::modal::hidden', this.limpiar_atributos_de_mercado_libre)
		document.removeEventListener('input', this.recordar_nombre_para_mercado_libre, true)
	},
}
</script>
