export default {
	properties: [ 
		{
			text: 'N°',
			key: 'num',
			type: 'text',
			not_show_on_form: true,
			filter_modal_position: 7,
			filter_type: 'number',
		},
		{
			text: 'Cliente',
			key: 'buyer_id',
			store: 'buyer',
			type: '',
			only_show: true,
			value: '',
			is_title: true,
		},
		{
			text: 'Total',
			key: 'total',
			only_show: true,
			is_price: true,
			show: true,
		},
		{
			text: 'Estado',
			key: 'order_status_id',
			type: '',
			only_show: true,
			value: '',
			not_show: true,
		},
		{
			text: 'Fecha entrega',
			key: 'fecha_entrega',
			type: '',
			only_show: true,
			is_date: true,
			value: '',
			if_has_extencion: 'ventas_con_fecha_de_entrega',
		},
		{
			text: 'Vendedor',
			key: 'seller_id',
			use_store_models: true,
			only_show: true,
		},
		{
			text: 'Para enviar',
			key: 'deliver',
			type: 'checkbox',
			only_show: true,
			not_show: true,
		},
		{
			text: 'Direccion de envio',
			key: 'address',
			type: 'text',
			only_show: true,
			not_show: true,
			v_if: ['deliver', '=', '1'],
		},
		// {
		// 	text: 'Zona de envio',
		// 	key: 'delivery_zone_id',
		// 	store: 'delivery_zone',
		// 	type: '',
		// 	only_show: true,
		// 	value: '',
		// 	v_if: ['deliver', '=', '1'],
		// 	not_show: true,
		// },
		// {
		// 	text: 'Direccion',
		// 	key: 'address',
		// 	function: 'getOrderAddress',
		// 	v_if: ['deliver', '=', '1'],
		// },
		// {
		// 	text: 'Metodo de pago',
		// 	key: 'payment_method_id',
		// 	button: {
		// 		variant: 'primary',
		// 		function: 'orderPaymentMethodDetails',
		// 	},
		// 	store: 'payment_method',
		// 	show: true,
		// 	not_show: true,
		// },
		// {
		// 	text: 'Descuento Met Pago',
		// 	key: 'payment_method_discount',
		// 	only_show: true,
		// 	not_show: true,
		// },
		// {
		// 	text: 'Recargo Met Pago',
		// 	key: 'payment_method_surchage',
		// 	type: '',
		// 	only_show: true,
		// 	value: '',
		// 	not_show: true,
		// },
		{
			text: 'Notas',
			key: 'description',
			type: '',
			only_show: true,
			value: '',
			show: true,
		},
		{
			text: 'Deposito',
			key: 'address_id',
			type: 'select',
			use_store_models: true,
			select_prop_name: 'street',
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
					{
						text: 'Variante',
						key: 'variant',
						type: 'text',
						show: true,
						if_has_extencion: 'article_variants',
					},
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
						text: 'Notas',
						key: 'notes',
						type: 'text',
						show: true,
					},
				],
				properties_to_set: [
					{
						text: 'Cantidad',
						key: 'amount',
						type: 'number',
						show: true,
					},
					// {
					// 	text: 'Deposito',
					// 	key: 'address_id',
					// 	value: 0,
					// 	v_if: {
					// 		b_t_many_model_prop: 'addresses',
					// 		check_array_length: true,
					// 		check_on_store_models: 'article',
					// 	},
					// 	type: 'select'
					// },
				]

			}
		},
		{
			text: 'Promociones',
			key: 'promocion_vinotecas',
			store: 'promocion_vinoteca',
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
						text: 'Notas',
						key: 'notes',
						type: 'text',
						show: true,
					},
				],
				properties_to_set: [
					{
						text: 'Cantidad',
						key: 'amount',
						type: 'number',
						show: true,
					},
				]

			}
		},
		{
			text: 'Cupon',
			key: 'cupon_id',
			store: 'cupon',
			type: '',
			only_show: true,
			value: '',
			show: true,
			relation_prop_name: 'code',
		},
	],
	singular_model_name_spanish: 'Pedido',
	plural_model_name_spanish: 'Pedidos',
	create_model_name_spanish: 'Nuevo pedido',
	text_delete: 'el',
}