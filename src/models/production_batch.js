export default {
	properties: [
		{
			text: 'Articulo',
			key: 'recipe_id',
			type: 'search',
			search_from_api: true,
			route_to_search: 'recipe/search-article',
			disabled_to_edit: true,
		},
		{
			text: 'Ruta',
			key: 'recipe_route_id',
			type: 'select',
			use_store_models: true,
			disabled_to_edit: true,
		},
		{
			text: 'Produccion planeada',
			key: 'planned_amount',
			type: 'number',
			disabled_to_edit: true,
		},
		{
			text: 'Estado',
			key: 'production_batch_status_id',
			type: 'select',
			use_store_models: true,
		},
		{
			text: 'Notas',
			key: 'notes',
			type: 'textarea',
		},
		{
			text: 'Movimientos de produccion',
			key: 'production_batch_movements',
			has_many: {
				text: 'Movimiento de produccion',
				model_name: 'production_batch_movement',
				props_to_send_on_save_function: 'add_production_batch_id'
			},
			full_cols: true,
		},
		{
			text: 'Cantidades en cada Estado',
			key: 'amounts_by_status',
			not_show: true,
			mid_full_cols: true,
		},
		{
			text: 'Cantidades en cada Proveedor',
			key: 'amounts_by_provider',
			not_show: true,
			mid_full_cols: true,
		},
	],
	singular_model_name_spanish: 'Lote de produccion',
	plural_model_name_spanish: 'Lotes de produccion',
	create_model_name_spanish: 'Nuevo Lote de produccion',
	text_delete: 'el',
}