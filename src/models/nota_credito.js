export default {
	properties: [
		{
			text: 'N°',
			key: 'num_receipt',
			type: 'number',
			only_show: true,
		},
		{
			text: 'Venta',
			key: 'sale_id',
			type: 'text',
			only_show: true,
		},
		{
			text: 'Moneda',
			key: 'moneda_id',
			type: 'select',
			only_show: true,
			use_store_models: true,
			if_has_extencion: 'ventas_en_dolares',
		},
		{
			text: 'Cliente',
			key: 'client_id',
			use_store_models: true,
			// model_name: 'client'
			only_show: true,
			type: 'text',
		},
		{
			text: 'Total',
			key: 'haber',
			is_price: true,
			only_show: true,
			type: 'text',
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
				],
			},
		},
		{
			text: 'Descuentos',
			key: 'discounts',
			store: 'discount',
			type: 'search',
			only_show: true,
			belongs_to_many: {
				model_name: 'discount',
				pivot_props_to_show: [
					{
						text: 'Porcentaje',
						key: 'percentage',
					},
				],
			},
			no_usar_en_filtros: true,
			not_show: true,
		},
		{
			text: 'Recargos',
			key: 'surchages',
			store: 'surchage',
			type: 'search',
			only_show: true,
			belongs_to_many: {
				model_name: 'surchage',
				pivot_props_to_show: [
					{
						text: 'Porcentaje',
						key: 'percentage',
					},
				],
			},
			no_usar_en_filtros: true,
			not_show: true,
		},
	],
	singular_model_name_spanish: 'Nota de Credito',
	plural_model_name_spanish: 'Nota de Credito',
	create_model_name_spanish: 'Nueva Nota de Credito',
	text_delete: 'la',
}