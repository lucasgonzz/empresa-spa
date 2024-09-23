export default {
	properties: [
		{
			text: 'Nombre',
			key: 'name',
			type: 'text',
			is_title: true,
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
			key: 'abierta',
			type: 'checkbox',
			only_show: true,
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
	],
	singular_model_name_spanish: 'Caja',
	plural_model_name_spanish: 'Cajas',
	create_model_name_spanish: 'Nueva Caja',
	text_delete: 'la',
}