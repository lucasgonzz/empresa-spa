export default {
	properties: [
		{
			text: 'Nombre',
			key: 'name',
			type: 'text',
			value: '',
			is_title: true,
			required: true,
		},
		{
			text: 'Descripcion',
			key: 'description',
			type: 'textarea',
			value: '',
			show: true,
			required: false,
		},
		{
			text: 'Descuento',
			key: 'discount',
			type: 'number',
			value: '',
		},
		{
			text: 'Tipo',
			key: 'payment_method_type_id',
			type: 'select',
			value: 0,
			show: true,
		},
		{
			text: 'Clave publica',
			key: 'public_key',
			type: 'text',
			value: '',
			v_if: ['payment_method_type_id', '!=', 0]
		},
		{
			text: 'Clave privada',
			key: 'access_token',
			type: 'text',
			value: '',
			v_if: ['payment_method_type_id', '!=', 0]
		},

	],
	singular_model_name_spanish: 'Metodo de pago',
	plural_model_name_spanish: 'Metodos de pago',
	create_model_name_spanish: 'Nuevo metodo de pago',
	text_delete: 'el',
}