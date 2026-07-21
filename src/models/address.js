export default {
	properties: [
		{
			text: 'Nombre',
			key: 'street',
			type: 'text',
			value: '',
			use_in_select: true,
			is_title: true,
		},
		{
			text: 'Domicilio',
			key: 'street_number',
			type: 'text',
			value: '',
		},
		{
			text: 'Telefono',
			key: 'phone',
			type: 'text',
			value: '',
		},
		{
			text: 'Email',
			key: 'email',
			type: 'text',
			value: '',
		},
		{
			text: 'Ciudad',
			key: 'city',
			type: 'text',
			value: '',
		},
		{
			text: 'Provincia',
			key: 'province',
			type: 'text',
			value: '',
		},
		{
			text: 'Deposito por defecto',
			key: 'default_address',
			type: 'checkbox',
			value: 0,
			description: 'Si se marca, este deeposito se ofrecera como opcion por defecto a la hora de indicar el deposito para cualquier articulo',
		},
		{
			/**
			 * Vincula la sucursal con el afip_information que se usa por defecto al facturar
			 * ventas en negro desde acá (prompt 440, columna default_afip_information_id
			 * agregada en el prompt 438). Las opciones son SOLO los afip_information que
			 * pertenecen a esta sucursal (address.afip_informations); si se deja vacío,
			 * el backend cae al afip_information del dueño del negocio.
			 */
			text: 'Facturación por defecto (ventas en negro)',
			key: 'default_afip_information_id',
			type: 'select',
			value: null,
			// options: [] intencional (mismo patrón que sale_factura_print_option en user.js):
			// evita que FieldSelectInput monte el componente genérico de relación por "*_id".
			// Las opciones reales las calcula dynamic_options_function con las afip_information
			// propias de esta sucursal.
			options: [],
			dynamic_options_function: 'get_address_default_afip_information_options',
			disabled_function: 'is_address_default_afip_information_disabled',
			warning_function: 'address_default_afip_information_warning_text',
			descriptions: [
				'Cuando se hace una venta en negro desde esta sucursal y no se especifica la información de facturación, los datos fiscales del comprobante (razón social, domicilio, CUIT, ingresos brutos, etc.) se toman del afip_information que elijas acá. Si lo dejás vacío, se usa la facturación por defecto del negocio.',
			],
		},
	],
	singular_model_name_spanish: 'Sucursal',
	plural_model_name_spanish: 'Sucursales',
	create_model_name_spanish: 'Nueva',
	text_delete: 'la',
}