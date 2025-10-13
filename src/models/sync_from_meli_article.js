export default {
	properties: [
		{
			text: 'Estado',
			key: 'status',
			type: 'text',
			only_show: true,
		},
		{
			text: 'Detalle',
			key: 'error_message',
			type: 'textarea',
			only_show: true,
		},
		{
			text: 'Intentado',
			key: 'attempted_at',
			type: 'date',
			only_show: true,
			is_date: true,
		},
		{
			text: 'Sincronizado',
			key: 'synced_at',
			type: 'date',
			only_show: true,
			is_date: true,
		},
		{
			text: 'Articulos',
			store: 'article',
			only_show: true,
			search_on_models_by: 'name',
			type: 'search',
			key: 'articles',
			belongs_to_many: {
				model_name: 'article',
				props_to_show: [
					{
						text: 'Codigo de barras',
						key: 'bar_code',
						show: true,
					},
					{
						text: 'Codigo Prov',
						key: 'provider_code',
						show: true,
					},
					{
						text: 'Nombre',
						key: 'name',
						show: true,
					},
				],
				pivot_props_to_show: [
					{
						key: 'status',
						text: 'Estado',
					},
					{
						key: 'error_code',
						text: 'Detalle',
					},
				],
			}
		},
	],
	singular_model_name_spanish: 'Sincronizacion de articulos',
	plural_model_name_spanish: 'Sincronizaciones de articulos',
	create_model_name_spanish: 'Nueva Sincronizacion de articulos',
	color_display_function: true,
	text_delete: 'la',
}