export default {
	properties: [
		{
			text: 'N°',
			key: 'num',
			type: 'number',
			not_show_on_form: true,
		},
		{
			text: 'Nombre',
			key: 'name',
			type: 'text',
			value: '',
			is_title: true,
		},
		{
			text: 'Imagen',
			key: 'image_url',
			type: 'image',
		},
		{
			text: 'Margen de ganancia',
			key: 'percentage_gain',
			type: 'number',
		},
		{
			text: 'Listas de Precio',
			if_has_extencion: 'lista_de_precios_por_categoria',
			store: 'price_type',
			search_on_models_by: 'name',
			type: 'search',
			key: 'price_types',
			belongs_to_many: {
				model_name: 'price_type',
				props_to_show: [
					{
						text: 'Nombre',
						key: 'name',
						type: 'text',
						show: true,
					},
				],
				properties_to_set: [
					{
						text: 'Margen de ganancia',
						key: 'percentage',
						value: '',
						type: 'number'
					},
				],
			}
		},
	],
	singular_model_name_spanish: 'Categoria',
	plural_model_name_spanish: 'Categorias',
	create_model_name_spanish: 'Nueva',
	text_delete: 'la',
}