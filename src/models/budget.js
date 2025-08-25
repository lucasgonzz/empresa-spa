export default {
	properties: [
		{
			text: 'N°',
			key: 'num',
			type: 'text',
			not_show_on_form: true,
		},
		{
			key: 'actualizar_en_vender',
			text: 'Actualizar desde VENDER',
		},
		{
			text: 'Cliente',
			key: 'client_id',
			store: 'client',
			type: 'search',
			value: 0,
			is_title: true,
			show_btn_create: true,
			use_to_filter_in_modal: true,
			only_show: true,
		},
		{
			text: 'Direccion',
			key: 'address_id',
			relation_prop_name: 'street',
			type: 'select',
			only_show: true,
			use_store_models: true,
		},
		{
			text: 'Total',
			key: 'total',
			only_show: true,
			is_price: true,
			show: true,
		},
		{
			text: 'Observaciones',
			key: 'observations',
			type: 'textarea',
			value: '',
			show: true,
		},
		{
			text: 'Estado del presupuesto',
			key: 'budget_status_id',
			type: 'select',
			value: 1,
			show: true,
			filterable: true,
			use_to_filter_in_modal: true,
		},
		{
			text: 'Empleado',
			key: 'employee_id',
			use_store_models: true,
			type: 'search',
			only_show: true,
		},
		{
			text: 'Articulos',
			store: 'article',
			key: 'articles',
			type: 'search',
			only_show: true,
			belongs_to_many: {
				model_name: 'article',
				create_if_not_exist: true,
				props_to_show: [
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
				pivot_props_to_show: [
					{
						text: 'Precio',
						key: 'price',
						// value: {key: 'final_price', value_if_undefined: ''},
						type: 'number',
						is_price: true,
						// set_with_function: 'setBudgetArticlePrice',
					},
					{
						text: 'Cantidad',
						key: 'amount',
						value: '',
						type: 'number'
					},
					{
						text: 'Desc',
						key: 'bonus',
						value: '',
						type: 'number'
					},
					// {
					// 	text: 'Ubicacion',
					// 	key: 'location',
					// 	value: '',
					// 	type: 'textarea'
					// },
					{
						text: 'Total',
						key: 'total_item',
						function: 'totalBudgetItem',
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
			text: 'Servicios',
			store: 'service',
			key: 'services',
			type: 'search',
			only_show: true,
			belongs_to_many: {
				model_name: 'service',
				props_to_show: [
					{
						text: 'Nombre',
						key: 'name',
						type: 'textarea',
						show: true,
					},
				],
				pivot_props_to_show: [
					{
						text: 'Precio',
						key: 'price',
						type: 'number',
						is_price: true,
					},
					{
						text: 'Cantidad',
						key: 'amount',
						value: '',
						type: 'number'
					},
					{
						text: 'Total',
						key: 'total_item',
						function: 'totalBudgetItem',
					},
				],
			}
		},
		{
			text: 'Promociones',
			store: 'promocion_vinoteca',
			key: 'promocion_vinotecas',
			type: 'search',
			only_show: true,
			belongs_to_many: {
				model_name: 'promocion_vinoteca',
				props_to_show: [
					{
						text: 'Nombre',
						key: 'name',
						type: 'textarea',
						show: true,
					},
				],
				pivot_props_to_show: [
					{
						text: 'Precio',
						key: 'price',
						type: 'number',
						is_price: true,
					},
					{
						text: 'Cantidad',
						key: 'amount',
						value: '',
						type: 'number'
					},
					{
						text: 'Total',
						key: 'total_item',
						function: 'totalBudgetItem',
					},
				],
			}
		},
		{
			text: 'Descuentos',
			key: 'discounts',
			type: 'search',
			store: 'discount',
			only_show: true,
			not_show: true,
			belongs_to_many: {
				model_name: 'discount',
				props_to_show: [
					{
						text: 'Nombre',
						key: 'name',
					},
					{
						text: 'Porcentaje',
						key: 'percentage',
					},
				],
			}
		},
		{
			text: 'Recargos',
			key: 'surchages',
			store: 'surchage',
			type: 'search',
			not_show: true,
			only_show: true,
			belongs_to_many: {
				model_name: 'surchage',
				props_to_show: [
					{
						text: 'Nombre',
						key: 'name',
					},
					{
						text: 'Porcentaje',
						key: 'percentage',
					},
				],
			}
		},
	],
	singular_model_name_spanish: 'Presupuesto',
	plural_model_name_spanish: 'Presupuestos',
	create_model_name_spanish: 'Nuevo presupuesto',
	text_delete: 'el',
}