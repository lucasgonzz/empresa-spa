export default {
	properties: [
		{
			text: 'Nombre',
			key: 'name',
			type: 'text',
			required: true,
			is_title: true,
		},
		{
			text: 'Mail',
			key: 'mail',
			type: 'text',
		},
		{
			text: 'CUIT',
			key: 'cuit',
			type: 'text',
		},
		{
			text: 'Provincia',
			key: 'provincia',
			type: 'text',
		},
		{
			text: 'Localidad',
			key: 'localidad',
			type: 'text',
		},
		{
			text: 'Código postal',
			key: 'postal_code',
			type: 'text',
		},
	],
	singular_model_name_spanish: 'Remitente',
	plural_model_name_spanish: 'Remitentes',
	create_model_name_spanish: 'Nuevo remitente',
	text_delete: 'el',
}
