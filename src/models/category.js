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
			text: 'Imagen',
			key: 'image_url',
			type: 'image',
		},
	],
	singular_model_name_spanish: 'Categoria',
	plural_model_name_spanish: 'Categorias',
	create_model_name_spanish: 'Nueva',
	text_delete: 'la',
}