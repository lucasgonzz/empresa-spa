export default {
	properties: [
		{
			text: 'N°',
			key: 'num',
			type: 'text',
			not_show_on_form: true,
			filter_type: 'number',
		},
		{
			text: 'Nombre',
			key: 'name',
			type: 'text',
		},
		{
			text: 'Categoria de gasto',
			key: 'expense_category_id',
			type: 'select',
			use_store_models: true,
		},
	],
	abm_descripcion: {
		para_que_sirve: 'Define las sub categorías con las que se registran los gastos del negocio (luz, alquiler, combustible, etc.).',
		implicancias: 'Cada gasto se carga con una sub categoría, y la sub categoría pertenece a una categoría de gasto. Esa clasificación es la base de los reportes de gastos.',
		como_se_utiliza: 'Creá la sub categoría con su nombre y la categoría a la que pertenece. Después la elegís al cargar cada gasto.',
		palabras_clave: ['gastos', 'clasificacion', 'egresos', 'servicios'],
	},
	singular_model_name_spanish: 'Sub categoría de gasto',
	plural_model_name_spanish: 'Sub categorías de gasto',
	create_model_name_spanish: 'Nueva Sub categoría de gasto',
	text_delete: 'la',
}