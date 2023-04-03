export default {
	properties: [
		{
			text: 'N°',
			key: 'num',
			not_show_on_form: true,
		},
		{
			key: 'total',
			function: 'totalSale',
		},
		{
			text: 'Hora',
			key: 'created_at',
			is_hour: true,
			only_show: true,
		},
		{
			text: 'Met Pago',
			key: 'current_acount_payment_method_id',
			type: 'select',
			v_if: ['client_id', '=', null],
		},
		{
			text: 'Cliente',
			key: 'client_id',
			only_show: true,
			v_if: ['client_id', '!=', null],
			button: {
				function: 'showClientCurrentAcount',
			},
		},
		{
			text: 'Empleado',
			key: 'employee_id',
			only_show: true,
		},
		{
			text: 'Articulos',
			key: 'articles',
			store: 'article',
			belongs_to_many: {
				props_to_show: [
					{
						text: 'Nombree',
						key: 'name',	
						show: true,
					},
				],
				pivot_props_to_show: [
					{
						text: 'Cantidad',
						key: 'amount',
					},
					{
						text: 'U/D',
						key: 'returned_amount',
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
					},
				],
			}
		},
	],
	singular_model_name_spanish: 'Venta',
	plural_model_name_spanish: 'Ventas',
	create_model_name_spanish: 'Nueva',
	text_delete: 'la',
}