export default {
	properties: [
		{
			key: 'numero_cuota',
			type: 'number',
			only_show: true,
		},
		{
			key: 'fecha_vencimiento',
			type: 'date',
			is_date: true,
			only_show: true,
		},
		{
			text: 'monto',
			key: 'amount',
			type: 'number',
			is_price: true,
			only_show: true,
		},
		{
			text: 'pagado',
			key: 'amount_paid',
			type: 'number',
			is_price: true,
			only_show: true,
		},
		{
			text: 'Notas',
			key: 'observations',
			type: 'textarea',
			only_show: true,
		},
		{
			key: 'estado',
			type: 'text',
			only_show: true,
		},
		{
			text: 'Cliente',
			key: 'client_id',
			only_show: true,
		},
		{
			text: 'Venta',
			key: 'sale_id',
			only_show: true,
		},
	],
	singular_model_name_spanish: 'Cuota',
	plural_model_name_spanish: 'Cuotas',
	create_model_name_spanish: 'Nueva Cuota',
	text_delete: 'la',
}