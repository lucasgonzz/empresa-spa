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
			text: 'Tipo',
			key: 'c_a_payment_method_type_id',
			type: 'select',
			use_store_models: true,
		},
	],
	singular_model_name_spanish: 'Metodo de Pago',
	plural_model_name_spanish: 'Metodos de Pago',
	create_model_name_spanish: 'Nuevo',
	text_delete: 'el',
}