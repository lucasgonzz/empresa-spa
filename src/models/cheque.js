export default {
	properties: [
		{
			key: 'numero',
			type: 'text',
			is_title: true,
		},
		{
			text: 'Cliente',
			key: 'client_id',
		},
		{
			key: 'banco',
			type: 'text',
		},
		{
			text: 'Monto',
			key: 'amount',
			type: 'text',
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