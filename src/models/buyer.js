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
			text: 'Ciudad',
			key: 'ciudad',
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
			text: 'Direccion',
			key: 'address',
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
		/*
			Botón "Mensaje": abre la conversación con el comprador en el sidebar de Mensajes de
			Tienda Online (misión mensajes-tienda-online, 28/9/2026). Estuvo oculto desde el 15/8
			porque el módulo viejo había salido de pantalla; volvió con el submódulo nuevo. Lo
			despacha `sendMessage()` de mixins/model_functions.js.

			La `key` conserva la errata de siempre ('meessage') a propósito: es la que tenía la
			columna antes de ocultarse, y cambiarla dejaría huérfana cualquier preferencia de
			columnas guardada con ese nombre.
		*/
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