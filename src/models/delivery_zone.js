export default {
	properties: [
		{
			text: 'Nombre',
			key: 'name',
			type: 'text',
			value: '',
			is_title: true,
			required: true,
		},
		{
			text: 'Descripcion',
			key: 'description',
			type: 'textarea',
			value: '',
			show: true,
			required: false,
		},
		{
			text: 'Precio',
			key: 'price',
			type: 'number',
			value: '',
			show: true,
		},
	],
	singular_model_name_spanish: 'Zona de envio',
	plural_model_name_spanish: 'Zonas de envio',
	create_model_name_spanish: 'Nueva zona de envio',
	text_delete: 'la',
}