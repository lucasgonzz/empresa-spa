export default {
	properties: [
		{
			key: 'detalle',
			type: 'text',
			is_title: true,
		},
		{
			text: 'Realizado en',
			key: 'fecha_realizada',
			only_show: true,
			is_date: true,
		},
		{
			text: 'Gasto asociado',
			key: 'expense_concept_id',
			only_show: true,
			type: 'select',
			use_store_models: true,
		},
		{
			key: 'notas',
			type: 'textarea',
		},
	],
	singular_model_name_spanish: 'Pendiente Realizado',
	plural_model_name_spanish: 'Pendientes Realizado',
	create_model_name_spanish: 'Nueva Pendiente',
	text_delete: 'el',
}