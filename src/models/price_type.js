export default {
	properties: [
		{
			text: 'Nombre',
			key: 'name',
			type: 'text',
			value: '',
			is_title: true,
		},
		{
			text: 'Porcentaje',
			key: 'percentage',
			type: 'number',
			value: '',
			show: true,
		},
		{
			text: 'Pocision',
			key: 'position',
			type: 'number',
			value: '',
			show: true,
		},
		{
			text: 'Ocultar al publico',
			key: 'ocultar_al_publico',
			type: 'checkbox',
			value: 0,
			show: true,
		},
		{
			text: 'Por defecto, incluir los articulos en esta lista para exportar en el Excel a los clientes',
			key: 'incluir_en_lista_de_precios_de_excel',
			type: 'checkbox',
			value: 1,
			show: true,
		},
		{
			text: 'Categorias',
			store: 'category',
			search_on_models_by: 'name',
			type: 'search',
			key: 'categories',
			belongs_to_many: {
				model_name: 'category',
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
		{
			text: 'Sub Categorias',
			key: 'sub_categories',
			type: 'search',
			store: 'sub_category',
			belongs_to_many: {
				model_name: 'sub_category',
				properties_to_set: [
					{
						label: 'Porcentaje',
						key: 'percentage',
						type: 'number',
					}
				],
			}
		},
	],
	singular_model_name_spanish: 'Tipo de precio',
	plural_model_name_spanish: 'Tipos de precio',
	create_model_name_spanish: 'Nuevo tipo de precio',
	text_delete: 'el',
}