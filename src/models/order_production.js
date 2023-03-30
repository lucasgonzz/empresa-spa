export default {
	properties: [
		{
			text: 'N°',
			key: 'num',
			type: 'text',
			not_show_on_form: true,
		},
		{
			text: 'Cliente',
			key: 'client_id',
			store: 'client',
			type: 'search',
			is_title: true,
		},
		{
			text: 'Fecha de inicio',
			key: 'start_at',
			type: 'date',
			is_date: true,
			value: '',
		},
		{
			text: 'Fecha de finalizacion',
			key: 'finish_at',
			type: 'date',
			is_date: true,
			value: '',
		},
		{
			text: 'Estado',
			key: 'order_production_status_id',
			store: 'order_production_status',
			type: 'select',
		},
		{
			text: 'Articulos',
			store: 'article',
			type: 'search',
			key: 'articles',
			belongs_to_many: {
				model_name: 'article',
				create_if_not_exist: true,
				props_to_show: [
					// {
					// 	text: 'Activar',
					// 	type: 'button',
					// 	show: true,
					// 	show_if: ['status', '=', 'inactive']
					// },
					{
						text: 'Nombre',
						key: 'name',
						type: 'textarea',
						show: true,
						show_in_input_if: ['status', '=', 'inactive'],
						size: 'lg',
					},
					{
						text: 'Codigo barras',
						key: 'bar_code',
						type: 'text',
						show: true,
						show_in_input_if: ['status', '=', 'inactive']
					},
					{
						text: 'Codigo proveedor',
						key: 'provider_code',
						type: 'text',
						show: true,
						show_in_input_if: ['status', '=', 'inactive']
					},
				],
				properties_to_set: [
					{
						text: 'Precio',
						key: 'price', 
						value: {key: 'final_price', value_if_undefined: ''},
						type: 'number',
						can: 'order_production.article.price',
					},
					{
						text: 'Cantidad',
						key: 'amount',
						value: '',
						type: 'number',
						size: 'sm',
					},
					{
						text: 'Bonif',
						key: 'bonus',
						value: '',
						type: 'number',
						can: 'order_production.article.price',
						size: 'sm',
					},
					{
						text: 'Ubicacion',
						key: 'location',
						value: '',
						type: 'textarea',
						size: 'lg',
					},
					{
						text: 'Empleado',
						key: 'employee_id',
						value: 0,
						type: 'select',
						size: 'md',
					},
					// {
					// 	from_store: true,
					// 	store: 'order_production_status',
					// 	type: 'number',
					// 	size: 'sm',
					// },
					{
						text: 'U Entrgadas',
						key: 'delivered',
						value: '',
						type: 'number'
					},
				],
				save_if_not_exist: {
					properties_to_send: [
						{
							key: 'status',
							value: 'inactive',
						}
					], 
					not_add_to_store_models: true,
				}
			}
		},
		{
			text: 'Observaciones',
			key: 'observations',
			type: 'textarea',
			value: '',
		},
		{
			text: 'Finalizada',
			key: 'finished',
			type: 'checkbox',
			is_boolean: true,
			value: 0,
		},
		{
			text: 'Total',
			key: 'total',
			function: 'budgetTotal',
			value: '',
		},
	],
	singular_model_name_spanish: 'Orden de produccion',
	plural_model_name_spanish: 'Ordenes de produccion',
	create_model_name_spanish: 'Nueva orden de produccion',
	text_delete: 'la',
}