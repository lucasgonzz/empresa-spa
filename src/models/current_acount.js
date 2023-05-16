export default {
	properties: [
		{
			text: 'Fecha',
			key: 'created_at',
			is_date: true,
			value: '',
			show: true,
		},
		{
			text: 'Detalle',
			key: 'detalle',
			type: 'text',
			button: {
				variant: 'info',
				emit: 'showDetails',
			}
		},
		{
			text: 'Info Pagos',
			key: 'ver',
			type: 'text',
			button: {
				variant: 'info',
				emit: 'showPagadoPor',
				button_text: 'Ver Info',
			}
		},
		{
			text: 'Estado',
			key: 'status',
			type: 'text',
			function: 'currentAcountStatus',
		},
		{
			text: 'Debe',
			key: 'debe',
			type: 'integer',
			value: '',
			is_price: true,
			show: true,
		},
		{
			text: 'Haber',
			key: 'haber',
			type: 'integer',
			value: '',
			is_price: true,
			show: true,
		},
		{
			text: 'Saldo',
			key: 'saldo',
			type: 'integer',
			value: '',
			is_price: true,
			show: true,
		},
		{
			text: 'Descripcion',
			key: 'description',
			type: 'text',
			value: '',
			show: true,
		},
	],
	singular_model_name_spanish: 'Cuenta corriente',
	plural_model_name_spanish: 'Cuentas corrientes',
	create_model_name_spanish: 'Nueva cuenta corriente',
	text_delete: 'la',
}