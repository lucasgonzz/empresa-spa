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
		para_que_sirve: 'Registra las bodegas productoras de los vinos del catálogo.',
		implicancias: 'La bodega se asigna a los artículos de vinoteca y sirve como filtro y dato de ficha del producto.',
		como_se_utiliza: 'Creá cada bodega con su nombre y asignala a los vinos desde la ficha del artículo.',
		palabras_clave: ['vinos', 'productor', 'vinoteca'],
	},
	singular_model_name_spanish: 'Bodega',
	plural_model_name_spanish: 'Bodegas',
	create_model_name_spanish: 'Nueva Bodega',
	text_delete: 'la',
}