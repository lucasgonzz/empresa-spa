export default {
	properties: [
		{
			text: 'Fecha de emision',
			key: 'issued_at',
			type: 'date',
			value: '',
			show: true,
			is_date: true,
		},
		{
			text: 'Numero',
			key: 'code',
			type: 'text',
			value: '',
			show: true,
			is_title: true,
		},
		{
			text: 'Total',
			key: 'total',
			type: 'number',
			value: '',
			show: true,
		},
	],
	plural_model_name_spanish: 'Facturas',
	singular_model_name_spanish: 'Factura',
	create_model_name_spanish: 'Nueva factura',
	text_delete: 'esta',
}