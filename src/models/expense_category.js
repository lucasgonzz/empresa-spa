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
		para_que_sirve: 'Agrupa los conceptos de gasto en categorías generales (servicios, impuestos, logística, etc.).',
		implicancias: 'Las categorías permiten ver los gastos agrupados en los reportes y analizar en qué se va la plata a nivel general.',
		como_se_utiliza: 'Creá las categorías y asignáselas a los conceptos de gasto.',
		palabras_clave: ['gastos', 'agrupar', 'reportes', 'egresos'],
	},
	singular_model_name_spanish: 'Categoria de Gasto',
	plural_model_name_spanish: 'Categorias de Gasto',
	create_model_name_spanish: 'Nueva Categoria de Gasto',
	text_delete: 'la',
}