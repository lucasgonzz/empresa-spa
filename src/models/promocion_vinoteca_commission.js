export default {
	properties: [
		{
			text: 'Monto Fijo',
			key: 'monto_fijo',
			type: 'number',
			is_price: true,
		},
		{
			text: 'Vendedor',
			key: 'seller_id',
			type: 'select',
			use_store_models: true,
		},
	],
	singular_model_name_spanish: 'Comision por Promocion',
	plural_model_name_spanish: 'Comision por Promocion',
	create_model_name_spanish: 'Nueva Comision por Promocion',
	text_delete: 'la',
}