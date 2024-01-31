export default {
	properties: [
		{
			text: 'Id',
			key: 'me_li_order_id',
			type: 'text',
			only_show: true,
		},
		{
			text: 'Estado',
			key: 'status',
			type: 'text',
			only_show: true,
		},
		{
			text: 'Detalle Estado',
			key: 'status_detail',
			type: 'text',
			only_show: true,
		},
		{
			text: 'Creado',
			key: 'date_created',
			type: 'date',
			only_show: true,
			is_date: true,
		},
		{
			text: 'Cerrado',
			key: 'date_closed',
			type: 'date',
			only_show: true,
			is_date: true,
		},
		{
			text: 'Articulos',
			key: 'articles',
			type: '',
			only_show: true,
			store: 'article',
			belongs_to_many: {
				model_name: 'article',
				props_to_show: [
					{
						text: 'N°',
						key: 'num',
					},
					{
						text: 'Imagen',
						key: 'images',
						type: 'images',
					},
					{
						text: 'MeLi id',
						key: 'me_li_id',
					},
					{
						text: 'Nombre',
						key: 'name',
					},
				],
				pivot_props_to_show: [
					{
						text: 'Cantidad',
						key: 'amount',
					},
					{
						text: 'Precio',
						key: 'price',
					},
				],
			}
		},
		{
			text: 'Total',
			key: 'total',
			type: 'number',
			only_show: true,
			is_price: true,
		},
		{
			text: 'Comprador',
			key: 'me_li_buyer_id',
			store: 'provider',
			type: 'text',
			only_show: true,
		},
		{
			text: 'Medios de pago',
			key: 'me_li_payments',
			type: 'text',
			has_many: {
				text: 'Medio de pago',
				model_name: 'me_li_payment',
			}
		},
	],
	singular_model_name_spanish: 'Pedido de Mercado Libre',
	plural_model_name_spanish: 'Pedidos de Mercado Libre',
	create_model_name_spanish: 'Nuevo Pedido de Mercado Libre',
	text_delete: 'el',
}
// {
    
//     "payments": [{
//    	 "id": "596707837",
//    	 "transaction_amount": 499,
//    	 "currency_id": "BRL",
//    	 "status": "approved",
//    	 "date_created": null,
//    	 "date_last_modified": null
//     }],
//     "feedback": {
//    	 "purchase": null,
//    	 "sale": null
//     },
//     "context": {
//      "channel": "marketplace",
//      "site": "MLB",
//      "flows": [
//      000]
//   },
//     "shipping": {
//    	 "id": 20676482441
//     },
//     "tags": [
//    	 "paid",
//    	 "not_delivered"
//     ]
// }