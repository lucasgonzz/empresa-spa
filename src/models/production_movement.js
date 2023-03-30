export default {
	properties: [
		{
			text: 'N°',
			key: 'num',
			type: 'text',
			not_show_on_form: true,
		},
		{
			text: 'Empleado',
			key: 'employee_id',
			type: 'search',
		},
		{
			text: 'Articulo',
			key: 'article_id',
			type: 'search',
		},
		{
			text: 'Estado de Produccion',
			key: 'order_production_status_id',
			type: 'select',
		},
		{
			text: 'Cantidad',
			key: 'amount',
			type: 'number',
		},
	],
	singular_model_name_spanish: 'Movimiento de Produccion',
	plural_model_name_spanish: 'Movimientos de Produccion',
	create_model_name_spanish: 'Nuevo',
	text_delete: 'el',
}