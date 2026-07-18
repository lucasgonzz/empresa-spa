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
			text: 'Categoria',
			key: 'category_id',
			type: 'search',
			use_store_models: true,
		},
		{
			text: 'Listas de Precio',
			store: 'price_type',
			search_on_models_by: 'name',
			type: 'search',
			key: 'price_types',
			if_has_extencion: 'lista_de_precios_por_categoria',
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
		para_que_sirve: 'Subdivide una categoría en grupos más chicos para afinar la organización del catálogo.',
		implicancias: 'Cada subcategoría pertenece a una categoría y funciona como segundo nivel de filtro en artículos y en la tienda. También puede tener márgenes propios por lista de precios, que pisan a los de la categoría.',
		como_se_utiliza: 'Creá la subcategoría, elegí a qué categoría pertenece y asignala a los artículos. Si trabajás con listas de precios por categoría, podés definir un margen específico para cada lista.',
		palabras_clave: ['subrubro', 'subcategoria', 'clasificacion', 'catalogo'],
	},
	singular_model_name_spanish: 'Sub Categoria',
	plural_model_name_spanish: 'Sub Categorias',
	create_model_name_spanish: 'Nueva',
	text_delete: 'la',
}