export default {
	properties: [
		{
			text: 'Nombre',
			key: 'name',
			type: 'text',
			value: '',
			is_title: true,
			required: false,
		},
		{
			text: 'Comision',
			key: 'commission',
			type: 'number',
			value: '',
			required: false,
			show: true,
		},
	],
	singular_model_name_spanish: 'Vendedor',
	plural_model_name_spanish: 'Vendedores',
	create_model_name_spanish: 'Nuevo vendedor',
	text_delete: 'el',
}