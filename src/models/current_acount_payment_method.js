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
	abm_descripcion: {
		para_que_sirve: 'Define los métodos de pago con los que cobrás las ventas y los pagos de cuenta corriente: efectivo, transferencia, cheque, tarjeta, etc.',
		implicancias: 'Es uno de los recursos centrales del sistema: los métodos definidos acá se usan al cobrar en Vender, al registrar pagos de clientes en cuenta corriente, en los descuentos por método de pago, en las cajas por defecto y en la selección de qué se factura en ARCA. El tipo (por ejemplo cheque) habilita datos adicionales al cobrar.',
		como_se_utiliza: 'Creá cada método con su nombre y tipo. Después aparecen como opciones en todas las pantallas de cobro.',
		palabras_clave: ['cobro', 'efectivo', 'transferencia', 'cheque', 'tarjeta', 'pago'],
	},
	singular_model_name_spanish: 'Metodo de Pago',
	plural_model_name_spanish: 'Metodos de Pago',
	create_model_name_spanish: 'Nuevo',
	text_delete: 'el',
}