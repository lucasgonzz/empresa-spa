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
			text: 'Categoria',
			key: 'category_id',
			type: 'search',
			use_store_models: true,
		},
		{
			text: 'Listas de Precio',
			store: 'price_type',
			search_on_models_by: 'name',
			type: 'search',
			key: 'price_types',
			if_has_extencion: 'lista_de_precios_por_categoria',
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
	singular_model_name_spanish: 'Sub Categoria',
	plural_model_name_spanish: 'Sub Categorias',
	create_model_name_spanish: 'Nueva',
	text_delete: 'la',
}