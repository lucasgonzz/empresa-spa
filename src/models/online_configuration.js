export default {
	properties: [
		{
			text: 'Precios en la Tienda',
			key: 'online_price_type_id',
			type: 'select',
		},
		{
			text: 'Registrarse para comprar',
			key: 'register_to_buy',
			type: 'checkbox',
		},
		{
			text: 'Scroll infinito en el Inicio',
			key: 'scroll_infinito_en_home',
			type: 'checkbox',
		},
		{
			text: 'Guardar venta despues de entregar Pedido',
			key: 'save_sale_after_finish_order',
			description: 'Si se activa, se descontara el stock despues de confirmar un pedido, y se generara la venta una vez entregado',
			type: 'checkbox',
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
			text: 'Nota para los pedidos',
			key: 'order_description',
			type: 'textarea',
			value: '',
			show: true,
		},
		{
			text: 'Quienes somos',
			key: 'quienes_somos',
			type: 'textarea',
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
			text: 'Ofrecer opcion de envio en la Tienda',
			key: 'has_delivery',
			type: 'checkbox',
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
			text: 'Imagen por defecto para los articulos sin Imagenes',
			key: 'default_article_image_url',
			type: 'image',
		},
		{
			text: 'Recargos a los precios en la Tienda',
			key: 'online_price_surchage',
			type: 'number',
		},
		{
			text: 'Pausar la Tienda Online',
			key: 'pausar_tienda_online',
			type: 'checkbox',
			description: 'Si se pausa la tienda online, no se mostrara el contenido de la misma y se informara al usuario.',
		},
	],
	singular_model_name_spanish: 'Configuracion Online',
	plural_model_name_spanish: 'Configuraciones Online',
	create_model_name_spanish: 'Nueva',
	text_delete: 'la',
}