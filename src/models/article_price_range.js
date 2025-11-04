export default {
	properties: [
		{
			text: 'Modo',
			key: 'modo',
			type: 'select',
			options: [
				'Igual',
				'Mayor o igual',
			],
		},
		{
			text: 'A partir de x Cantidad',
			key: 'amount',
			type: 'number',
		},
		{
			text: 'Precio',
			key: 'price',
			type: 'number',
		},
	],
	singular_model_name_spanish: 'Rango de precio',
	plural_model_name_spanish: 'Rangos de precio',
	create_model_name_spanish: 'Nuevo Rango de precio',
	text_delete: 'el',
}