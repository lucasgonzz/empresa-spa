export default {
	properties: [
		{
			text: 'Nombre',
			key: 'name',
			type: 'text',
			value: '',
			is_title: true,
		},
		{
			text: 'Telefono',
			key: 'phone',
			type: 'text',
			value: '',
			show: true,
		},
		{
			text: 'Correo',
			key: 'email',
			type: 'text',
			value: '',
			show: true,
		},
		{
			text: 'WhatsApp',
			key: 'WhatsApp',
			button: {
				variant: 'success',
				icon: 'whatsapp',
				function: 'sendWhatsApp',
			}
		},
		{
			text: 'Ultimo login',
			key: 'last_login',
			type: 'date',
			only_show: true,
			is_date: true,
			value: '',
			show: true,
		},
	],
	singular_model_name_spanish: 'Cliente',
	plural_model_name_spanish: 'Clientes',
	create_model_name_spanish: 'Nuevo cliente',
	text_delete: 'el',
}