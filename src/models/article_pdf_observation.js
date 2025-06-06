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
	],
	singular_model_name_spanish: 'Observaciones para el PDF de articulos',
	plural_model_name_spanish: 'Observaciones para el PDF de articulos',
	create_model_name_spanish: 'Nueva Observaciones para el PDF de articulos',
	text_delete: 'la',
}