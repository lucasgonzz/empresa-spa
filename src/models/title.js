export default {
	properties: [
		{
			text: 'Imagen',
			key: 'image_url',
			type: 'image',
			crop_aspect_ratio: 4/1,
		},
		{
			text: 'Imagen para movil',
			key: 'crop_image_url',
			type: 'image',
		},
		{
			text: 'Titulo',
			key: 'header',
			type: 'text',
			is_title: true,
		},
		{
			text: 'Contenido',
			key: 'lead',
			type: 'textarea',
		},
		{
			text: 'Color de texto',
			key: 'text_color',
			type: 'text',
		},
		{
			text: 'Color de fondo',
			key: 'color',
			type: 'text',
		},
	],
	singular_model_name_spanish: 'Titulo',
	plural_model_name_spanish: 'Titulos',
	create_model_name_spanish: 'Nuevo',
	text_delete: 'el',
}