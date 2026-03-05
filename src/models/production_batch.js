export default {
	properties: [
		{
			text: 'Articulo',
			key: 'recipe_id',
			type: 'search',
		},
		{
			text: 'Ruta',
			key: 'recipe_route_id',
			type: 'search',
		},
		{
			text: 'Produccion planeada',
			key: 'planned_amount',
			type: 'number',
		},
		{
			text: 'Notas',
			key: 'notes',
			type: 'text',
		},
		{
			text: 'Movimientos de produccion',
			key: 'production_batch_movements',
			has_many: {
				text: 'Movimiento de produccion',
				model_name: 'production_batch_movement'
			},
			full_cols: true,
		},
	],
	singular_model_name_spanish: 'Lote de produccion',
	plural_model_name_spanish: 'Lotes de produccion',
	create_model_name_spanish: 'Nuevo Lote de produccion',
	text_delete: 'el',
}