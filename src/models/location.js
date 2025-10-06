export default {
	properties: [
		{
			text: 'Nombre',
			key: 'name',
			type: 'text',
			value: '',
			is_title: true,
		},
		{
			text: 'Provincia',
			key: 'provincia_id',
			type: 'select',
			use_store_models: true,
		},
		{
			text: 'Codigo postal',
			key: 'codigo_postal',
			type: 'text',
		},
	],
	singular_model_name_spanish: 'Localidad',
	plural_model_name_spanish: 'Localidades',
	create_model_name_spanish: 'Nueva',
	text_delete: 'la',
}