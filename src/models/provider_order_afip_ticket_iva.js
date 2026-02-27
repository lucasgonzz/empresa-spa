export default {
	properties: [
		{
			text: 'Iva',
			key: 'iva_id',
			type: 'select',
			show: true,
			use_store_models: true,
		},
		{
			text: 'Neto',
			key: 'neto',
			type: 'number',
			is_price: true,
			value: '',
			show: true,
		},
		{
			text: 'Importe Iva',
			key: 'iva_importe',
			type: 'number',
			is_price: true,
			value: '',
			show: true,
		},
	],
	plural_model_name_spanish: 'Ivas factura',
	singular_model_name_spanish: 'Iva factura',
	create_model_name_spanish: 'Nuevo Iva factura',
	text_delete: 'este',
}