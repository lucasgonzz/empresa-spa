export default {
	properties: [
		{
			text: 'N°',
			key: 'num',
			type: 'number',
			value: '',
			show: true,
			not_show_on_form: true,
			use_to_filter_in_search: true,
			filter_modal_position: 9,
		},
		{
			text: 'Nombre',
			key: 'name',
			type: 'text',
			value: '',
			show: true,
			use_to_filter_in_search: true,
			use_to_filter_in_modal: true,
			filter_modal_position: 1,
		},
		{
			text: 'Saldo',
			key: 'saldo',
			only_show: true,
			type: 'number',
			value: '',
			show: true,
			is_price: true,
			use_to_filter_in_modal: true,
			filter_modal_position: 2,
		},
		{
			text: 'Telefono',
			key: 'phone',
			type: 'text',
			value: '',
			show: true,
			use_to_filter_in_modal: true,
		},
		{
			text: 'Correo',
			key: 'email',
			type: 'text',
			value: '',
			not_show: true,
		},
		{
			text: 'Direccion',
			key: 'address',
			type: 'text',
			value: '',
			not_show: true,
			use_to_filter_in_modal: true,
			filter_modal_position: 5,
		},
		{
			text: 'Google Maps',
			key: 'link_google_maps',
			type: 'text',
			value: '',
			not_show: true,
			use_to_filter_in_modal: true,
			filter_modal_position: 5,
		},
		{
			text: 'Sucursal',
			key: 'address_id',
			relation_prop_name: 'street',
			use_store_models: true,
			type: 'select',
			value: 0,
			if_has_extencion: 'filtrar_clientes_por_sucursal_en_vender',
		},
		{
			text: 'Tipo de precio',
			key: 'price_type_id',
			type: 'select',
			value: 0,
			show: true,
			use_store_models: true,
			use_to_filter_in_modal: true,
			filter_modal_position: 7,
		},
		{
			text: 'Localidad',
			key: 'location_id',
			type: 'search',
			use_store_models: true,
			use_to_filter_in_modal: true,
			filter_modal_position: 4,
		},
		{
			text: 'Cuit',
			key: 'cuit',
			type: 'number',
			value: '',
			show: true,
			use_to_filter_in_search: true,
			filter_modal_position: 6,
		},
		{
			text: 'Cuil',
			key: 'cuil',
			type: 'number',
			value: '',
			show: true,
			use_to_filter_in_search: true,
		},
		{
			text: 'Dni',
			key: 'dni',
			type: 'number',
			value: '',
			show: true,
			use_to_filter_in_search: true,
		},
		{
			text: 'Razon social',
			key: 'razon_social',
			type: 'text',
			not_show: true,
			value: '',
		},
		{
			text: 'Condicion frente al IVA',
			key: 'iva_condition_id',
			type: 'select',
			value: 0,
			not_show: true,
			use_store_models: true,
			use_to_filter_in_modal: true,
			filter_modal_position: 8,
		},

		{
			text: 'Pasar las ventas a la C/C sin esperar a facturar',
			key: 'pasar_ventas_a_la_cuenta_corriente_sin_esperar_a_facturar',
			if_has_extencion: 'guardad_cuenta_corriente_despues_de_facturar',
			type: 'checkbox',
			description: 'Si se activa, se cargara el saldo a la cuenta corriente inmediatamente guardada la venta',
			value: 0,
		},
		
		{
			text: 'Descripcion',
			key: 'description',
			type: 'textarea',
			value: '',
			show: true,
		},
		{
			text: 'Vendedor',
			key: 'seller_id',
			type: 'select',
			value: 0,
			not_show: true,
			use_store_models: true,
			filter_modal_position: 3,
		},
	],
	plural_model_name_spanish: 'Clientes',
	singular_model_name_spanish: 'Cliente',
	create_model_name_spanish: 'Nuevo cliente',
	text_delete: 'el',
	show_all_models_on_display: false,
}