export default {
	properties: [
		{
			text: 'N°',
			key: 'num_receipt',
			type: 'number',
			only_show: true,
		},
		{
			text: 'Venta',
			key: 'sale_id',
			type: 'text',
			only_show: true,
		},
		{
			text: 'Cliente',
			key: 'client_id',
			use_store_models: true,
			// model_name: 'client'
			only_show: true,
			type: 'text',
		},
		{
			text: 'Total',
			key: 'haber',
			is_price: true,
			only_show: true,
			type: 'text',
		},
	],
	singular_model_name_spanish: 'Nota de Credito',
	plural_model_name_spanish: 'Nota de Credito',
	create_model_name_spanish: 'Nueva Nota de Credito',
	text_delete: 'la',
}