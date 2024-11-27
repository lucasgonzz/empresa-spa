export default {
	properties: [
		{
			text: 'Imagen',
			key: 'image_url',
			type: 'image',
		},
		{
			text: 'Nombre',
			key: 'name',
			type: 'text',
			value: '',
			is_title: true,
		},
		{
			text: 'Descargar articulos desde el arranque del sistema',
			key: 'download_articles',
			type: 'checkbox',
			value: 0,
			show: true,
		},
		{
			text: 'N° documento',
			key: 'doc_number',
			type: 'text',
			value: '',
			show: true,
		},
		{ 
			text: 'Nombre de la empresa',
			key: 'company_name',
			type: 'text',
			value: '',
			show: true,
		},
		{
			text: 'Telefono',
			key: 'phone',
			type: 'text',
			value: '',
			show: true,
		},
		{
			text: 'Correo electronico',
			key: 'email',
			type: 'text',
			value: '',
			show: true,
		},
		{
			text: 'Version por defecto',
			key: 'default_version',
			type: 'text',
			not_show: true,
		},
		{
			text: 'Version estable',
			key: 'estable_version',
			type: 'text',
			not_show: true,
		},
		{
			text: 'Iva ya incluido en los precios',
			key: 'iva_included',
			type: 'checkbox',
			description: 'Si se activa, el iva del articulo no impactara en el precio final del mismo',
		},
		{
			text: 'Valor dolar',
			key: 'dollar',
			type: 'text',
		},
		{
			text: 'Preguntar la cantidad en VENDER',
			key: 'ask_amount_in_vender',
			type: 'checkbox',
		},

		{
			text: 'Imprimir cabecera en PDF de articulos',
			key: 'header_articulos_pdf',
			type: 'checkbox',
		},

		{
			text: 'Imagen de cabecera en PDF',
			key: 'image_pdf_header_url',
			type: 'image',
			crop_aspect_ratio: 4/1,
		},

		{
			text: 'Texto para OMITIR en C/C',
			key: 'text_omitir_cc',
			type: 'text',
		},

		{
			text: 'Cantidad de letras del nombre a partir de las cuales buscar en VENDER',
			key: 'str_limint_en_vender',
			type: 'number',
		},
		{
			text: 'Metodo de pago por defecto en VENDER',
			key: 'default_current_acount_payment_method_id',
			type: 'select',
			store: 'current_acount_payment_method',
			description: 'Si se elige, despues de cada venta el valor del metodo de pago se seteara con este valor',
		},

		{
			text: 'Omitir siempre las ventas en la c/c de los clientes',
			key: 'siempre_omitir_en_cuenta_corriente',
			type: 'checkbox',
		},

		{
			text: 'Redondear de a centenas el Total en VENDER',
			key: 'redondear_centenas_en_vender',
			type: 'checkbox',
		},

		{
			text: 'Dias a partir de los cuales ALERTAR a los EMPLEADOS sobre las ventas no cobradas',
			key: 'dias_alertar_empleados_ventas_no_cobradas',
			type: 'number',
		},
		{
			text: 'Dias a partir de los cuales ALERTAR a los ADMINISTRADORES sobre las ventas no cobradas',
			key: 'dias_alertar_administradores_ventas_no_cobradas',
			type: 'number',
		},

		{
			text: 'Descontar stock en los insumos recien cuando se supera el estado de produccion',
			key: 'discount_stock_from_recipe_after_advance_to_next_status',
			type: 'checkbox',
			description: 'Si se activa, los insumos del estado 1 se descontaran cuando el articulo a producir avance al estado 2. Si no se activa, los insumos del estado 1 se descontaran ni bien el articulo a producir llegue al estado 1',
		},
		{
			text: 'Ancho en milimetros de la comandera para imprimir los Tickets de Ventas',
			key: 'sale_ticket_width',
			type: 'number',
		},
		{
			text: 'Descripcion para mostrar en Tickets de Ventas',
			key: 'sale_ticket_description',
			type: 'textarea',
		},
		{
			text: 'Informacion para mostrar en los tickets de los articulos',
			key: 'article_ticket_info_id',
			type: 'select',
		},
		// {
			// text: 'Extenciones',
			// key: 'extencions',
			// type: 'checkbox',
			// store: 'extencion',
			// belongs_to_many: {
			// 	// order_by: 'model_name',
			// }
		// },
		// {
		// 	text: 'Direccion',
		// 	key: 'address',
		// 	type: 'text',
		// 	value: '',
		// 	show: true,
		// },
	],
	singular_model_name_spanish: 'Usuario',
	plural_model_name_spanish: 'Usuarios',
	create_model_name_spanish: 'Nuevo usuario',
	text_delete: 'el',
}