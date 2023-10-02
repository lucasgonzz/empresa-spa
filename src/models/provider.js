export default {
	properties: [
		{
			text: 'N°',
			key: 'num',
			type: 'text',
			not_show_on_form: true,
		},
		{
			text: 'Nombre',
			key: 'name',
			type: 'text',
			is_title: true,
		},
		{
			text: 'Saldo',
			key: 'saldo',
			type: 'number',
			only_show: true,
		},
		{
			text: 'Margen de ganancia',
			key: 'percentage_gain',
			type: 'number',
		},
		{
			text: 'Valor dolar',
			key: 'dolar',
			type: 'number',
			is_price: true,
		},
		{
			text: 'Telefono',
			key: 'phone',
			type: 'text',
		},
		{
			text: 'Direccion',
			key: 'address',
			type: 'text',
		},
		{
			text: 'Correo',
			key: 'email',
			type: 'text',
			not_show: true,
		},
		{
			text: 'Razon social',
			key: 'razon_social',
			type: 'text',
			not_show: true,
		},
		{
			text: 'Cuit',
			key: 'cuit',
			type: 'text',
		},
		{
			text: 'Observaciones',
			key: 'observations',
			type: 'textarea',
		},
		{
			text: 'Localidad',
			key: 'location_id',
			type: 'search',
		},
		{
			text: 'IVA',
			key: 'iva_condition_id',
			type: 'select',
			value: 0,
		},
		{
			text: 'Listas de precios',
			key: 'provider_price_lists',
			has_many: {
				text: 'Lista de precios',
				model_name: 'provider_price_list',
			},
			not_show: true,
		},
	],
	singular_model_name_spanish: 'Proveedor',
	plural_model_name_spanish: 'Proveedores',
	create_model_name_spanish: 'Nuevo proveedor',
	text_delete: 'el',
	show_all_models_on_display: false,
}