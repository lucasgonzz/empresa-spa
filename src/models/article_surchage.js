export default {
	properties: [
		{
			text: 'Porcentaje',
			key: 'percentage',
			type: 'number',
			is_title: true,
		},
		{
			text: 'Monto',
			key: 'amount',
			type: 'number',
			is_price: true,
		},
		{
			text: 'Aplicar al final',
			key: 'luego_del_precio_final',
			type: 'checkbox',
		},
	],
	singular_model_name_spanish: 'Recargo',
	plural_model_name_spanish: 'Recargos',
	create_model_name_spanish: 'Nuevo',
	text_delete: 'el',
}