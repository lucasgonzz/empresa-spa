export default {
	properties: [ 
		{
			text: 'N°',
			key: 'id',
			type: 'text',
			not_show_on_form: true,
			filter_modal_position: 7,
			filter_type: 'number',
		},
		// {
		// 	text: 'Cliente',
		// 	key: 'buyer_id',
		// 	store: 'buyer',
		// 	type: '',
		// 	only_show: true,
		// 	value: '',
		// 	is_title: true,
		// },
		{
			text: 'Total',
			key: 'total',
			only_show: true,
			is_price: true,
			show: true,
		},
		{
			text: 'Estado',
			key: 'tienda_nube_order_status_id',
			only_show: true,
			use_store_models: true,
			show: true,
		},
		{
			text: 'Estado del pago',
			key: 'payment_status',
			only_show: true,
			show: true,
		},
		{
			text: 'Notas',
			key: 'notes',
			type: 'textarea',
			value: '',
			show: true,
		},
		{
			text: 'Articulos',
			key: 'articles',
			store: 'article',
			belongs_to_many: {
				can_not_modify: true,
				props_to_show: [
					{
						text: 'Imagen',
						key: 'images',
						type: 'images',
						show: true,
					},
					{
						text: 'Nombre',
						key: 'name',
						type: 'textarea',
						show: true,
					},
					{
						text: 'Codigo barras',
						key: 'bar_code',
						type: 'text',
						show: true,
					},
					{
						text: 'Codigo proveedor',
						key: 'provider_code',
						type: 'text',
						show: true,
					},
					// {
					// 	text: 'Variante',
					// 	key: 'variant',
					// 	type: 'text',
					// 	show: true,
					// 	if_has_extencion: 'article_variants',
					// },
				],
				pivot_props_to_show: [
					{
						text: 'Precio',
						key: 'price',
						type: 'number',
						is_price: true,
						show: true,
					},
					{
						text: 'Cantidad',
						key: 'amount',
						type: 'number',
						show: true,
					},
				],
				// properties_to_set: [
				// 	{
				// 		text: 'Cantidad',
				// 		key: 'amount',
				// 		type: 'number',
				// 		show: true,
				// 	},
				// ]
			}
		},
	],
	singular_model_name_spanish: 'Pedido',
	plural_model_name_spanish: 'Pedidos',
	create_model_name_spanish: 'Nuevo pedido',
	text_delete: 'el',
}