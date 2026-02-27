export default {
	properties: [
		{
			text: 'Usuario',
			key: 'auth_user_id',
			type: 'text',
			is_title: true,
			only_show: true,
		},
		{
			text: 'Tipo',
			key: 'action',
			type: 'text',
			only_show: true,
		},
		{
			text: 'Cantidad Filtrados',
			key: 'filtrados_count',
			type: 'number',
			only_show: true,
		},
		{
			text: 'Cantidad Afectados',
			key: 'afectados_count',
			type: 'number',
			only_show: true,
		},
		{
			text: 'Filtros usados',
			key: 'used_filters_text',
			type: 'text',
			only_show: true,
		},
		// {
		// 	text: 'Filtros usados',
		// 	key: 'used_filters',
		// 	type: 'text',
		// 	only_show: true,
		// },

	],
	singular_model_name_spanish: 'Localidad',
	plural_model_name_spanish: 'Localidades',
	create_model_name_spanish: 'Nueva localidad',
	text_delete: 'la',
}