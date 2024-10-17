export default {
	properties: [
		{
			text: 'Codigo',
			key: 'provider_code',
			type: 'text',
			show: true,
		},
		{
			text: 'Articulo',
			key: 'article_name',
			type: 'text',
			show: true,
		},
		{
			text: 'Cantidad',
			key: 'unidades_vendidas',
			type: 'number',
			show: true,
		},
		{
			text: 'Costo Total',
			key: 'cost',
			is_price: true,
			type: 'number',
			show: true,
		},
		{
			text: 'Precio Total',
			key: 'price',
			is_price: true,
			type: 'number',
			show: true,
		},
		{
			text: 'Beneficio Final',
			key: 'beneficio',
			is_price: true,
			type: 'number',
			show: true,
		},
	],
	singular_model_name_spanish: 'Venta de articulo',
	plural_model_name_spanish: 'Ventas de articulo',
	create_model_name_spanish: 'Nueva Venta de articulo',
	text_delete: 'la',
}