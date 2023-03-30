export default {
	properties: [
		{
			text: 'N°',
			key: 'num',
			type: 'text',
			not_show_on_form: true,
		},
		{
			text: 'Imagenes',
			key: 'images',
			type: 'images',
			use_to_show_in_search_modal: true,
		},
		{
			text: 'Codigo de barras',
			key: 'bar_code',
			type: 'text',
			use_to_check_if_is_repeat: true,
			use_to_show_in_search_modal: true,
		},
		{
			text: 'Codigo de Proveedor',
			key: 'provider_code',
			type: 'text',
			use_to_check_if_is_repeat: true,
			use_to_show_in_search_modal: true,
		},
		{
			text: 'nombre',
			key: 'name',
			type: 'text',
			is_title: true,
			use_to_show_in_search_modal: true,
		},
		{
			text: 'costo',
			key: 'cost',
			type_to_update: 'number',
			type: 'text',
			is_price: true,
			use_to_update: true,
		},
		{
			text: 'costo en dolares',
			key: 'cost_in_dollars',
			type: 'checkbox',
			use_to_update: true,
		},
		{
			text: 'margen de ganancia',
			key: 'percentage_gain',
			type: 'text',
			type_to_update: 'number',
			use_to_update: true,
		},
		{
			text: 'precio',
			key: 'price',
			type: 'text',
			type_to_update: 'number',
			is_price: true,
			use_to_update: true,
		},
		{
			text: 'Precio final',
			key: 'final_price',
			type: 'number',
			only_show: true,
			is_price: true,
			use_to_show_in_search_modal: true,
		},
		{
			text: 'Precio final actualizado',
			key: 'final_price_updated_at',
			type: 'text',
			only_show: true,
			is_date: true,
		},
		{
			text: 'stock',
			key: 'stock',
			type: 'number',
			use_to_show_in_search_modal: true,
		},
		{
			text: 'stock minimo',
			key: 'stock_min',
			type: 'number',
		},
		{
			text: 'Disponible en la tienda',
			key: 'online',
			type: 'checkbox',
		},
		{
			text: 'Destacado',
			key: 'featured',
			type: 'checkbox',
		},
		{
			text: 'proveedor',
			key: 'provider_id',
			type: 'search',
			use_to_show_in_search_modal: true,
			use_to_update: true,
		},
		// {
		// 	text: 'precio en dolar del proveedor',
		// 	key: 'provider_cost_in_dollars',
		// 	type: 'checkbox',
		// },
		{
			text: 'Aplicar margen de ganancia del proveedor',
			key: 'apply_provider_percentage_gain',
			type: 'checkbox',
			v_if: ['provider.percentage_gain', '!=', null]
			// show_if: {
			// 	model_prop_name: 'provider',
			// 	model_prop: 'percentage_gain',
			// }
		},
		{
			text: 'Lista de precios',
			key: 'provider_price_list_id',
			type: 'search',
			is_between: {
				store: 'provider',
				model_prop: 'provider_price_lists',
			},
		},
		{
			text: 'categoria',
			key: 'category_id',
			type: 'search',
			use_to_show_in_search_modal: true,
			use_to_update: true,
		},
		{
			text: 'sub categoria',
			key: 'sub_category_id',
			type: 'search',
			depends_on: 'category_id',
			use_to_show_in_search_modal: true,
			use_to_update: true,
		},
		{
			text: 'iva',
			key: 'iva_id',
			type: 'select',
			use_to_show_in_search_modal: true,
		},
		{
			text: 'Marca',
			key: 'brand_id',
			type: 'search',
			use_to_show_in_search_modal: true,
		},
		{
			text: 'Condicion',
			key: 'condition_id',
			type: 'select',
		},
		{
			text: 'Depositos',
			key: 'deposits',
			type: 'search',
			store: 'deposit',
			belongs_to_many: {
				properties_to_set: [
					{
						text: 'Cantidad',
						key: 'value',
					},
				],
			},
		},
		{
			text: 'Talles',
			key: 'sizes',
			type: 'checkbox',
			store: 'size',
			belongs_to_many: {
			}
		},
		{
			text: 'Colores',
			key: 'colors',
			type: 'checkbox',
			store: 'color',
			belongs_to_many: {
			}
		},
		{
			text: 'Descuentos',
			key: 'article_discounts',
			has_many: {
				text: 'Descuento',
				model_name: 'article_discount',
			},
		},
		{
			text: 'Descripciones',
			key: 'descriptions',
			has_many: {
				text: 'Descripcion',
				model_name: 'description',
			},
		},
	],
	singular_model_name_spanish: 'Articulo',
	plural_model_name_spanish: 'Articulos',
	create_model_name_spanish: 'Nuevo',
	text_delete: 'el',
}