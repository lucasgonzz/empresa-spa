export default {
	properties: [
		{
			text: 'Imagenes',
			key: 'images',
			type: 'images',
		},
		{
			text: 'Nombre',
			key: 'name',
			type: 'text',
			is_title: true,
		},
		{
			text: 'Costo',
			key: 'cost',
			type: 'number',
			only_show: true,
			is_price: true,
		},
		{
			text: 'Precio',
			key: 'final_price',
			type: 'number',
			is_price: true,
		},
		{
			text: 'Stock',
			key: 'stock',
			type: 'number',
		},
		{
			text: 'Deposito',
			key: 'address_id',
			type: 'select',
			use_store_models: true,
			select_prop_name: 'street',
			show: true,
			value: 0,
			required: true,
			required_if_models_length: 'address',
			disabled_if_not_0: true,
		},
		{
			text: 'Disponible en la tienda',
			key: 'online',
			type: 'checkbox',
			show: true,
			value: 1,
		},
		{
			text: 'Descripcion',
			key: 'description',
			type: 'texteditor',
		},
		{
			text: 'Articulos',
			store: 'article',
			type: 'search',
			key: 'articles',
			no_editar_una_vez_creado_el_modelo: true,
			search_from_api: true,
			belongs_to_many: {
				model_name: 'article',
				props_to_show: [
					{
						text: 'Codigo barras',
						key: 'bar_code',
					},
					{
						text: 'Codigo proveedor',
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
					{
						text: 'Precio final',
						key: 'final_price',
						is_price: true,
					},					
				],
				properties_to_set: [
					{
						text: 'Cantidad',
						key: 'amount',
						type: 'number',
					},
					{
						text: 'Unidades por promo',
						key: 'unidades_por_promo',
						type: 'number',
					},
				],
			}
		}
	],
	singular_model_name_spanish: 'Promocion',
	plural_model_name_spanish: 'Promociones',
	create_model_name_spanish: 'Nueva Promocion',
	full_reactivity: true,
	text_delete: 'la',
}