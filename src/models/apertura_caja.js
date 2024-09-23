export default {
	properties: [
		{
			text: 'Fecha apertura',
			key: 'created_at',
			type: 'date',
			is_date: true,
			show_full_date: true,
		},
		{
			text: 'Fecha cierre',
			key: 'cerrada_at',
			type: 'date',
			is_date: true,
			show_full_date: true,
		},
		{
			text: 'Saldo apertura',
			key: 'saldo_apertura',
			type: 'number',
			is_price: true,
		},
		{
			text: 'Saldo cierre',
			key: 'saldo_cierre',
			type: 'number',
			is_price: true,
		},
	],
	singular_model_name_spanish: 'Apertura de caja',
	plural_model_name_spanish: 'Aperturas de caja',
	create_model_name_spanish: 'Nueva Apertura de caja',
	text_delete: 'la',
}