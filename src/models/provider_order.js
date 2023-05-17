export default {
	properties: [
		{
			text: 'N°',
			key: 'num',
			not_show_on_form: true,
		},
		{
			text: 'Proveedor',
			key: 'provider_id',
			store: 'provider',
			type: 'search',
			value: 0,
			is_title: true,
		},
		{
			text: 'Articulos',
			store: 'article',
			type: 'search',
			key: 'articles',
			belongs_to_many: {
				model_name: 'article',
				create_if_not_exist: true,
				props_to_show: [
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
					{
						text: 'Costo',
						key: 'cost',
						value: {
							key: 'cost',
						},
						type: 'number'
					},
					{
						text: 'Costo Recibido',
						key: 'received_cost',
						value: '',
						type: 'number'
					},
					{
						text: 'Costo en dolares',
						key: 'cost_in_dollars',
						value: 0,
						type: 'checkbox'
					},
					{
						text: 'Actualizar costo en el sistema',
						key: 'update_cost',
						value: 1,
						type: 'checkbox'
					},
					{
						text: 'Iva',
						key: 'iva_id',
						value: 0,
						type: 'select',
						select_prop_name: 'percentage',
						size: 'md',
					},
					{
						text: 'Notas',
						key: 'notes',
						value: '',
						type: 'textarea'
					},
					{
						text: 'Recibidas',
						key: 'received',
						value: 0,
						type: 'number',
					},
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
			}
		},
		{
			text: 'Estado',
			key: 'provider_order_status_id',
			store: 'provider_order_status',
			type: 'select',
			value: 1,
			show: true,
		},
		{
			key: 'total_with_iva',
			text: 'Total con IVA',
			type: 'checkbox',
			value: 1,
			show: true,
		},
		{
			key: 'total_from_provider_order_afip_tickets',
			text: 'Total de las boletas',
			type: 'checkbox',
			value: 0,
			show: true,
		},
		{
			text: 'Total',
			key: 'total',
			function: 'providerOrderTotal',
			value: '',
			show: true,
		},
	],
	singular_model_name_spanish: 'Pedido',
	plural_model_name_spanish: 'Pedidos',
	create_model_name_spanish: 'Nuevo pedido',
	text_delete: 'el',
}