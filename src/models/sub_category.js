export default {
	properties: [
		{
			text: 'N°',
			key: 'num',
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
	],
	singular_model_name_spanish: 'Sub Categoria',
	plural_model_name_spanish: 'Sub Categorias',
	create_model_name_spanish: 'Nueva',
	text_delete: 'la',
}