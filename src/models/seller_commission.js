export default {
	properties: [
		{
			text: 'N°',
			key: 'num',
			not_show_on_form: true,
			descriptions: [
				'Numero correlativo del movimiento en el ledger del vendedor.',
			],
		},
		{
			text: 'Desc',
			key: 'description',
			type: 'text',
			descriptions: [
				'Detalle del movimiento: la venta que genero la comision, o "Pago a vendedor" para los pagos.',
			],
		},
		{
			text: 'Venta',
			key: 'sale_id',
			v_if: ['sale_id', '!=', null],
			button: {
				variant: 'primary',
				function: 'showSellerCommissionSale',
			},
			function: 'btn_comision_venta',
			descriptions: [
				'Venta que genero esta comision. Vacio en las filas de pago al vendedor.',
			],
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
			descriptions: [
				'Porcentaje de comision aplicado sobre el total de la venta en el momento en que se genero.',
			],
		},
		{
			text: 'Debe',
			key: 'debe',
			type: 'text',
			is_price: true,
			descriptions: [
				'Comision que el vendedor gano por esta venta.',
			],
		},
		{
			text: 'Haber',
			key: 'haber',
			type: 'text',
			is_price: true,
			descriptions: [
				'Monto pagado al vendedor en este movimiento.',
			],
		},
		{
			text: 'Saldo',
			key: 'saldo',
			type: 'text',
			is_price: true,
			descriptions: [
				'Saldo corrido del ledger del vendedor despues de este movimiento (en la moneda de esta fila). Nulo en las comisiones pendientes.',
			],
		},
	],
	singular_model_name_spanish: 'Comision de vendedor',
	plural_model_name_spanish: 'Comisiones de vendedor',
	create_model_name_spanish: 'Nueva',
	text_delete: 'la',
}