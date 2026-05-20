/**
 * Modelo declarativo: corrida de importación ML → artículos locales.
 */
export default {
	properties: [
		{
			text: 'Estado',
			key: 'status',
			type: 'text',
			only_show: true,
		},
		{
			text: 'Resumen',
			key: 'summary_message',
			type: 'textarea',
			only_show: true,
		},
		{
			text: 'Publicaciones en Mercado Libre',
			key: 'meli_items_total',
			type: 'text',
			only_show: true,
		},
		{
			text: 'Artículos creados en el sistema',
			key: 'articles_created_count',
			type: 'text',
			only_show: true,
		},
		{
			text: 'Ya vinculados (omitidos)',
			key: 'articles_skipped_count',
			type: 'text',
			only_show: true,
		},
		{
			text: 'Con error',
			key: 'articles_error_count',
			type: 'text',
			only_show: true,
		},
		{
			text: 'Total vinculados en el sistema',
			key: 'articles_linked_total_count',
			type: 'text',
			only_show: true,
			descriptions: [
				'Artículos nuevos creados en esta corrida más los que ya estaban enlazados y no se modificaron.',
			],
		},
		{
			text: 'Detalle error',
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
			text: 'Finalizado',
			key: 'synced_at',
			type: 'date',
			only_show: true,
			is_date: true,
		},
		{
			text: 'Artículos (detalle)',
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
			},
		},
	],
	singular_model_name_spanish: 'Importación desde Mercado Libre',
	plural_model_name_spanish: 'Importaciones desde Mercado Libre',
	create_model_name_spanish: 'Importar artículos',
	color_display_function: true,
	text_delete: 'la',
}
