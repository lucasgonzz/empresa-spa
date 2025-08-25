export default {
	properties: [
		{
			text: 'Caja',
			key: 'caja_id',
			type: 'select',
			use_store_models: true,
		},
		{
			text: 'Metodo de pago',
			key: 'current_acount_payment_method_id',
			store: 'current_acount_payment_method',
			type: 'select',
			use_store_models: true,
		},
		{
			text: 'Direccion',
			select_prop_name: 'street',
			key: 'address_id',
			type: 'select',
			use_store_models: true,
			relation_prop_name: 'street',
		},
	],
	singular_model_name_spanish: 'Caja por defecto',
	plural_model_name_spanish: 'Cajas por defecto',
	create_model_name_spanish: 'Nueva Caja por defecto',
	text_delete: 'la',
}