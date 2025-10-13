export default {
	properties: [
		{
			text: 'Estado',
			key: 'status',
			type: 'text',
			only_show: true,
		},
		{
			text: 'Detalle',
			key: 'error_message',
			type: 'textarea',
			only_show: true,
		},
		{
			text: 'Intentado',
			key: 'attempted_at',
			type: 'date',
			only_show: true,
			is_date: true,
		},
		{
			text: 'Sincronizado',
			key: 'synced_at',
			type: 'date',
			only_show: true,
			is_date: true,
		},
		{
			text: 'Pedidos',
			store: 'meli_order',
			only_show: true,
			search_on_models_by: 'name',
			type: 'search',
			key: 'meli_orders',
			belongs_to_many: {
				model_name: 'meli_order',
				props_to_show: [
					{
						text: 'Id Meli',
						key: 'meli_order_id',
						show: true,
					},
					{
						text: 'Id',
						key: 'id',
						show: true,
					},
					{
						text: 'Total',
						key: 'total',
						show: true,
						is_price: true,
					},
				],
				pivot_props_to_show: [
					{
						key: 'status',
						text: 'Estado',
					},
					{
						key: 'error_code',
						text: 'Detalle',
					},
				],
			}
		},
	],
	singular_model_name_spanish: 'Sincronizacion de pedidos',
	plural_model_name_spanish: 'Sincronizaciones de pedidos',
	create_model_name_spanish: 'Nueva Sincronizacion de pedidos',
	text_delete: 'la',
	color_display_function: true,
}