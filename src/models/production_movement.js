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
			required: true,
			search_function: 'articles_to_search_in_recipe',
			search_function_for_model_form: 'articles_to_search_in_recipe',
		},
		{
			text: 'Estado de Produccion',
			key: 'order_production_status_id',
			type: 'select',
		},
		// {
		// 	text: 'Deposito',
		// 	key: 'address_id',
		// 	type: 'select',
		// 	description: 'Si se selecciona, se descontara el stock del deposito correspondiente, siempre y cuando los articulos tengan indicado stock en la direccion, de lo contrario, se descontara del stock global del articulo',
		// },
		{
			text: 'Cantidad',
			key: 'amount',
			type: 'number',
		},
		{
			text: 'Notas',
			key: 'notes',
			type: 'textarea',
		},
		{
			text: 'Costo de produccion MATERIALES',
			function: 'getProductionMovementCostMateriales',
		},
		{
			text: 'Costo de produccion MANO DE OBRA',
			function: 'getProductionMovementCostManoDeObra',
		},
		{
			text: 'Costo de produccion NETO',
			function: 'getProductionMovementCostNeto',
		},
	],
	singular_model_name_spanish: 'Movimiento de Produccion',
	plural_model_name_spanish: 'Movimientos de Produccion',
	create_model_name_spanish: 'Nuevo',
	text_delete: 'el',
	form_disabled_to_edit: true,
}