export default {
	properties: [
		{
			text: 'Id',
			key: 'id',
			type: 'text',
			only_show: true,
		},
		{
			text: 'Total',
			key: 'transaction_amount',
			type: 'text',
			is_price: true,
			only_show: true,
		},
		{
			text: 'Estado',
			key: 'status',
			type: 'text',
			only_show: true,
		},
		{
			text: 'Creado',
			key: 'date_created',
			type: 'text',
			is_date: true,
			only_show: true,
		},
		{
			text: 'Modificado',
			key: 'date_last_modified',
			type: 'text',
			is_date: true,
			only_show: true,
		},
	],
	singular_model_name_spanish: 'Pago de Mercado Libre',
	plural_model_name_spanish: 'Pagos de Mercado Libre',
	create_model_name_spanish: 'Nueva pago',
	text_delete: 'el',
}