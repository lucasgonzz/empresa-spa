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
		/*
		 * Propiedad para gestionar la imagen de la marca.
		 * key: campo persistido en backend.
		 * type image: habilita selector/carga de imagen en el formulario.
		 */
		{
			text: 'Imagen',
			key: 'image_url',
			type: 'image',
			value: '',
		},
	],
	singular_model_name_spanish: 'Marca',
	plural_model_name_spanish: 'Marcas',
	create_model_name_spanish: 'Nueva',
	text_delete: 'la',
}