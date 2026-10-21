export default {
	properties: [
		{
			key: 'numero_cuota',
			type: 'number',
			only_show: true,
		},
		{
			key: 'fecha_vencimiento',
			type: 'date',
			is_date: true,
			only_show: true,
		},
		// Moneda de la cuota: la de la venta del plan (mision planes-de-pago-saldo-y-dolares,
		// 21/10/2026). Solo se ve con la extension ventas_en_dolares, como la columna Moneda de Ventas.
		{
			text: 'Moneda',
			key: 'moneda_id',
			type: 'select',
			only_show: true,
			if_has_extencion: 'ventas_en_dolares',
			use_store_models: true,
		},
		{
			text: 'monto',
			key: 'amount',
			type: 'number',
			is_price: true,
			// "USD 250" en una cuota en dolares (mira el moneda_id de la cuota, ver _check_moneda()).
			check_simbolo_moneda: true,
			only_show: true,
		},
		{
			text: 'pagado',
			key: 'amount_paid',
			type: 'number',
			is_price: true,
			check_simbolo_moneda: true,
			only_show: true,
		},
		{
			text: 'Notas',
			key: 'observations',
			type: 'textarea',
			only_show: true,
		},
		{
			key: 'estado',
			type: 'text',
			// El filtro de la columna es un select y no un texto libre: `estado` es un enum de la base
			// (pendiente / pagado / cancelado). `type_to_update` es lo que lee
			// build_table_filters_from_props() (common-vue/mixins/generals.js) y set_fields() de la
			// tabla para decidir el tipo del filtro, asi que la celda se sigue dibujando como texto.
			type_to_update: 'select',
			options: ['pendiente', 'pagado', 'cancelado'],
			only_show: true,
		},
		{
			text: 'Cliente',
			key: 'client_id',
			// Sin `type` el filtro de esta columna no se dibujaba (filter/Index.vue solo muestra los
			// tipos que conoce) y la lupa abria un modal vacio. Mismo criterio que sale.js: la
			// busqueda va siempre contra la API (global-search/client).
			type: 'search',
			store: 'client',
			search_from_api: true,
			only_show: true,
		},
		// {
		// 	text: 'Venta',
		// 	key: 'sale_id',
		// 	only_show: true,
		// },
	],
	singular_model_name_spanish: 'Cuota',
	plural_model_name_spanish: 'Cuotas',
	create_model_name_spanish: 'Nueva Cuota',
	text_delete: 'la',
}