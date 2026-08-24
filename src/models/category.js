export default {
	properties: [
		{
			text: 'N°',
			key: 'num',
			type: 'number',
			not_show_on_form: true,
		},
		{
			text: 'Nombre',
			key: 'name',
			type: 'text',
			value: '',
			is_title: true,
		},
		{
			text: 'Imagen',
			key: 'image_url',
			type: 'image',
		},
		{
			text: 'Margen de ganancia',
			key: 'percentage_gain',
			type: 'number',
		},
		{
			text: 'Mostrar en PDF de articulos',
			key: 'show_in_pdf_personalizado',
			type: 'checkbox',
			if_has_extencion: 'vinoteca',
		},

		{
			text: 'Listas de Precio',
			if_has_extencion: 'lista_de_precios_por_categoria',
			store: 'price_type',
			search_on_models_by: 'name',
			type: 'search',
			key: 'price_types',
			belongs_to_many: {
				model_name: 'price_type',
				props_to_show: [
					{
						text: 'Nombre',
						key: 'name',
						type: 'text',
						show: true,
					},
				],
				properties_to_set: [
					{
						text: 'Margen de ganancia',
						key: 'percentage',
						value: '',
						type: 'number'
					},
				],
			}
		},
	],
	abm_descripcion: {
		para_que_sirve: 'Agrupa los artículos en rubros o familias para organizar el catálogo.',
		implicancias: 'Las categorías aparecen como filtros en el listado de artículos, en Vender y en la tienda online. El margen de ganancia de la categoría se usa como valor por defecto al crear artículos, y los rangos de precio por cantidad se definen por categoría.',
		como_se_utiliza: 'Creá una categoría con nombre, imagen opcional y margen de ganancia. Después asignala a los artículos desde el listado o al crearlos. Si usás listas de precios por categoría, acá también definís el margen por cada lista.',
		palabras_clave: ['rubros', 'familias', 'agrupar articulos', 'catalogo', 'margen'],
	},
	singular_model_name_spanish: 'Categoria',
	plural_model_name_spanish: 'Categorias',
	create_model_name_spanish: 'Nueva',
	text_delete: 'la',
}