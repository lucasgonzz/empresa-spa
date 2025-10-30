export default {
	properties: [
		{
			text: 'N°',
			key: 'id',
			type: 'number',
			not_show_on_form: true,
			filter_modal_position: 8,
			use_to_show_in_search_modal: true,
			filter_type: 'number',
			// table_position: 1,
		},
		{
			text: 'Imagenes',
			key: 'images',
			type: 'images',
			use_to_show_in_search_modal: true,
			// table_position: 2,
		},
		{
			group_title: 'Datos generales',
		},
		{
			text: 'Codigo de barras',
			table_text: 'Cod Barras',
			key: 'bar_code',
			type: 'text',
			value: null,
			use_to_check_if_is_repeat: true,
			chequear_buscando_desde_api: true,
			use_to_show_in_search_modal: true,
			filter_modal_position: 1,
			use_bar_code_scanner: true,
			// table_position: 3,
		},
		{
			text: 'Codigo de Proveedor',
			table_text: 'Cod Prov',
			key: 'provider_code',
			type: 'text',
			use_to_check_if_is_repeat: true,
			chequear_buscando_desde_api: true,
			use_to_show_in_search_modal: true,
			filter_modal_position: 2,
			// table_position: 4,
		},
		{
			text: 'nombre',
			key: 'name',
			type: 'text',
			// type_if: {
			// 	condition: 'bar_code',
			// 	operator: '=',
			// 	value: null,
			// 	then: 'search',
			// 	else: 'text',
			// },
			store: 'article',
			save_if_not_exist: false,
			set_model_on_click_or_prop_with_query_if_null: true,
			auto_select: false,
			clear_query: false,
			is_title: true,
			use_to_show_in_search_modal: true,
			table_width: 'lg',
			filter_modal_position: 2,
			// table_position: 5,
		},
		{
			text: 'proveedor',
			key: 'provider_id',
			type: 'search',
			use_to_show_in_search_modal: true,
			use_to_update: true,
			use_store_models: true,
			filter_modal_position: 4,
			keep_after_create: true,
			can: 'article.provider',
			// table_position: 6,
		},
		{
			text: 'Aplicar margen de ganancia del proveedor',
			key: 'apply_provider_percentage_gain',
			type: 'checkbox',
			value: 1,
			v_if: ['provider.percentage_gain', '!=', null],
			v_if_from_models_store: true,
			not_show: true,
			keep_after_create: true,
			if_has_not_extencions: [
				'articulo_margen_de_ganancia_segun_lista_de_precios',
				'lista_de_precios_por_categoria',
			],
		},
		{
			group_title: 'Precio',
		},
		{
			text: 'costo',
			key: 'cost',
			type_to_update: 'number',
			type: 'text',
			is_price: true,
			use_to_update: true,
			filter_modal_position: 10,
			filter_type: 'number',
			can: 'article.cost',
			check_simbolo_moneda: true,
			prop_to_check_in_simbolo_moneda: {
				key: 'cost_in_dollars',
				equal_to: 1
			},
			// table_position: 8,
		},

		{
			text: 'Costo Real',
			key: 'costo_real',
			type_to_update: 'number',
			type: 'text',
			is_price: true,
			only_show: true,
			can: 'article.cost',
			simbolo_moneda_function: 'article_simbolo_moneda',
			// if_has_extencion: 'article.costo_real',
		},

		{
			text: 'costo en dolares',
			key: 'cost_in_dollars',
			type: 'checkbox',
			use_to_update: true,
			prop_info: {
				text: 'Valor: ',
				model_prop: 'provider.dolar',
			},
			if_has_extencion: 'costo_en_dolares',
			not_show: true,
		},
		// {
		// 	// text: 'costo_mano_de_obra',
		// 	key: 'costo_mano_de_obra',
		// 	type_to_update: 'number',
		// 	type: 'text',
		// 	is_price: true,
		// 	if_has_extencion: 'production',
		// 	not_show: true,
		// },
		{
			text: 'U individuales',
			key: 'unidades_individuales',
			type: 'number',
			not_show: true,
			if_has_extencion: 'articulos_unidades_individuales',
		},
		{
			text: 'margen de ganancia',
			key: 'percentage_gain',
			can: 'article.percentage_gain',
			type: 'number',
			type_to_update: 'number',
			use_to_update: true,
			not_show: true,
			filter_modal_position: 12,
			filter_type: 'number',
			keep_after_create: true,
			if_has_not_extencions: [
				'articulo_margen_de_ganancia_segun_lista_de_precios',
				'lista_de_precios_por_categoria',
			],
		},


		{
			text: 'margen de ganancia BLANCO',
			key: 'percentage_gain_blanco',
			type: 'number',
			if_has_extencion: 'articulos_precios_en_blanco',
			type_to_update: 'number',
			use_to_update: true,
			not_show: true,
			filter_modal_position: 12,
			filter_type: 'number',
		},

		{
			text: 'precio',
			key: 'price',
			type: 'text',
			type_to_update: 'number',
			is_price: true,
			use_to_update: true,
			filter_modal_position: 11,
			filter_type: 'number',
			if_has_not_extencions: [
				'articulo_margen_de_ganancia_segun_lista_de_precios',
				'lista_de_precios_por_categoria',
			],
			// table_position: 9,
		},
		{
			text: 'Aplicar iva',
			key: 'aplicar_iva', 
			type: 'checkbox',
			not_show: true,
			value: 1,
		},
		{
			text: 'Iva',
			key: 'iva_id', 
			type: 'select',
			relation_prop_name: 'percentage',
			use_store_models: true,
			use_to_show_in_search_modal: true,
			not_show: true,
			keep_after_create: true,
			// value: 2,
			value_function: 'article_iva_id',
			use_to_update: true,
		},

		{
			text: 'Precio final',
			key: 'final_price',
			type: 'number',
			check_simbolo_moneda: true,
			simbolo_moneda_function: 'article_simbolo_moneda',
			// prop_to_check_in_simbolo_moneda: {
			// 	key: 'cost_in_dollars',
			// 	equal_to: 1
			// },
			only_show: true,
			is_price: true,
			use_to_show_in_search_modal: true,
			filter_modal_position: 9,
			class: 'final-price',
			if_has_not_extencions: [
				'articulo_margen_de_ganancia_segun_lista_de_precios',
				'lista_de_precios_por_categoria',
			],
			// table_position: 10,
		},


		// Autopartes
		{
			group_title: 'Autopartes',
			if_has_extencion: 'autopartes',
			not_show: true,
		},
		{
			key: 'espesor',
			type: 'text',
			if_has_extencion: 'autopartes',
			not_show: true,
		},
		{
			key: 'modelo',
			type: 'text',
			if_has_extencion: 'autopartes',
			not_show: true,
		},
		{
			key: 'pastilla',
			type: 'text',
			if_has_extencion: 'autopartes',
			not_show: true,
		},
		{
			key: 'diametro',
			type: 'text',
			if_has_extencion: 'autopartes',
			not_show: true,
		},
		{
			key: 'litros',
			type: 'text',
			if_has_extencion: 'autopartes',
			not_show: true,
		},
		// {
		// 	key: 'descripcion',
		// 	type: 'text',
		// 	if_has_extencion: 'autopartes',
		// 	not_show: true,
		// },
		{
			key: 'contenido',
			type: 'text',
			if_has_extencion: 'autopartes',
			not_show: true,
		},
		{
			key: 'cm3',
			type: 'text',
			if_has_extencion: 'autopartes',
			not_show: true,
		},
		{
			key: 'calipers',
			type: 'text',
			if_has_extencion: 'autopartes',
			not_show: true,
		},
		{
			key: 'juego',
			type: 'text',
			if_has_extencion: 'autopartes',
			not_show: true,
		},



		// Vinoteca
		{
			group_title: 'Vinoteca',
			if_has_extencion: 'vinoteca',
		},
		{
			text: 'Bodega',
			key: 'bodega_id',
			type: 'select',
			use_store_models: true,
			if_has_extencion: 'vinoteca',
		},
		{
			text: 'Cepa',
			key: 'cepa_id',
			type: 'select',
			use_store_models: true,
			if_has_extencion: 'vinoteca',
		},
		{
			text: 'Origen',
			key: 'origen',
			type: 'text',
			if_has_extencion: 'vinoteca',
		},
		{
			text: 'Presentacion',
			key: 'presentacion',
			type: 'number',
			if_has_extencion: 'vinoteca',
		},


		{
			text: 'Precio final BLANCO',
			key: 'final_price_blanco',
			type: 'number',
			if_has_extencion: 'articulos_precios_en_blanco',
			only_show: true,
			is_price: true,
			use_to_show_in_search_modal: true,
			filter_modal_position: 9,
		},
		{
			text: 'Precio final anterior',
			key: 'previus_final_price',
			type: 'number',
			only_show: true,
			is_price: true,
			use_to_show_in_search_modal: true,
			not_show: true,
			if_has_not_extencions: [
				'articulo_margen_de_ganancia_segun_lista_de_precios',
				'lista_de_precios_por_categoria',
			],
		},
		{
			text: 'Precio final actualizado',
			key: 'final_price_updated_at',
			type: 'date',
			only_show: true,
			is_date: true,
			not_show: true,
			if_has_not_extencions: [
				'articulo_margen_de_ganancia_segun_lista_de_precios',
				'lista_de_precios_por_categoria',
			],
		},



		{
			group_title: 'Stock',
		},
		{
			text: 'stock',
			key: 'stock',
			type: 'number',
			filter_modal_position: 13,
			use_to_show_in_search_modal: true,
			// table_position: 7,
		},
		{
			text: 'stock minimo',
			key: 'stock_min',
			type: 'number',
			not_show: true,
		},
		{
			text: 'stock actualizado',
			key: 'stock_updated_at',
			type: 'date',
			only_show: true,
			is_date: true,
		},

		{
			text: 'Unidad medida',
			key: 'unidad_medida_id',
			type: 'select',
			not_show: true,
			use_store_models: true,
		},



		{
			group_title: 'Categoria',
		},
		{
			text: 'categoria',
			key: 'category_id',
			type: 'search',
			use_to_show_in_search_modal: true,
			use_store_models: true,
			use_to_update: true,
			not_show: true,
			filter_modal_position: 5,
			keep_after_create: true,
		},
		{
			text: 'sub categoria',
			key: 'sub_category_id',
			type: 'search',
			depends_on: 'category_id',
			use_to_show_in_search_modal: true,
			use_store_models: true,
			use_to_update: true,
			not_show: true,
			filter_modal_position: 6,
			keep_after_create: true,
		},
		{
			text: 'Marca',
			key: 'brand_id',
			type: 'search',
			use_to_show_in_search_modal: true,
			use_store_models: true,
			not_show: true,
			not_show: true,
			filter_modal_position: 7,
			keep_after_create: true,
		},
		{
			key: 'descripcion',
			type: 'textarea',
			not_show: true,
		},


		{
			text: 'Omitir en lista pdf',
			key: 'omitir_en_lista_pdf',
			type: 'checkbox',
			value: 0,
			not_show: true,
			if_has_extencion: 'vinoteca',
		},



		{
			group_title: 'Tienda online',
			if_has_extencion: 'online',
		},
		{
			text: 'Disponible en la tienda',
			key: 'online',
			type: 'checkbox',
			value: 1,
			not_show: true,
			keep_after_create: true,
			if_has_extencion: 'online',
		},
		{
			text: 'Destacado',
			key: 'featured',
			type: 'checkbox',
			not_show: true,
			if_has_extencion: 'online',
		},
		{
			text: 'En oferta',
			key: 'in_offer',
			type: 'checkbox',
			not_show: true,
			if_has_extencion: 'online',
		},


		{
			group_title: 'Mercado Libre',
			if_has_extencion: 'usa_mercado_libre',
		},
		{
			text: 'Disponible en Mercado Libre',
			key: 'mercado_libre',
			type: 'checkbox',
			value: 1,
			not_show: true,
			if_has_extencion: 'usa_mercado_libre',
			keep_after_create: true,
		},
		{
			text: 'Tipo publicacion',
			key: 'meli_listing_type_id',
			type: 'select',
			use_store_models: true,
			not_show: true,
			if_has_extencion: 'usa_mercado_libre',
		},
		{
			text: 'Modo de compra',
			key: 'meli_buying_mode_id',
			type: 'select',
			use_store_models: true,
			not_show: true,
			if_has_extencion: 'usa_mercado_libre',
		},
		{
			text: 'Condicion',
			key: 'meli_item_condition_id',
			type: 'select',
			use_store_models: true,
			not_show: true,
			if_has_extencion: 'usa_mercado_libre',
		},
		{
			text: 'Descripcion',
			key: 'meli_descripcion',
			type: 'textarea',
			not_show: true,
			if_has_extencion: 'usa_mercado_libre',
		},

		// Propiedades de distribuidora
		{
			text: 'U x Bulto',
			key: 'unidades_por_bulto',
			type: 'text',
			not_show: true,
			if_has_extencion: 'articulos_con_propiedades_de_distribuidora',
		},
		{
			key: 'contenido',
			type: 'text',
			not_show: true,
			if_has_extencion: 'articulos_con_propiedades_de_distribuidora',
		},
		{
			text: 'Tipo de envase',
			key: 'tipo_envase_id',
			type: 'select',
			use_store_models: true,
			not_show: true,
			if_has_extencion: 'articulos_con_propiedades_de_distribuidora',
		},




		// {
		// 	text: 'Condicion',
		// 	key: 'condition_id',
		// 	type: 'select',
		// 	not_show: true,
		// },
		{
			text: 'Por defecto en VENDER',
			key: 'default_in_vender',
			type: 'checkbox',
			not_show: true,
			if_has_extencion: 'articles_default_in_vender',
		},
		// {
		// 	text: 'Stock por direccion',
		// 	key: 'addresses',
		// 	only_show: true,
		// 	type: 'search',
		// 	store: 'address',
		// 	belongs_to_many: {
		// 		model_name: 'address',
		// 		props_to_show: [
		// 			{
		// 				text: 'Deposito',
		// 				key: 'street',
		// 			},
		// 		],
		// 		pivot_props_to_show: [
		// 			{
		// 				text: 'Cantidad',
		// 				key: 'amount',
		// 			},
		// 		],
		// 	},
		// 	not_show: true,
		// },
		// {
		// 	text: 'Movimientos de Stock',
		// 	type: 'button',
		// 	button: {
		// 		button_text: 'Mover stock entre depositos',
		// 		variant: 'primary',
		// 	},
		// 	modal: 'address-movement',
		// 	// v_if_prop_length: 'addresses',
		// 	v_if_function: 'show_btn_mover_stock',
		// 	not_show: true,
		// },
		// {
		// 	text: 'Comenzar a utilizar depositos',
		// 	type: 'button',
		// 	button: {
		// 		button_text: 'Repartir stock global entre depositos',
		// 		variant: 'primary',
		// 	},
		// 	modal: 'create-article-addresses',
		// 	v_if_function: 'show_btn_repartir_stock',
		// 	not_show: true,
		// },
		// {
		// 	text: 'Depositos',
		// 	key: 'deposits',
		// 	type: 'search',
		// 	store: 'deposit',
		// 	belongs_to_many: {
		// 		properties_to_set: [
		// 			{
		// 				text: 'Cantidad',
		// 				key: 'value',
		// 				type: 'number',
		// 			},
		// 		],
		// 	},
		// 	not_show: true,
		// },
		{
			text: 'Descuentos',
			key: 'article_discounts',
			has_many: {
				text: 'Descuento',
				model_name: 'article_discount',
			},
			not_show: true,
		},

		{
			text: 'Descuentos en BLANCO',
			key: 'article_discounts_blanco',
			if_has_extencion: 'articulos_precios_en_blanco',
			has_many: {
				text: 'Descuento',
				model_name: 'article_discount_blanco',
			},
			not_show: true,
		},


		{
			text: 'Recargos',
			key: 'article_surchages',
			has_many: {
				text: 'Recargo',
				model_name: 'article_surchage',
			},
			not_show: true,
		},

		{
			text: 'Recargos en BLANCO',
			key: 'article_surchages_blanco',
			if_has_extencion: 'articulos_precios_en_blanco',
			has_many: {
				text: 'Recargo',
				model_name: 'article_surchage_blanco',
			},
			not_show: true,
		},

		{
			text: 'Descripciones',
			key: 'descriptions',
			has_many: {
				text: 'Descripcion',
				model_name: 'description',
			},
			not_show: true,
		},
		{
			// text: 'Descripciones',
			key: 'article_properties',
			// has_many: {
			// 	text: 'Descripcion',
			// 	model_name: 'description',
			// },
			not_show: true,
			not_show_on_form: true,
			no_mostrar_nunca: true,
		},


		/* 
			Esto lo uso para que cuando creo un nuevo articulo, 
			se setee esta propiedad y la tenga disponible en el modal de articulo,
			para que indiquen el marguen de ganancia para cada lista de precios.
			Como si tienen la extencion articulo_margen_de_ganancia_segun_lista_de_precios
			Como pack, electro_lacarra
		*/
		{
			funcion_personalizada: 'set_article_price_types',
			text: '',
			store: 'price_type',
			type: 'search',
			key: 'price_types',
			belongs_to_many: {
				related_with_all: true,
				model_name: 'price_type',
				properties_to_set: [
					{
						text: 'percentage',
						key: 'percentage',
						value: '',
						type: 'number'
					},
					// {
					// 	text: 'percentage',
					// 	key: 'incluir_en_excel_para_clientes',
					// 	value: 0,
					// 	type: 'checkbox'
					// },
				],
			},
			not_show: true,
			not_show_on_form: true,
		},
	],
	singular_model_name_spanish: 'Articulo',
	plural_model_name_spanish: 'Articulos',
	create_model_name_spanish: 'Nuevo',
	text_delete: 'el',
	full_reactivity: true,
	show_all_models_on_display: false,
}