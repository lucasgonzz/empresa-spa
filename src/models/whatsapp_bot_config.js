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
	abm_descripcion: {
		para_que_sirve: 'Configura las credenciales del bot de WhatsApp del negocio para responder consultas de clientes.',
		implicancias: 'Con la configuración activa, el bot queda conectado al número de WhatsApp del negocio a través de Kapso y puede atender mensajes entrantes automáticamente.',
		como_se_utiliza: 'Completá la API Key de Kapso, el Phone Number ID y el Webhook Secret provistos en la configuración de Kapso, y activá el registro.',
		palabras_clave: ['whatsapp', 'bot', 'kapso', 'atencion automatica', 'chatbot'],
	},
	singular_model_name_spanish: 'Configuración WhatsApp Bot',
	plural_model_name_spanish: 'WhatsApp Bot',
	create_model_name_spanish: 'Nueva configuración',
	text_delete: 'la',
}
