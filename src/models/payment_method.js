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
		{
			key: 'payment_method_installments',
			text: 'Cuotas',
			v_if: ['payment_method_type_id', '=', 2],
			has_many: {
				text: 'Cuotas',
				model_name: 'payment_method_installment',
			},
		}

	],
	abm_descripcion: {
		para_que_sirve: 'Define los métodos de pago que ofrece la tienda online a los compradores.',
		implicancias: 'Son los medios de pago del checkout de la tienda: pueden tener descuento propio, cuotas configuradas y, en el caso de Mercado Pago, las credenciales para cobrar online. No confundir con los Métodos de Pago de cuenta corriente, que son los del mostrador.',
		como_se_utiliza: 'Creá el método con nombre, tipo y descuento si corresponde. Para Mercado Pago, completá la clave pública y la privada, y configurá las cuotas disponibles.',
		palabras_clave: ['checkout', 'mercado pago', 'cuotas', 'tienda', 'cobro online'],
	},
	singular_model_name_spanish: 'Metodo de pago',
	plural_model_name_spanish: 'Metodos de pago',
	create_model_name_spanish: 'Nuevo metodo de pago',
	text_delete: 'el',
}