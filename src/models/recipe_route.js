export default {
	properties: [
		{
			text: 'Tipo de ruta',
			key: 'recipe_route_type_id',
			type: 'select',
		},
		{
			text: 'Notas',
			key: 'notes',
			type: 'textarea',
			value: '',
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
					},
					{
						text: 'Codigo barras',
						key: 'bar_code',
						type: 'text',
						show: true,
					},
					{
						text: 'Codigo proveedor',
						key: 'provider_code',
						type: 'text',
						show: true,
					},
					{
						text: 'Precio',
						key: 'final_price',
						type: 'text',
						is_price: true,
						show: true,
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
			},
		},
		{
			text: 'Deposito insumos',
			key: 'from_address_id',
			type: 'select',
			value: 0,
		},
		{
			text: 'Deposito para las unidades producidas',
			key: 'to_address_id',
			type: 'select',
			value: 0,
		},
		// {
		// 	text: 'Costo de produccion MATERIALES',
		// 	function: 'get_recipe_cost_materiales',
		// },
		// {
		// 	text: 'Costo de produccion MANO DE OBRA',
		// 	function: 'get_recipe_cost_mano_de_obra',
		// },
		// {
		// 	text: 'Costo de produccion NETO',
		// 	function: 'get_recipe_cost_neto',
		// },
		// {
		// 	text: 'Establecer costo del articulo en base a los costos de produccion NETO',
		// 	key: 'article_cost_from_recipe',
		// 	type: 'checkbox',
		// 	value: 0,
		// },
	],
	singular_model_name_spanish: 'Ruta de Receta',
	plural_model_name_spanish: 'Rutas de Receta',
	create_model_name_spanish: 'Nueva Ruta de receta',
	text_delete: 'la',
	full_reactivity: true,
}