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
	],
	abm_descripcion: {
		para_que_sirve: 'Registra las sucursales y depósitos del negocio con sus datos de contacto.',
		implicancias: 'Las sucursales estructuran gran parte del sistema: el stock se maneja por sucursal, las ubicaciones de artículos pertenecen a una sucursal, las cajas por defecto pueden diferenciarse por sucursal y cada una puede tener su facturación ARCA por defecto. El depósito por defecto es el que se ofrece al cargar artículos.',
		como_se_utiliza: 'Creá cada sucursal con nombre, domicilio y contacto. Marcá una como depósito por defecto y, si corresponde, asignale su punto de venta ARCA por defecto.',
		palabras_clave: ['deposito', 'locales', 'domicilio', 'puntos de venta'],
	},
	singular_model_name_spanish: 'Sucursal',
	plural_model_name_spanish: 'Sucursales',
	create_model_name_spanish: 'Nueva',
	text_delete: 'la',
}