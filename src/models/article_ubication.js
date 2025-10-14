export default {
	properties: [
		{
			text: 'Nombre',
			key: 'name',
			type: 'text',
		},
		{
			text: 'Sucursal/Deposito',
			key: 'address_id',
			type: 'select',
			relation_prop_name: 'street',
			use_store_models: true,
		},
	],
	singular_model_name_spanish: 'Ubicacion de articulo',
	plural_model_name_spanish: 'Ubicaciones de articulo',
	create_model_name_spanish: 'Nueva Ubicacion de articulo',
	text_delete: 'la',
}