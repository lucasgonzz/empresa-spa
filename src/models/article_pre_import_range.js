export default {
	properties: [
		{
			text: 'Minimo',
			key: 'min',
			type: 'number',
		},
		{
			text: 'Maximo',
			key: 'max',
			type: 'number',
		},
		{
			text: 'Color',
			key: 'color',
			type: 'text',
		},
	],
	abm_descripcion: {
		para_que_sirve: 'Define rangos de valores con colores para resaltar filas en la vista previa de la importación de artículos.',
		implicancias: 'En la pre importación, las filas cuyo valor cae dentro de un rango se pintan con el color definido, lo que permite detectar de un vistazo aumentos fuera de lo esperado antes de confirmar la importación.',
		como_se_utiliza: 'Creá los rangos con mínimo, máximo y color. Se aplican automáticamente en la pantalla de pre importación por Excel.',
		palabras_clave: ['importacion', 'excel', 'colores', 'vista previa', 'control'],
	},
	singular_model_name_spanish: 'Rango de pre importacion',
	plural_model_name_spanish: 'Rangos de pre importacion',
	create_model_name_spanish: 'Nuevo rango',
	text_delete: 'el',
}