export default {
	properties: [
		{
			text: 'N°',
			key: 'num',
			not_show_on_form: true,
		},
		{
			text: 'Desc',
			key: 'description',
			type: 'text',
		},
		{
			text: 'Venta',
			key: 'sale_id',
			v_if: ['sale_id', '!=', null],
			button: {
				variant: 'primary',
				function: 'showSellerCommissionSale',
			},
			function: 'btn_comision_venta'
		},
		// {
		// 	text: 'Vendedor',
		// 	key: 'seller_id',
		// 	type: 'text',
		// 	use_store_models: true,
		// },
		{
			text: '%',
			key: 'percentage',
			type: 'text',
		},
		{
			text: 'Debe',
			key: 'debe',
			type: 'text',
			is_price: true,
		},
		{
			text: 'Haber',
			key: 'haber',
			type: 'text',
			is_price: true,
		},
		{
			text: 'Saldo',
			key: 'saldo',
			type: 'text',
			is_price: true,
		},
	],
	singular_model_name_spanish: 'Comision de vendedor',
	plural_model_name_spanish: 'Comisiones de vendedor',
	create_model_name_spanish: 'Nueva',
	text_delete: 'la',
}