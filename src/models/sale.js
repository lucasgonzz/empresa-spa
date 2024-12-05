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
			text: 'Total',
			key: 'total',
			type: 'number',
			only_show: true,
			function: 'totalSale',
		},
		{
			text: 'Total Facturado',
			type: 'number',
			key: 'total_facturado',
			function: 'total_facturado',
			only_show: true,
			v_if: ['afip_ticket', '!=', null],
		},
		{
			text: 'Hora',
			key: 'hora',
			function: 'get_hora',
			// is_hour: true,
			only_show: true,
			no_usar_en_filtros: true,
		},
		{
			text: 'Met Pago',
			function: 'get_sale_payment_methods',
		},
		{
			text: 'Cliente',
			key: 'client_id',
			type: 'search',
			store: 'client',
			only_show: true,
			v_if: ['client_id', '!=', null],
			button: {
				function: 'showClientCurrentAcount',
			},
			filter_modal_position: 2,
		},
		{
			text: 'Empleado',
			key: 'employee_id',
			type: 'search',
			only_show: true,
		},
		{
			text: 'Vendedor',
			key: 'seller_id',
			use_store_models: true,
			only_show: true,
			not_show: true,
		},
		{
			text: 'Cuotas',
			key: 'cantidad_cuotas',
			type: 'number',
			only_show: true,
			not_show: true,
		},
		{
			text: 'Lista de Precios',
			key: 'price_type_id',
			use_store_models: true,
			not_show: true,
			only_show: true,
		},
		{
			text: 'Caja destino',
			key: 'caja_id',
			use_store_models: true,
			not_show: true,
			only_show: true,
			if_has_extencion: 'cajas',
		},
		{
			text: 'Descuento',
			key: 'descuento',
			not_show: true,
			only_show: true,
		},
		{
			text: 'Articulos',
			key: 'articles',
			store: 'article',
			belongs_to_many: {
				props_to_show: [
					{
						text: 'Cod barras',
						key: 'bar_code',	
						show: true,
					},
					{
						text: 'Cod Prov',
						key: 'provider_code',	
						show: true,
					},
					{
						text: 'Nombre',
						key: 'name',	
						show: true,
					},
				],
				pivot_props_to_show: [
					{
						text: 'Variante',
						key: 'variant_description',
					},
					{
						text: 'Cantidad',
						key: 'amount',
					},
					{
						text: 'Descuento',
						key: 'discount',
					},
					{
						text: 'Precio',
						key: 'price',
						is_price: true,
					},
					{
						text: 'Total',
						function: 'getTotalItem',
						is_price: true,
					},
					{
						text: 'U/D',
						key: 'returned_amount',
					},
					{
						text: 'U/E',
						key: 'delivered_amount',
					},
				],
			},
			no_usar_en_filtros: true,
		},
		{
			text: 'Metodos de Pago',
			key: 'current_acount_payment_methods',
			store: 'current_acount_payment_method',
			type: 'search',
			only_show: true,
			belongs_to_many: {
				model_name: 'current_acount_payment_method',
				pivot_props_to_show: [
					{
						text: 'Monto',
						key: 'amount',
						is_price: true,
					},
					{
						text: 'Descuento',
						key: 'discount_amount',
						is_price: true,
					},
				],
			},
			no_usar_en_filtros: true,
			not_show: true,
		},
		{
			text: 'Servicios',
			key: 'services',
			store: 'service',
			belongs_to_many: {
				model_name: 'service',
				props_to_show: [
					{
						text: 'Nombre',
						key: 'name',
					},
				],
				pivot_props_to_show: [
					{
						text: 'Precio',
						key: 'price',
						is_price: true,
					},
					{
						text: 'Cantidad',
						key: 'amount',
					},
					{
						text: 'U/D',
						key: 'returned_amount',
					},
				]
			},
			no_usar_en_filtros: true,
			// type: 'has_many',
			// has_many: {
			// 	text: 'Servicio',
			// 	model_name: 'service',
			// 	show_btn_create: false,
			// }
		},
	],
	singular_model_name_spanish: 'Venta',
	plural_model_name_spanish: 'Ventas',
	create_model_name_spanish: 'Nueva',
	color_display_function: true,
	text_delete: 'la',
}