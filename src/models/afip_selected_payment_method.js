export default {
	properties: [
		{
			text: 'Metodo de pago',
			key: 'current_acount_payment_method_id',
			type: 'select',
			use_store_models: true,
		},
	],
	abm_descripcion: {
		para_que_sirve: 'Define qué métodos de pago se incluyen al facturar en ARCA.',
		implicancias: 'Cuando una venta se cobró con varios métodos, el sistema factura únicamente el monto pagado con los métodos cargados acá. Lo cobrado con métodos no incluidos queda fuera del comprobante fiscal.',
		como_se_utiliza: 'Agregá un registro por cada método de pago cuyos cobros deban facturarse. El cálculo del total a facturar los toma automáticamente.',
		palabras_clave: ['facturar', 'arca', 'afip', 'metodos de pago', 'total a facturar'],
	},
	singular_model_name_spanish: 'Metodo de pago seleccionado para Facturacion',
	plural_model_name_spanish: 'Metodo de pago seleccionado para Facturacion',
	create_model_name_spanish: 'Nuevo Metodo de pago seleccionado para Facturacion',
	text_delete: 'el',
}