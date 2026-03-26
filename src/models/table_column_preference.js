export default {
	properties: [
		{
			text: 'Modelo',
			key: 'model_name',
			type: 'text',
			is_title: true,
			description: 'Nombre del modelo (ej. article, sale)',
		},
		{
			text: 'Tipo de preferencia',
			key: 'preference_type',
			type: 'text',
			value: 'table',
			description: 'Valores: table o search',
		},
		{
			text: 'Columnas (JSON)',
			key: 'columns',
			type: 'textarea',
			value: '[]',
			description: 'Array JSON con key, visible, order, width, wrap_content',
		},
	],
	singular_model_name_spanish: 'Preferencia de columnas',
	plural_model_name_spanish: 'Preferencias de columnas',
	create_model_name_spanish: 'Nueva preferencia de columnas',
	text_delete: 'la',
}
