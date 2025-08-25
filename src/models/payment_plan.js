export default {
	properties: [
		{
			text: '',
			key: 'cantidad_cuotas',
			type: 'text',
			is_title: true,
		},
		{
			text: 'Fecha inicio',
			key: 'start_date',
			type: 'date',
			is_date: true,
			description: 'Fecha para la primer cuota',
		},
		{
			text: 'Notas',
			key: 'notes',
			type: 'textarea',
		},
	],
	singular_model_name_spanish: 'Plan de pago',
	plural_model_name_spanish: 'Planes de pago',
	create_model_name_spanish: 'Nuevo Plan de pago',
	text_delete: 'el',
}