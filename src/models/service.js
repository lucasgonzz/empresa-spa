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
			text: 'Precio',
			key: 'price',
			type: 'text',
			is_price: true,
			value: '',
		},
		{
			text: 'Cantidad',
			key: 'amount',
			type: 'number',
			value: '',
		},
		{
			text: 'U/D',
			key: 'returned_amount',
			type: 'number',
			value: '',
		},
	],
	singular_model_name_spanish: 'Servicio',
	plural_model_name_spanish: 'Servicios',
	create_model_name_spanish: 'Nuevo',
	text_delete: 'el',
}