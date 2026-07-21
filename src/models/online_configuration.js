export default {
	properties: [
		{
			group_title: 'General'
		},
		{
			text: 'Pausar la Tienda Online',
			key: 'pausar_tienda_online',
			type: 'checkbox',
			description: 'Si se pausa la tienda online, no se mostrara el contenido de la misma y se informara al usuario.',
		},
		{
			text: 'Mostrar seccion Catalogo en la Tienda',
			key: 'mostrar_catalogo',
			type: 'checkbox',
			description: 'Si se activa, se mostrara el enlace Catalogo en el navbar de la tienda online.',
		},

		{
			group_title: 'Precios'
		},
		{
			text: 'Precios en la Tienda',
			key: 'online_price_type_id',
			type: 'select',
		},
		{
			text: 'Recargos a los precios en la Tienda',
			key: 'online_price_surchage',
			type: 'number',
		},
		{
			text: 'Texto para precio pausado',
			key: 'text_precio_pausado',
			type: 'text',
			value: '',
			description: 'Mensaje que verán los clientes en los artículos marcados con "Precio pausado" en lugar del importe.',
		},

		{
			group_title: 'Registro de clientes'
		},
		{
			text: 'Registrarse para comprar',
			key: 'register_to_buy',
			type: 'checkbox',
			descriptions: [
				'Solo disponible si no se trabaja con listas de precios',
			],
		},
		{
			text: 'Pedir el barrio al registrarse',
			key: 'pedir_barrio_al_registrarse',
			type: 'checkbox',
		},
		{
			text: 'Logear automaticamente al cliente cuando finaliza el registro',
			key: 'logear_cliente_al_registrar',
			type: 'checkbox',
		},

		{
			group_title: 'Presentacion'
		},
		{
			text: 'Titulo seccion Quienes somos',
			key: 'titulo_quienes_somos',
			type: 'text',
		},
		{
			text: 'Quienes somos',
			key: 'quienes_somos',
			type: 'texteditor',
			value: '',
			show: true,
		},
		{
			text: 'Mensaje para mostrar en Pagina CONTACTO',
			key: 'mensaje_contacto',
			type: 'textarea',
			value: '',
			show: true,
		},

		{
			group_title: 'Diseño'
		},
		{
			text: 'Plantilla',
			key: 'online_template_id',
			type: 'select',
			use_store_models: true,
		},
		{
			text: 'Imagen por defecto para los articulos sin Imagenes',
			key: 'default_article_image_url',
			type: 'image',
		},
		{
			text: 'Logo de la tienda',
			key: 'logo_url',
			type: 'image',
		},
		{
			text: 'Color primario',
			key: 'primary_color',
			type: 'text',
			value: '#c5111d',
		},
		{
			text: 'Color secundario',
			key: 'secondary_color',
			type: 'text',
			value: '#fe7802',
		},
		{
			text: 'Color texto',
			key: 'text_color',
			type: 'text',
			value: '#F2F2F2',
		},
		{
			text: 'Color texto hover',
			key: 'hover_text_color',
			type: 'text',
			value: '#FFF',
		},
		{
			text: 'Cantidad tarjetas en telefono',
			key: 'cantidad_tarjetas_en_telefono',
			type: 'number',
		},
		{
			text: 'Cantidad tarjetas en tablet',
			key: 'cantidad_tarjetas_en_tablet',
			type: 'number',
		},
		{
			text: 'Cantidad tarjetas en notebook',
			key: 'cantidad_tarjetas_en_notebook',
			type: 'number',
		},
		{
			text: 'Cantidad tarjetas en escritorio',
			key: 'cantidad_tarjetas_en_escritorio',
			type: 'number',
		},
		{
			text: 'Tamaño de letra en descripcion de articulos (px)',
			key: 'article_description_font_size',
			type: 'number',
			value: 16,
			description: 'Define el tamaño de letra de la descripcion en la vista de articulo de la tienda.',
		},

		{
			group_title: 'Inicio (Home)'
		},
		{
			text: 'Scroll infinito en el Inicio',
			key: 'scroll_infinito_en_home',
			type: 'checkbox',
		},
		{
			text: 'Auto scroll en Home (px/segundo)',
			key: 'auto_scroll_home',
			type: 'number',
			description: 'Si tiene valor, activa un scroll vertical automatico en el inicio.',
		},
		{
			text: 'Iniciar auto scroll en Home luego de (segundos)',
			key: 'auto_scroll_home_init',
			type: 'number',
			description: 'Tiempo de inactividad antes de iniciar el auto scroll. Si no tiene valor, usa 10 segundos.',
		},
		{
			text: 'Intervalo auto scroll en Home (milisegundos)',
			key: 'auto_scroll_home_interval',
			type: 'number',
			description: 'Cada cuantos milisegundos se aplica el scroll automatico. Si no tiene valor, usa 1000.',
		},

		{
			group_title: 'Catalogo y stock'
		},
		{
			text: 'Mostrar articulos sin Stock en la Tienda',
			key: 'show_articles_without_stock',
			type: 'checkbox',
			description: 'En caso de que un articulo tenga stock = 0 (no aplica para los articulos con stock sin especificar), se mostrara un aviso de "Producto agotado" y no se dejara agregar al carrito'
		},
		{
			text: 'Cuando el stock este sin especificar, es igual a 0',
			key: 'stock_null_equal_0',
			type: 'checkbox',
		},
		{
			text: 'Mostrar articulos sin imagenes en la Tienda',
			key: 'show_articles_without_images',
			type: 'checkbox',
		},

		{
			group_title: 'Carrito y pedidos'
		},
		{
			text: 'Cantidad por defecto para agregar al carrito',
			key: 'default_amount_add_to_cart',
			type: 'number',
		},
		{
			text: 'Nota para los pedidos',
			key: 'order_description',
			type: 'textarea',
			value: '',
			show: true,
		},
		{
			text: 'Aviso antes de confirmar compra',
			key: 'aviso_antes_de_confirmar_compra',
			type: 'texteditor',
			value: '',
			show: true,
			description: 'Texto formateado que se muestra en la tienda, debajo del resumen de compra, antes de finalizar el pedido.',
		},
		{
			text: 'Guardar venta despues de entregar Pedido',
			key: 'save_sale_after_finish_order',
			description: 'Si se activa, se descontara el stock despues de confirmar un pedido, y se generara la venta una vez entregado',
			type: 'checkbox',
		},
		{
			text: 'Ofrecer opcion de envio en la Tienda',
			key: 'has_delivery',
			type: 'checkbox',
		},
		{
			text: 'Cliente envia whatsapp al negocio al finalizar pedido',
			key: 'enviar_whatsapp_al_terminar_pedido',
			type: 'checkbox',
		},

		{
			// Grupo nuevo: login con Google para la tienda online (prompt 588).
			// Antes las credenciales de Google vivian en el .env de tienda-api;
			// se mudan aca para que cada dueño las cargue desde su propio online_configuration
			// (ver prompt 589 para las columnas/backend en empresa-api).
			group_title: 'Login con Google'
		},
		{
			text: 'Activar login con Google en la tienda',
			key: 'google_login_enabled',
			type: 'checkbox',
			description: 'Permite a los clientes iniciar sesion en la tienda usando su cuenta de Google.',
		},
		{
			text: 'Google Client ID',
			key: 'google_client_id',
			type: 'text',
			// No se condiciona la visibilidad al toggle porque el modelo declarativo
			// no soporta mostrar/ocultar un campo segun el valor de otro campo (no existe
			// un "show_when"/"depends_on" en generals.js); por eso queda siempre visible
			// con esta aclaracion en la description.
			description: 'Solo aplica si "Activar login con Google" esta activo. Se obtiene desde Google Cloud Console.',
		},
		{
			text: 'Google Client Secret',
			key: 'google_client_secret',
			type: 'password',
			description: 'Solo aplica si "Activar login con Google" esta activo. Por seguridad no se muestra el valor guardado; dejalo vacio si no queres cambiarlo.',
		},

		{
			group_title: 'Redes sociales'
		},
		{
			text: 'Instagram',
			key: 'instagram',
			type: 'text',
			value: '',
			show: true,
		},
		{
			text: 'Facebook',
			key: 'facebook',
			type: 'text',
			value: '',
			show: true,
		},

		{
			// Grupo nuevo: agrupa las notificaciones por mail relacionadas a pedidos y stock
			// (prompt 384). Va antes del grupo de la casilla SMTP propia porque el orden
			// natural es primero elegir que mails se mandan y despues desde que correo salen.
			group_title: 'Notificaciones por mail'
		},
		{
			text: 'Avisarme por mail cuando entra un pedido nuevo',
			key: 'notificar_pedido_al_negocio',
			type: 'checkbox',
			description: 'Cada vez que un cliente termina una compra en tu tienda online, te llega un mail con el detalle completo del pedido.',
		},
		{
			text: 'Correo donde recibir los avisos de pedidos',
			key: 'mail_notificacion_pedidos',
			type: 'text',
			description: 'Podes poner varios correos separados por coma. Si lo dejas vacio, el aviso se manda al correo de tu cuenta.',
		},
		{
			text: 'Enviarle al cliente un mail confirmando que realizo su pedido',
			key: 'notificar_pedido_al_cliente',
			type: 'checkbox',
			description: 'Cuando termina la compra, el cliente recibe un mail con el detalle de su pedido y los totales.',
		},
		{
			text: 'Avisar por mail cuando ingresa stock de un articulo esperado',
			key: 'avisar_ingreso_stock_por_mail',
			type: 'checkbox',
			description: 'Aplica a los clientes que tocaron "Avisarme cuando este disponible" en un articulo sin stock. Antes esto se configuraba en el servidor; ahora lo manejas vos desde aca.',
		},

		{
			group_title: 'Correo para notificaciones a clientes'
		},
		{
			text: 'Usar mi propio correo',
			key: 'mail_enabled',
			type: 'checkbox',
			// El group_title no soporta un texto propio en el renderer, por eso la aclaracion
			// general del grupo se muestra como description (popover) del primer campo.
			description: 'Este correo se usa para avisarle a tus clientes cuando entra stock de un articulo que estaban esperando, y para el resto de los avisos de la tienda. Si esta desactivado, los mails a tus clientes salen desde el correo del sistema.',
		},
		{
			text: 'Correo',
			key: 'mail_username',
			type: 'text',
			description: 'La casilla desde la que se envian los mails (ej: ventas@tunegocio.com.ar).',
		},
		{
			text: 'Contraseña',
			key: 'mail_password',
			type: 'password',
			description: 'Por seguridad no se muestra la contraseña guardada. Dejalo vacio si no queres cambiarla.',
		},
		{
			text: 'Servidor SMTP',
			key: 'mail_host',
			type: 'text',
			description: 'Ej: smtp.hostinger.com',
		},
		{
			text: 'Puerto',
			key: 'mail_port',
			type: 'number',
			description: 'Normalmente 587 (TLS) o 465 (SSL).',
		},
		{
			text: 'Encriptación',
			key: 'mail_encryption',
			type: 'select',
			options: [
				{ value: 'tls', text: 'TLS' },
				{ value: 'ssl', text: 'SSL' },
				{ value: '', text: 'Ninguna' },
			],
		},
		{
			text: 'Nombre del remitente',
			key: 'mail_from_name',
			type: 'text',
			description: 'Como ve tu cliente el remitente. Si lo dejas vacio, se usa el nombre de tu empresa.',
		},
		{
			text: 'Correo del remitente',
			key: 'mail_from_address',
			type: 'text',
			description: 'Si lo dejas vacio, se usa el mismo correo de arriba.',
		},
	],
	singular_model_name_spanish: 'Configuracion Online',
	plural_model_name_spanish: 'Configuraciones Online',
	create_model_name_spanish: 'Nueva',
	text_delete: 'la',
}
