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
	],
	singular_model_name_spanish: 'Concepto de gasto',
	plural_model_name_spanish: 'Conceptos de gasto',
	create_model_name_spanish: 'Nuevo Concepto de gasto',
	text_delete: 'el',
}