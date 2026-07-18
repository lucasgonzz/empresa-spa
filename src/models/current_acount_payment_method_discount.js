export default {
	properties: [
		{
			text: 'Metodo de pago',
			key: 'current_acount_payment_method_id',
			type: 'select',
			use_store_models: true,
		},
		{
			text: 'Porcentaje de descuento',
			key: 'discount_percentage',
			type: 'number',
		},
		/*
		 * Prompt 266 (Fase 2, Capa 3): cantidad de cuotas a la que se limita esta regla de
		 * descuento/recargo por metodo de pago. Si se deja vacio, la regla aplica sin importar la
		 * cantidad de cuotas elegida (comportamiento actual). Permite distinguir, por ejemplo, un
		 * recargo especifico para "Visa en 3 cuotas" de uno generico para el metodo de pago.
		 */
		{
			text: 'Cantidad de cuotas',
			key: 'cuotas',
			type: 'number',
			descriptions:
			[
				'Dejar vacio para aplicar sin importar la cantidad de cuotas elegida.',
				'Si se completa, esta regla solo aplica cuando la venta se paga con esa cantidad exacta de cuotas.',
			],
		},
	],
	abm_descripcion: {
		para_que_sirve: 'Define un descuento porcentual automático según el método de pago con el que se cobra.',
		implicancias: 'Al cobrar una venta con el método elegido, el sistema aplica el descuento sobre el monto pagado con ese método. Es la forma típica de premiar el pago en efectivo.',
		como_se_utiliza: 'Creá el registro eligiendo el método de pago y el porcentaje de descuento. Se aplica solo cada vez que ese método se usa en un cobro.',
		palabras_clave: ['efectivo', 'descuento por pago', 'metodo de pago', 'contado'],
	},
	singular_model_name_spanish: 'Descuento para Metodo de pago',
	plural_model_name_spanish: 'Descuentos para Metodo de pago',
	create_model_name_spanish: 'Nuevo Descuento para Metodo de pago',
	text_delete: 'el',
}