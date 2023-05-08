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
			text: 'Liquidar comision despues de saldar la venta',
			key: 'commission_after_pay_sale',
			type: 'checkbox',
		},
	],
	singular_model_name_spanish: 'Vendedor',
	plural_model_name_spanish: 'Vendedores',
	create_model_name_spanish: 'Nuevo vendedor',
	text_delete: 'el',
}