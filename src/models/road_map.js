export default {
	properties: [
		{
			text: 'N°',
			key: 'num',
			type: 'number',
			not_show_on_form: true,
			filter_modal_position: 1,
		},
		{
			text: 'Repartidor',
			key: 'employee_id',
			store: 'employee',
			type: 'select',
			use_store_models: true, 
			value: 0,
			required: true,
		},
		{
			text: 'Fecha de entrega',
			key: 'fecha_entrega',
			type: 'date',
			is_date: true,
			required: true,
		},
		{
			text: 'Terminada',
			key: 'terminada',
			type: 'checkbox',
			value: 0,
		},
		
		{
			text: 'Ventas',
			store: 'sale',
			type: 'search',
			key: 'sales',
			search_from_api: true,
			route_to_search: 'road-map/search-sales',
			belongs_to_many: {
				model_name: 'sale',
				props_to_show: [
					{
						text: '',
						key: 'table_left_options',
					},
					{
						text: 'Num',
						key: 'num',
					},
					{
						text: 'Total',
						key: 'total',
						is_price: true,
					},
					{
						text: 'Cliente',
						key: 'client_id',
						use_store_models: true,
					},
					{
						text: 'Fecha Entrega',
						key: 'fecha_entrega',
						is_date: true,
					},
					{
						text: 'Creada',
						key: 'created_at',
						is_date: true,
					},
				],
			}
		},
		{
			text: 'Clientes ordenados',
			key: 'road_map_client_positions',
			// search_from_api: true,
			// route_to_search: 'road-map/search-sales',
		},

		{
			text: 'Notas',
			key: 'notes',
			type: 'textarea',
		},
	],
	singular_model_name_spanish: 'Hoja de Ruta',
	plural_model_name_spanish: 'Hojas de Ruta',
	create_model_name_spanish: 'Nueva Hoja de Ruta',
	text_delete: 'la',
	full_reactivity: true,
}