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
			text: 'Barrio',
			key: 'barrio',
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
			text: 'Mensaje',
			key: 'meessage',
			button: {
				variant: 'primary',
				icon: 'message',
				function: 'sendMessage',
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
		{
			text: 'Contraseña',
			key: 'visible_password',
			type: 'text',
		},
		{
			text: 'Perfil de VENDEDOR',
			key: 'seller_id',
			type: 'select',
			use_store_models: true,
			show: true,
		},
	],
	singular_model_name_spanish: 'Cliente',
	plural_model_name_spanish: 'Clientes',
	create_model_name_spanish: 'Nuevo cliente',
	text_delete: 'el',
}