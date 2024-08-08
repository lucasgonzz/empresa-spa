export default {
	properties: [
		{
			key: 'detalle',
			type: 'text',
			is_title: true,
		},
		{
			text: 'Para realizar en',
			key: 'fecha_realizacion',
			type: 'date',
			is_date: true,
		},
		{
			text: 'Faltan',
			function: 'pending_tiempo_restantes',
		},
		{
			key: 'es_recurrente',
			type: 'checkbox',
		},
		{
			text: 'Frecuencia',
			key: 'unidad_frecuencia_id',
			type: 'select',
			use_store_models: true,
			not_show: true,
		},
		{
			key: 'cantidad_frecuencia',
			type: 'number',
			description: 'Cada cuanto sucede',
			not_show: true,
		},
		{
			text: 'Gasto asociado',
			key: 'expense_concept_id',
			type: 'select',
			use_store_models: true,
		},
		{
			key: 'notas',
			type: 'textarea',
		},
	],
	singular_model_name_spanish: 'Pendiente',
	plural_model_name_spanish: 'Pendientes',
	create_model_name_spanish: 'Nueva Pendiente',
	text_delete: 'el',
	color_display_function: true,
}