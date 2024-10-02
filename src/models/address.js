export default {
	properties: [
		{
			text: 'Calle',
			key: 'street',
			type: 'text',
			value: '',
			use_in_select: true,
			is_title: true,
		},
		{
			text: 'Numero',
			key: 'street_number',
			type: 'text',
			value: '',
			is_title: true,
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
	singular_model_name_spanish: 'Direccion',
	plural_model_name_spanish: 'Direcciones',
	create_model_name_spanish: 'Nueva',
	text_delete: 'la',
}