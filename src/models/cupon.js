export default {
	properties: [
		{
			text: 'Codigo',
			key: 'code',
			type: 'text',
			value: '',
			is_title: true,
		},
		{
			text: 'Cantidad en pesos',
			key: 'amount',
			type: 'number',
			value: '',
			show: true,
		},
		{
			text: 'Porcentaje de descuento',
			key: 'percentage',
			type: 'number',
			value: '',
			show: true,
		},
		{
			text: 'Compra minima',
			key: 'min_amount',
			type: 'number',
			value: '',
			show: true,
		},
	],
	singular_model_name_spanish: 'Cupon',
	plural_model_name_spanish: 'Cupones',
	create_model_name_spanish: 'Nueva cupon',
	text_delete: 'el',
}