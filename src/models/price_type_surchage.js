export default {
	properties: [
		{
			text: 'Nombre',
			key: 'name',
			type: 'text',
		},
		{
			text: 'Porcentaje',
			key: 'percentage',
			type: 'number',
		},
		{
			text: 'Monto',
			key: 'amount',
			type: 'number',
			is_price: true,
		},
		{
			text: 'Posicion',
			key: 'position',
			type: 'number',
		},
	],
	singular_model_name_spanish: 'Recargo',
	plural_model_name_spanish: 'Recargo',
	create_model_name_spanish: 'Nuevo Recargo',
	text_delete: 'el',
}