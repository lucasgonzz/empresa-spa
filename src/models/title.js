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
	abm_descripcion: {
		para_que_sirve: 'Define los banners del inicio de la tienda online, con imagen, título y texto.',
		implicancias: 'Los banners son lo primero que ve el cliente al entrar a la tienda: comunican promociones y novedades. Tienen imagen para escritorio y otra para móvil, con colores de texto y fondo configurables.',
		como_se_utiliza: 'Creá el banner con sus imágenes, título, contenido y colores. Se muestra automáticamente en la portada de la tienda.',
		palabras_clave: ['portada', 'slider', 'promociones', 'tienda', 'inicio'],
	},
	singular_model_name_spanish: 'Banner',
	plural_model_name_spanish: 'Banners',
	create_model_name_spanish: 'Nuevo',
	text_delete: 'el',
}