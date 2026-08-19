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
		para_que_sirve: 'Define los conceptos con los que se registran los gastos del negocio (luz, alquiler, combustible, etc.).',
		implicancias: 'Cada gasto se carga con un concepto, y el concepto pertenece a una categoría de gasto. Esa clasificación es la base de los reportes de gastos.',
		como_se_utiliza: 'Creá el concepto con su nombre y la categoría a la que pertenece. Después lo elegís al cargar cada gasto.',
		palabras_clave: ['gastos', 'clasificacion', 'egresos', 'servicios'],
	},
	singular_model_name_spanish: 'Concepto de gasto',
	plural_model_name_spanish: 'Conceptos de gasto',
	create_model_name_spanish: 'Nuevo Concepto de gasto',
	text_delete: 'el',
}