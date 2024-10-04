export default {
	properties: [
		{
			text: 'Concepto Movimiento',
			key: 'concepto_movimiento_caja_id',
			type: 'select',
			use_store_models: true,
		},
		{
			key: 'hora',
			type: 'date',
			only_show: true,
			function: 'get_hora_from_created_at',
		},
		{
			key: 'ingreso',
			type: 'number',
			is_price: true,
		},
		{
			key: 'egreso',
			type: 'number',
			is_price: true,
		},
		{
			key: 'saldo',
			type: 'number',
			only_show: true,
			is_price: true,
		},
		{
			key: 'notas',
			type: 'textarea',
		},
	],
	singular_model_name_spanish: 'Movimiento de Caja',
	plural_model_name_spanish: 'Movimientos de Caja',
	create_model_name_spanish: 'Nuevo Movimiento de Caja',
	text_delete: 'el',
}