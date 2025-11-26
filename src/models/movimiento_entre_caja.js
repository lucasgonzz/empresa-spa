export default {
	properties: [
		{
			text: 'Caja ORIGEN',
			key: 'from_caja_id',
			// Agrego el nombre del empleado a la caja para que no se confundan
			get_options_function: 'get_cajas_abiertas_options',
			type: 'select',
			store: 'caja',
			use_store_models: true,

		},
		{
			text: 'Caja DESTINO',
			key: 'to_caja_id',
			get_options_function: 'get_cajas_abiertas_options',
			type: 'select',
			store: 'caja',
			use_store_models: true,

		},
		{
			text: 'Monto',
			key: 'amount',
			type: 'number',
			is_price: true,
		},
	],
	singular_model_name_spanish: 'Movimiento entre cajas',
	plural_model_name_spanish: 'Movimientos entre cajas',
	create_model_name_spanish: 'Nuevo Movimiento entre cajas',
	text_delete: 'El',
}