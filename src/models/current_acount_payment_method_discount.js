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
	],
	singular_model_name_spanish: 'Descuento para Metodo de pago',
	plural_model_name_spanish: 'Descuentos para Metodo de pago',
	create_model_name_spanish: 'Nuevo Descuento para Metodo de pago',
	text_delete: 'el',
}