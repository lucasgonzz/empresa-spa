export default {
	properties: [
		{
			text: 'Nombre',
			key: 'name',
			type: 'text',
			is_title: true,
		},
		{
			key: 'saldo',
			type: 'number',
			is_price: true,
			only_show: true,
		},
		{
			text: 'Fecha apertura',
			key: 'abierta_at',
			type: 'date',
			is_date: true,
			only_show: true,
		},
		{
			text: 'Fecha cierre',
			key: 'cerrada_at',
			type: 'date',
			is_date: true,
			only_show: true,
		},
		{
			key: 'abierta',
			type: 'checkbox',
			only_show: true,
		},
		{
			text: 'Metodos de pago vinculados',
			store: 'current_acount_payment_method',
			search_on_models_by: 'name',
			type: 'search',
			key: 'current_acount_payment_methods',
			belongs_to_many: {
				model_name: 'current_acount_payment_method',
			}
		},
		{
			text: 'Empleados con acceso',
			store: 'employee',
			search_on_models_by: 'name',
			type: 'search',
			key: 'users',
			belongs_to_many: {
				model_name: 'users',
				props_to_show: [
					{
						text: 'Nombre',
						key: 'name',
					}
				],
			}
		},
	],
	singular_model_name_spanish: 'Caja',
	plural_model_name_spanish: 'Cajas',
	create_model_name_spanish: 'Nueva Caja',
	color_display_function: true,
	text_delete: 'la',
}