export default {
	properties: [
		{
			text: 'Nombre',
			key: 'name',
			type: 'text',
			is_title: true,
		},
	],
	abm_descripcion: {
		para_que_sirve: 'Define etiquetas de reputación para calificar a los clientes (por ejemplo: excelente, moroso, nuevo).',
		implicancias: 'La reputación se asigna en la ficha del cliente y sirve como referencia rápida para decidir condiciones de venta, crédito o seguimiento.',
		como_se_utiliza: 'Creá las reputaciones que quieras manejar y asignalas a cada cliente desde su ficha.',
		palabras_clave: ['calificacion', 'clientes', 'moroso', 'confianza'],
	},
	singular_model_name_spanish: 'Reputacion',
	plural_model_name_spanish: 'Reputaciones',
	create_model_name_spanish: 'Nueva Reputacion',
	text_delete: 'la',
}