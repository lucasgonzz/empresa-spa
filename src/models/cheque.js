export default {
	properties: [
		{
			key: 'numero',
			type: 'text',
			is_title: true,
		},
		{
			text: 'Tipo',
			key: 'tipo',
			type: 'select',
			options: [
				'recibido',
				'emitido',
			],
		},
		{
			text: 'Cliente',
			key: 'client_id',
			type: 'search',
		},
		{
			text: 'Endozado desde cliente',
			key: 'endosado_desde_client_id',
			store: 'client',
			use_store_models: true,
		},
		{
			text: 'Proveedor',
			key: 'provider_id',
		},
		{
			text: 'Endozado al proveedor',
			key: 'endosado_a_provider_id',
			store: 'provider',
			use_store_models: true,
		},
		{
			key: 'banco',
			type: 'text',
		},
		{
			text: 'Monto',
			key: 'amount',
			type: 'number',
			is_price: true,
		},
		{
			key: 'fecha_emision',
			type: 'date',
			is_date: true,
		},
		{
			key: 'fecha_pago',
			type: 'date',
			is_date: true,
		},
		{
			key: 'fecha_endoso',
			type: 'date',
			is_date: true,
		},
		{
			text: 'Cobrado en',
			key: 'cobrado_en',
			type: 'date',
			v_if: ['estado_manual', '=', 'cobrado'],
			is_date: true,
		},
		{
			text: 'Cobrado por',
			key: 'cobrado_por_id',
			v_if: ['estado_manual', '=', 'cobrado'],
		},
		{
			text: 'Rechazado en',
			key: 'rechazo_en',
			v_if: ['estado_manual', '=', 'rechazado'],
			type: 'date',
			is_date: true,
		},
		{
			text: 'Rechazado por',
			key: 'rechazado_por_id',
			v_if: ['estado_manual', '=', 'rechazado'],
		},
	],
	singular_model_name_spanish: 'Cheque',
	plural_model_name_spanish: 'Cheques',
	create_model_name_spanish: 'Nuevo Cheque',
	text_delete: 'el',
}