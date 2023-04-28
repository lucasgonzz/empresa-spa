export default {
	properties: [
		{
			text: 'Cuotas',
			key: 'installments',
			type: 'number',
			value: '',
			show: true,
			is_title: true,
		},
		{
			text: 'Recargo',
			key: 'surchage',
			type: 'number',
			show: true,
			value: '',
		},
	],
	plural_model_name_spanish: 'Planes de pago',
	singular_model_name_spanish: 'Plan de pago',
	create_model_name_spanish: 'Nuevo plan de pago',
	text_delete: 'el',
}