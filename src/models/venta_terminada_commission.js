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
	singular_model_name_spanish: 'Comision por Venta Terminada',
	plural_model_name_spanish: 'Comisiones por Venta Terminada',
	create_model_name_spanish: 'Nueva Comision por Venta Terminada',
	text_delete: 'la',
}