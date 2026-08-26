export default {
	properties: [
		{
			text: 'Tipo de ruta',
			key: 'recipe_route_type_id',
			type: 'select',
			use_store_models: true,
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
			search_from_api: true,
			route_to_search: 'vender/buscar-articulo-por-nombre/1',
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
						// Filtra los estados por el grupo de la ruta que se esta editando (mision produccion-v2-multinivel).
						get_options_function: 'opciones_de_estados_del_grupo_de_la_ruta',
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
			store: 'address',
			select_prop_name: 'street',
			type: 'select',
			use_store_models: true,
			value: 0,
		},
		{
			text: 'Deposito para las unidades producidas',
			key: 'to_address_id',
			type: 'select',
			store: 'address',
			select_prop_name: 'street',
			use_store_models: true,
			value: 0,
		},
		{
			text: 'Grupo de estados',
			key: 'order_production_status_group_id',
			type: 'select',
			store: 'order_production_status_group',
			use_store_models: true,
			value: 0,
			descriptions: [
				'Limita los estados que se pueden elegir en los insumos de esta ruta y en los movimientos del lote.',
				'Va en la RUTA y no en la receta: una ruta tercerizada puede tener otro grupo de estados que la interna.',
			],
		},
		{
			text: 'Estado en el que la unidad queda terminada',
			key: 'end_order_production_status_id',
			type: 'select',
			store: 'order_production_status',
			use_store_models: true,
			value: 0,
			descriptions: [
				'Cuando un movimiento del lote llega a este estado, el producto entra a stock.',
				'Si lo dejas vacio, se usa el estado de mayor posicion del grupo; y si la ruta tampoco tiene grupo, el ultimo estado de toda la cuenta (que es como funcionaba hasta ahora).',
			],
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