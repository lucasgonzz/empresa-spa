export default {
	properties: [
		{
			text: 'Imagen',
			key: 'image_url',
			type: 'image',
			select_image_from: {
				model_name: 'article',
				images_prop: 'images',
			},
		},
		{
			text: 'Variante',
			key: 'variant_description',
			type: 'text',
		},
		{
			text: 'Stock',
			key: 'stock',
			type: 'text',
			disabled: true,
		},
		{
			text: 'Stock por direccion',
			key: 'addresses',
			only_show: true,
			type: 'search',
			store: 'address',
			belongs_to_many: {
				model_name: 'address',
				props_to_show: [
					{
						text: 'Direccion',
						key: 'street',
					},
				],
				pivot_props_to_show: [
					{
						text: 'Cantidad',
						key: 'amount',
					},
				],
			},
		},
		{
			text: 'Precio',
			key: 'price',
			type: 'text',
			is_price: true,
		},
	],
	singular_model_name_spanish: 'Variante',
	plural_model_name_spanish: 'Variantes',
	create_model_name_spanish: 'Nueva',
	text_delete: 'la',
}