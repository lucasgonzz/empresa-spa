export default {
	properties: [
		{
			text: 'Metodo de Pago',
			key: 'payment_method',
			type: 'text',
		},
		{
			text: 'Total',
			key: 'total',
			type: 'text',
			is_price: true,
		},
	],
	singular_model_name_spanish: 'Reporte',
	plural_model_name_spanish: 'Reportes',
	create_model_name_spanish: 'Nuevo',
	text_delete: 'el',
}