export default {
	properties: [
		{
			text: 'Articulo',
			store: 'article',
			// combine_with: { 
			// 	store: 'article',
			// 	prop: 'inactive_models',
			// },
			key: 'article_id',
			type: 'search',
			is_title: true,
			show: true,
			value: '',
		},
		{
			text: 'Insumos',
			store: 'article',
			type: 'search',
			combine_with: { 
				store: 'article',
				prop: 'inactive_models',
			},
			key: 'articles',
			belongs_to_many: {
				model_name: 'article',
				props_to_show: [
					{
						text: 'Nombre',
						key: 'name',
						type: 'textarea',
						show: true,
						show_in_input_if: ['status', '=', 'inactive']
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
					{
						text: 'Precio',
						key: 'final_price',
						type: 'text',
						is_price: true,
						show: true,
						show_in_input_if: ['status', '=', 'inactive'],
					},
				],
				properties_to_set: [
					{
						text: 'Estado',
						key: 'order_production_status_id',
						value: 0,
						type: 'select', 
					},
					{
						text: 'Cantidad',
						key: 'amount',
						value: '',
						type: 'number'
					},
					{
						text: 'Notas',
						key: 'notes',
						value: '',
						type: 'textarea'
					},
				],
				if_null: {
					prop_to_set_with_query: 'name',
					props_to_set: [
						{
							key: 'status',
							value: 'inactive',
						},
					],
				},
			},
		},
		{
			text: 'Costo de produccion',
			function: 'getRecipeCost',
		},
		{
			text: 'Establecer costo del articulo en base a los costos de los insumos',
			key: 'article_cost_from_recipe',
			type: 'checkbox',
			value: 0,
		},
	],
	singular_model_name_spanish: 'Receta',
	plural_model_name_spanish: 'Recetas',
	create_model_name_spanish: 'Nueva receta',
	text_delete: 'la',
}