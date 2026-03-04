export default {
	properties: [
		{
			text: 'Descripcion',
			key: 'notes',
			type: 'text',
			only_show: true,
		},
		{
			text: 'Precio',
			key: 'price',
			type: 'number',
			is_price: true,
			only_show: true,
		},
		{
			text: 'IVA',
			key: 'iva_id',
			type: 'select',
			only_show: true,
		},
	],
	singular_model_name_spanish: 'Localidad',
	plural_model_name_spanish: 'Localidades',
	create_model_name_spanish: 'Nueva localidad',
	text_delete: 'la',
}