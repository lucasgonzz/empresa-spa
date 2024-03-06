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
			search_function: 'articles_to_search_in_recipe',
		},
		{
			text: 'Insumos',
			store: 'article',
			type: 'search',
			search_on_models_by: 'name',
			combine_with: { 
				store: 'article',
				prop: 'inactive_models',
			},
			key: 'articles',
			belongs_to_many: {
				model_name: 'article',
				order_list_by: 'order_production_status', 
				props_to_show: [
					{
						text: 'N°',
						key: 'num',
						type: 'tex',
						show: true,
					},
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
					{
						text: 'Costo M. Obra',
						key: 'costo_mano_de_obra',
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
						text: 'Deposito',
						key: 'address_id',
						value: 0,
						v_if: {
							b_t_many_model_prop: 'addresses',
							check_array_length: true,
						},
						type: 'select'
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
			text: 'Deposito para las unidades producidas',
			key: 'address_id',
			type: 'select',
			v_if_function: 'articleRecipeHasAddresses',
			value: 0,
		},
		{
			text: 'Costo de produccion MATERIALES',
			function: 'get_recipe_cost_materiales',
		},
		{
			text: 'Costo de produccion MANO DE OBRA',
			function: 'get_recipe_cost_mano_de_obra',
		},
		{
			text: 'Costo de produccion NETO',
			function: 'get_recipe_cost_neto',
		},
		{
			text: 'Establecer costo del articulo en base a los costos de produccion NETO',
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