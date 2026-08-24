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
	abm_descripcion: {
		para_que_sirve: 'Define los estados por los que pasa una venta (por ejemplo: pendiente, preparando, entregada).',
		implicancias: 'Los estados permiten seguir el circuito de cada venta, filtrar el listado por estado y organizar la operación diaria. La posición define el orden en que se muestran.',
		como_se_utiliza: 'Creá los estados con nombre, descripción y posición. Después se asignan a las ventas desde el listado de ventas.',
		palabras_clave: ['seguimiento', 'circuito', 'pendiente', 'entregado', 'workflow'],
	},
	singular_model_name_spanish: 'Estado de venta',
	plural_model_name_spanish: 'Estados de venta',
	create_model_name_spanish: 'Nueva Estado de venta',
	text_delete: 'el',
}