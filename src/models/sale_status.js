export default {
	properties: [
		{
			text: 'Nombre',
			key: 'name',
			type: 'text',
			required: true,
		},
		{
			text: 'Descripcion',
			key: 'description',
			type: 'textarea',
		},
		{
			text: 'Posicion',
			key: 'position',
			type: 'number',
			required: true,
		},
	],
	singular_model_name_spanish: 'Estado de venta',
	plural_model_name_spanish: 'Estados de venta',
	create_model_name_spanish: 'Nueva Estado de venta',
	text_delete: 'el',
}