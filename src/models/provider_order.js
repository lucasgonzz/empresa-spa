export default {
	properties: [
		{
			text: 'N°',
			key: 'num',
			type: 'number',
			not_show_on_form: true,
			filter_modal_position: 1,
		},
		{
			text: 'Proveedor',
			key: 'provider_id',
			store: 'provider',
			type: 'search',
			value: 0,
			is_title: true,
			required: true,
			filter_modal_position: 2,
		},
		{
			text: 'Actualizar precios',
			key: 'update_prices',
			type: 'checkbox',
			value: 0,
			not_show: true,
		},
		{
			text: 'Generar movimientos de Stock',
			key: 'update_stock',
			type: 'checkbox',
			value: 1,
			not_show: true,
		},
		{
			text: 'Generar movimiento en Cuenta Corriente',
			key: 'generate_current_acount',
			type: 'checkbox',
			value: 1,
			not_show: true,
			disabled_to_edit: true,
		},
		{
			text: 'Deposito',
			key: 'address_id',
			type: 'select',
			use_store_models: true,
			select_prop_name: 'street',
			show: true,
			value: 0,
			required: true,
			required_if_models_length: 'address',
			disabled_if_not_0: true,
		},
		{
			text: 'Moneda',
			key: 'moneda_id',
			type: 'select',
			value: 1,
			use_store_models: true,
			if_has_extencion: 'ventas_en_dolares',
		},
		{
			key: 'numero_comprobante',
			type: 'text',
			value: '',
			not_show: true,
		},
		{
			text: 'Articulos',
			store: 'article',
			search_on_models_by: 'name',
			type: 'search',
			key: 'articles',
			search_from_api_function: 'search_from_api_in_provider_order',
			route_to_search: 'vender/buscar-articulo-por-nombre',
			belongs_to_many: {
				model_name: 'article',
				create_if_not_exist: true,
				props_to_filter: [
					'bar_code',
					'provider_code',
					'name',
				],
				props_to_show: [
					{
						text: 'Imagen',
						key: 'images',
						type: 'images',
					},
					{
						text: 'Nombre',
						key: 'name',
						type: 'textarea',
						show: true,
						show_in_input_if: ['status', '=', 'inactive'],
						size: 'lg',
					},
					{
						text: 'Codigo barras',
						key: 'bar_code',
						type: 'text',
						show: true,
						show_in_input_if: ['status', '=', 'inactive']
					},
					{
						text: 'Codigo proveedor',
						key: 'provider_code',
						type: 'text',
						show: true,
						show_in_input_if: ['status', '=', 'inactive']
					},
				],
				properties_to_set: [
					{
						text: 'Cantidad',
						key: 'amount',
						value: '',
						type: 'number'
					},
					// {
					// 	text: 'Cantidad pedida',
					// 	key: 'amount_pedida',
					// 	value: '',
					// 	type: 'number'
					// },
					{
						text: 'Costo',
						key: 'cost',
						value: {
							key: 'cost',
						},
						type: 'number'
					},
					{
						text: 'Precio',
						key: 'price',
						value: {
							key: 'price',
						},
						type: 'number'
					},
					{
						text: 'Descuento',
						key: 'discount',
						type: 'number',
					},
					{
						text: 'Costo en dolares',
						key: 'cost_in_dollars',
						if_has_extencion: 'costo_en_dolares',
						// value: 0,
						value: {
							key: 'cost_in_dollars',
						},
						type: 'checkbox'
					},
					{
						text: 'Actualizar proveedor en el sistema',
						key: 'update_provider',
						value: 0,
						type: 'checkbox'
					},
					{
						text: 'Iva',
						key: 'iva_id',
						type: 'select',
						select_prop_name: 'percentage',
						value: {
							key: 'iva_id',
						},
						size: 'md',
					},
					{
						text: 'Notas',
						key: 'notes',
						value: '',
						type: 'textarea'
					},
					// {
					// 	text: 'Recibidas',
					// 	key: 'received',
					// 	value: 0,
					// 	type: 'number',
					// },
					// {
					// 	text: 'Ediar',
					// 	type: 'button',
					// 	button: {
					// 		variant: 'primary',
					// 	},
					// 	source: '@/mixins/edit_articles.js',
					// 	function: 'editArticle',
					// },
				],
				save_if_not_exist: {
					properties_to_send: [
						{
							key: 'status',
							value: 'inactive',
						}
					], 
					not_add_to_store_models: true,
				}
			}
		},
		{
			text: 'Facturas',
			key: 'provider_order_afip_tickets',
			has_many: {
				text: 'Factura',
				model_name: 'provider_order_afip_ticket',
			}
		},
		{
			text: 'Costos Extra',
			key: 'provider_order_extra_costs',
			has_many: {
				text: 'Cost Extra',
				model_name: 'provider_order_extra_cost',
			},
			not_show: true,
		},
		{
			text: 'Estado',
			key: 'provider_order_status_id',
			store: 'provider_order_status',
			type: 'select',
			value: 1,
			filter_modal_position: 3,
			not_show: true,
		},
		{
			key: 'days_to_advise',
			text: 'Avisarme si el pedido no fue RECIBIDO a partir de X dias desde que fue creado',
			type: 'number',
			placeholder: 'Ingrese los dias a partir de los cuales se le notificara',
			value: '',
			not_show: true,
		},
		{
			group_title: 'Total',
		},
		{
			key: 'total_with_iva',
			text: 'Total con IVA',
			type: 'checkbox',
			value: 1,
			description: 'Incluir el monto de IVA en el total del pedido',
			not_show: true,
		},
		{
			key: 'total_from_provider_order_afip_tickets',
			text: 'Total de las facturas',
			type: 'checkbox',
			description: 'Calcular el total del pedido en base a las Facturas del pedido',
			value: 0,
			not_show: true,
		},
		{
			text: 'Sub Total',
			key: 'sub_total',
			type: 'number',
			only_show: true,
			is_price: true,
			not_show: true,
		},
		{
			text: 'Total Descuentos',
			key: 'total_descuento',
			type: 'number',
			only_show: true,
			is_price: true,
			not_show: true,
		},
		{
			text: 'Total IVA',
			key: 'total_iva',
			type: 'number',
			only_show: true,
			is_price: true,
			not_show: true,
		},
		{
			text: 'Total',
			key: 'total',
			type: 'number',
			only_show: true,
			is_price: true,
			show: true,
		},
	],
	singular_model_name_spanish: 'Pedido',
	plural_model_name_spanish: 'Pedidos',
	create_model_name_spanish: 'Nuevo pedido',
	text_delete: 'el',
}