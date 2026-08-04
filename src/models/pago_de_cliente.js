export default {
	properties: [
		{
			text: 'N°',
			key: 'num_receipt',
			type: 'number',
			only_show: true,
		},
		{
			text: 'Cliente',
			key: 'client_id',
			// El catalogo de clientes no se descarga entero al iniciar sesion (grupo 332,
			// 4/8/2026): la tabla lee la relacion embebida en vez del store.
			search_from_api: true,
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
		{
			text: 'Metodos de Pago',
			key: 'current_acount_payment_methods',
			store: 'current_acount_payment_method',
			belongs_to_many: {
				model_name: 'current_acount_payment_method',
				props_to_show: [
					{
						text: 'Nombre',
						key: 'name',
					},
				],
				pivot_props_to_show: [
					{
						text: 'Monto',
						key: 'amount',
						is_price: true,
					}
				],
			},
			only_show: true, 
			type: 'search',
		},
		{
			text: 'Empleado',
			key: 'employee_id',
			function: 'get_employee',
			type: 'text',
			value: '',
			show: true,
		},
	],
	singular_model_name_spanish: 'Pago de Cliente',
	plural_model_name_spanish: 'Pagos de Clientes',
	create_model_name_spanish: 'Nuevo Pago de Cliente',
	text_delete: 'el',
}