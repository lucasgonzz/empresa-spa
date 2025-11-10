export default {
	properties: [
		{
			text: 'Sucursal',
			key: 'address_id',
			type: 'select',
			relation_prop_name: 'street',
			use_store_models: true,
		},
		{
			text: 'Empleado',
			key: 'employee_id',
			type: 'select',
			use_store_models: true,
		},
		{
			text: 'Turno Caja',
			key: 'turno_caja_id',
			type: 'select',
			use_store_models: true,
		},
		{
			text: 'Fecha',
			key: 'fecha',
			type: 'date',
		},
		{
			key: 'total_ingresos',
			type: 'number',
			is_price: true,
			only_show: true,
		},
		{
			key: 'total_egresos',
			type: 'number',
			is_price: true,
			only_show: true,
		},
		{
			key: 'saldo_apertura',
			type: 'number',
			is_price: true,
			only_show: true,
		},
		{
			key: 'saldo_cierre',
			type: 'number',
			is_price: true,
			only_show: true,
		},
	],
	singular_model_name_spanish: 'Resumen de Caja',
	plural_model_name_spanish: 'Resumen de Caja',
	create_model_name_spanish: 'Nuevo Resumen de Caja',
	text_delete: 'el',
}