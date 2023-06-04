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