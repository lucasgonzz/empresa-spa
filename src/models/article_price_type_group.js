export default {
	properties: [
		{
			text: 'Nombre',
			key: 'name',
			type: 'text',
		},
		{
			text: 'Articulos',
			store: 'article',
			search_on_models_by: 'name',
			type: 'search',
			key: 'articles',
			search_from_api_function: 'search_from_api_in_provider_order',
			belongs_to_many: {
				model_name: 'article',
				props_to_show: [
					{
						text: 'Nombre',
						key: 'name',
						type: 'text',
					},
					{
						text: 'Codigo barras',
						key: 'bar_code',
						type: 'text',
					},
					{
						text: 'Codigo proveedor',
						key: 'provider_code',
						type: 'text',
					},
					{
						text: 'Costo',
						key: 'cost',
						type: 'number',
						is_price: true,
					},
				],
			}
		},
	],
	singular_model_name_spanish: 'Grupo de articulos',
	plural_model_name_spanish: 'Grupos de articulos',
	create_model_name_spanish: 'Nuevo Grupo de articulos',
	text_delete: 'el',
}