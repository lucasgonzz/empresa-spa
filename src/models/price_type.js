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