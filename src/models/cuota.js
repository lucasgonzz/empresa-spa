export default {
	properties: [
		{
			// text: 'Nombre',
			key: 'cantidad_cuotas',
			type: 'text',
			is_title: true,
		},
		{
			text: 'Descuento',
			key: 'descuento',
			type: 'number',
		},
		{
			text: 'Recargo',
			key: 'recargo',
			type: 'number',
		},
	],
	singular_model_name_spanish: 'Cuota',
	plural_model_name_spanish: 'Cuotas',
	create_model_name_spanish: 'Nueva Cuota',
	text_delete: 'la',
}