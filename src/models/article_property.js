export default {
	properties: [
		{
			text: 'Propiedad',
			key: 'article_property_type_id',
			type: 'select',
			use_store_models: true,
		},
		{
			text: 'Valores',
			key: 'article_property_values',
			store: 'article_property_value',
			type: 'search',
			depends_on: 'article_property_type_id',
			belongs_to_many: {
				model_name: 'article_property_value',
				props_to_show: [
					{
						text: 'Nombre',
						key: 'name',
					}
				],
			}
		},
	],
	singular_model_name_spanish: 'Propiedad de Articulo',
	plural_model_name_spanish: 'Propiedades de Articulo',
	create_model_name_spanish: 'Nueva',
	text_delete: 'la',
}