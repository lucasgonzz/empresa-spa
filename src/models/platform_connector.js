/**
 * Modelo declarativo ABM: conector OAuth de un usuario hacia una plataforma global (`platform_id`).
 * Las claves de app están en la tabla `platforms` (seed + .env).
 */
export default {
	properties: [
		{
			text: 'Plataforma',
			key: 'platform_id',
			type: 'select',
			store: 'platform',
			select_prop_name: 'name',
			value: 0,
			is_title: true,
			disabled_to_edit: true,
			descriptions: [
				'Elegí Mercado Libre o Tienda Nube. No se puede cambiar después de crear el registro.',
			],
		},
		{
			text: 'Estado',
			key: 'status',
			type: 'text',
			only_show: true,
			descriptions: [
				'sin_conectar: falta abrir el enlace de autorización. conectado: tokens listos. error: revisar en servidor.',
			],
		},
		{
			text: 'ID en la plataforma (tienda / usuario ML)',
			key: 'platform_user_id',
			type: 'text',
			only_show: true,
		},
		{
			text: 'Enlace para autorizar (copiar y abrir en el navegador)',
			key: 'auth_url',
			type: 'textarea',
			only_show: true,
			show_only_if_is_created: true,
			descriptions: [
				'Tras guardar, copiá esta URL y abrila para autorizar. La redirect URL debe coincidir con la app en ML/TN y con el .env del servidor.',
			],
		},
	],
	singular_model_name_spanish: 'Conector de plataforma',
	plural_model_name_spanish: 'Conectores de plataforma',
	create_model_name_spanish: 'Nuevo',
	text_delete: 'el',
}
