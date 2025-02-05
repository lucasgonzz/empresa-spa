export default {
	properties: [
		{
			text: 'Tipo de precio',
			key: 'price_type_id',
			type: 'select',
		},
		{
			text: 'Categoria',
			key: 'category_id',
			type: 'search',
		},
		{
			text: 'Sub Categoria',
			key: 'sub_category_id',
			type: 'search',
		},
		{
			text: 'Cantidad minima o igual',
			key: 'min',
			type: 'number',
		},
		{
			text: 'Cantidad maxima o igual',
			key: 'max',
			type: 'number',
		},
	],
	singular_model_name_spanish: 'Rango de precio',
	plural_model_name_spanish: 'Rangos de precio',
	create_model_name_spanish: 'Nuevo Rango de precio',
	text_delete: 'el',
}