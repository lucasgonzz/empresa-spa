export default {
	properties: [
		{
			text: 'Articulo',
			key: 'article_id',
			type: 'text',
			only_show: true,
		},
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
	],
	singular_model_name_spanish: 'Sincronizacion',
	plural_model_name_spanish: 'Sincronizaciones',
	create_model_name_spanish: 'Nueva Sincronizacion',
	text_delete: 'la',
	color_display_function: true,
}