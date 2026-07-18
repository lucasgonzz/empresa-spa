export default {
	properties: [
		{
			text: 'Texto',
			key: 'text',
			type: 'text',
		},
		{
			text: 'Posicion',
			key: 'position',
			type: 'number',
		},
		{
			text: 'Color del texto',
			key: 'color',
			type: 'text',
			description: 'Ingrese el codigo RGB separando los valores con un - (guion medio). Por ejemplo, para el blanco: 255-255-255'
		},
		{
			text: 'Color de Fondo',
			key: 'background',
			type: 'text',
			description: 'Ingrese el codigo RGB separando los valores con un - (guion medio). Por ejemplo, para el blanco: 255-255-255'
		},
		{
			text: 'Imagen',
			key: 'image_url',
			type: 'image',
			crop_aspect_ratio: 0,
		},
	],
	abm_descripcion: {
		para_que_sirve: 'Define textos e imágenes que se insertan como observaciones en el PDF de artículos.',
		implicancias: 'Cada observación tiene texto, posición, colores y una imagen opcional, y aparece en el listado PDF de artículos: sirve para aclaraciones, condiciones comerciales o mensajes destacados dentro del catálogo.',
		como_se_utiliza: 'Creá la observación con su texto, posición y colores en formato RGB separado por guiones. Se imprime automáticamente en el PDF de artículos.',
		palabras_clave: ['pdf', 'catalogo', 'leyenda', 'aclaracion', 'observacion'],
	},
	singular_model_name_spanish: 'Observaciones para el PDF de articulos',
	plural_model_name_spanish: 'Observaciones para el PDF de articulos',
	create_model_name_spanish: 'Nueva Observaciones para el PDF de articulos',
	text_delete: 'la',
}