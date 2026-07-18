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
		para_que_sirve: 'Registra las cepas de los vinos del catálogo (Malbec, Cabernet, etc.).',
		implicancias: 'La cepa se asigna a los artículos de vinoteca y sirve como filtro y dato de ficha del producto.',
		como_se_utiliza: 'Creá cada cepa con su nombre y asignala a los vinos desde la ficha del artículo.',
		palabras_clave: ['vinos', 'varietal', 'malbec', 'vinoteca'],
	},
	singular_model_name_spanish: 'Cepa',
	plural_model_name_spanish: 'Cepas',
	create_model_name_spanish: 'Nueva Cepa',
	text_delete: 'la',
}