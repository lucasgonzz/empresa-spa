export default {
	properties: [
		{
			text: 'Nombre',
			key: 'name',
			type: 'text',
		},
		{
			text: 'Costo',
			key: 'cost',
			type: 'number',
		},
		{
			text: 'Precio',
			key: 'price',
			type: 'number',
		},
		{
			text: 'Articulos',
			store: 'article',
			search_on_models_by: 'name',
			type: 'search',
			key: 'articles',
			search_from_api_function: 'search_from_api_in_provider_order',
			belongs_to_many: {
				model_name: 'article',
				props_to_show: [
					{
						text: 'Nombre',
						key: 'name',
						type: 'text',
						show: true,
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
				],
			}
		},
	],
	abm_descripcion: {
		para_que_sirve: 'Arma paquetes de varios artículos que se venden juntos con un precio propio.',
		implicancias: 'Al vender un combo se descuenta el stock de cada artículo que lo compone. El precio del combo es independiente de la suma de los precios individuales, así que podés ofrecerlo como promoción.',
		como_se_utiliza: 'Creá el combo, agregale los artículos con sus cantidades y definí costo y precio de venta. Después lo buscás en Vender como cualquier artículo.',
		palabras_clave: ['pack', 'promocion', 'paquete', 'kit', 'oferta'],
	},
	singular_model_name_spanish: 'Combo',
	plural_model_name_spanish: 'Combos',
	create_model_name_spanish: 'Nuevo Combo',
	text_delete: 'el',
}