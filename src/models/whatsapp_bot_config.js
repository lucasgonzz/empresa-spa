export default {
	properties: [
		{
			text: 'API Key de Kapso',
			key: 'kapso_api_key',
			type: 'text',
			value: '',
			is_title: true,
		},
		{
			text: 'Phone Number ID',
			key: 'phone_number_id',
			type: 'text',
			value: '',
		},
		{
			text: 'Webhook Secret',
			key: 'webhook_secret',
			type: 'text',
			value: '',
		},
		{
			text: 'Activo',
			key: 'is_active',
			type: 'checkbox',
			value: false,
		},
	],
	singular_model_name_spanish: 'Configuración WhatsApp Bot',
	plural_model_name_spanish: 'WhatsApp Bot',
	create_model_name_spanish: 'Nueva configuración',
	text_delete: 'la',
}
