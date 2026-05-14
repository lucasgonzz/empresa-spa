export default {
	properties: [
		{
			group_title: 'Datos del dueño',
		},
		{
			text: 'Nombre',
			key: 'name',
			type: 'text',
			value: '',
			is_title: true,
		},
		{
			text: 'N° documento',
			key: 'doc_number',
			type: 'text',
			value: '',
			show: true,
		},


		{
			group_title: 'Informacion publica del negocio',
		},
		{
			text: 'Imagen',
			key: 'image_url',
			type: 'image',
		},
		// {
		// 	text: 'Descargar articulos desde el arranque del sistema',
		// 	key: 'download_articles',
		// 	type: 'checkbox',
		// 	value: 0,
		// 	show: true,
		// },
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
			group_title: 'Configuracion de precios',
		},
		{
			text: 'Valor dolar',
			key: 'dollar',
			type: 'text',
		}, 
		{
			text: 'Cotizar precios en dolares',
			key: 'cotizar_precios_en_dolares',
			type: 'checkbox',
			descriptions:
			[
			 	'Se se activa, los costos en dolares se cotizaran a peso para obtener el precio final en pesos',
			],
		}, 
		{
			text: 'Aplicar el iva al costo',
			key: 'aplicar_iva_al_costo',
			type: 'checkbox',
			descriptions:
			[
			 	'Si se desactiva, el iva del articulo se sumara luego del margen de ganancia',
			],
		},
		/*
		 * Si está activo, al calcular costos en ventas se aplican descuentos y recargos del pedido (SaleHelper).
		 */
		{
			text: 'Aplicar descuentos y recargos de la venta al costo',
			key: 'aplicar_descuentos_de_venta_a_costos',
			type: 'checkbox',
			value: 0,
			descriptions:
			[
				'Si se activa, los porcentajes de descuento y recargo de la venta modifican el costo usado en el cálculo.',
			],
		},
		{
			text: 'Trabajar con listas de precio (margen por lista)',
			key: 'listas_de_precio',
			type: 'checkbox',
			value: 0,
			descriptions:
			[
			 	'Si se activa, cada articulo un precio final para cada lista de precio que haya creada.',
			],
		},
		{
			text: 'Redondear precios de a centenas',
			key: 'redondear_centenas_en_vender',
			type: 'checkbox',
		},
		/*
		 * Configuraciones de redondeo adicionales usadas por el backend al calcular precios finales.
		 */
		{
			text: 'Redondear precios en decenas',
			key: 'redondear_precios_en_decenas',
			type: 'checkbox',
		},
		{
			text: 'Redondear precios de a 50',
			key: 'redondear_de_a_50',
			type: 'checkbox',
		},
		{
			text: 'Redondear precios en centavos',
			key: 'redondear_precios_en_centavos',
			type: 'checkbox',
		},
		/*
		 * Permite que el usuario trabaje con artículos que tengan `provider_code` repetido.
		 * Si está activo, al crear un artículo se omite el chequeo automático de repetidos por `provider_code`.
		 */
		{
			text: 'Permitir codigos de proveedor repetidos en articulos',
			key: 'usa_provider_codes_repetidos',
			type: 'checkbox',
			value: 0,
			descriptions:
			[
			 	'Si se activa, el sistema permitira crear articulos con el mismo codigo de proveedor.',
			],
		},
		{
			text: 'Aplicar los descuentos y recargos en los articulos antes del margen de ganancia',
			key: 'aplicar_descuentos_en_articulos_antes_del_margen_de_ganancia',
			type: 'checkbox',
		}, 
		{
			text: 'Margen de ganancia global',
			key: 'percentage_gain',
			type: 'number',
		},



		{
			group_title: 'Configuracion de versiones',
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
			text: 'Versión del sistema (sincronización admin)',
			key: 'version_name',
			type: 'text',
			only_show: true,
		},

		

		{
			group_title: 'Modulo de VENDER',
		},
		{
			text: 'Preguntar la cantidad en VENDER',
			key: 'ask_amount_in_vender',
			type: 'checkbox',
		},
		{
			text: 'Utilizar articulos descargados para buscar por codigo de barras',
			key: 'usar_articles_cache',
			type: 'checkbox',
		},
		/*
		 * Permite habilitar o deshabilitar el trabajo en modo offline del sistema.
		 * Si está desactivado, no se ejecuta la sincronización local de artículos/ventas.
		 */
		{
			text: 'Permitir trabajar en modo offline',
			key: 'sync_offline_articles',
			type: 'checkbox',
		},
		{
			text: 'Metodo de pago por defecto en VENDER',
			key: 'default_current_acount_payment_method_id',
			type: 'select',
			store: 'current_acount_payment_method',
			descriptions:
			[
			 	'Si se elige, despues de cada venta el valor del metodo de pago se seteara con este valor',
			],
		},
		{
			text: 'Omitir siempre las ventas en la c/c de los clientes',
			key: 'siempre_omitir_en_cuenta_corriente',
			type: 'checkbox',
		},
		{
			text: 'Texto para OMITIR en C/C',
			key: 'text_omitir_cc',
			type: 'text',
		},




		{
			group_title: 'Modulo de VENTAS',
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
			text: 'Clave para poder eliminar un articulo en VENDER',
			key: 'clave_eliminar_article',
			type: 'text',
		},
		{
			text: 'Direccion comercial para mostrar en los comprobantes de venta',
			key: 'address_company',
			descriptions: [
				'Si completa este dato, se mostrara siempre en todos los comprobantes de venta',
				'Si trabaja con sucursales, se mostrara junto con la direccion de la sucursal de donde se hizo la venta',
			],
			type: 'text',
		},

		{
			text: 'Tamaño en mm del logo en PDF',
			key: 'pdf_image_size',
			type: 'number',
		},
		{
			text: 'Mostrar la direccion de todas las sucursales en los comprobantes de venta',
			key: 'all_addresses_in_sale_pdf',
			type: 'checkbox',
		},
		{
			text: 'Mostrar el nombre del empleado que realizo la venta en los PDF de las ventas',
			key: 'mostrar_vendedor_en_venta_pdf',
			type: 'checkbox',
		},




		{
			group_title: 'Modulo de LISTADO',
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
			text: 'Informacion para mostrar en los tickets de los articulos',
			key: 'article_ticket_info_id',
			type: 'select',
		},
		{
			text: 'Tiempo de espera para seleccionar imagen automaticamente',
			key: 'img_auto_timeout',
			type: 'number',
		},



		{
			group_title: 'Interfaz',
		},
		{
			text: 'Tamaño de los componentes',
			key: 'inputs_size_id',
			type: 'select',
			store: 'inputs_size',
			descriptions:
			[
			 	'Controla el tamaño de los inputs, fuentes, márgenes y paddings de la interfaz',
			],
		},


		{
			group_title: 'Generales',
		},
		{
			text: 'C/C Ultimas arriba',
			key: 'cc_ultimas_arriba',
			type: 'checkbox',
			descriptions:
			[
			 	'Se se activa, las cuentas corrientes se listaran comenzando con las mas recientes',
			],
		}, 
		{
			text: 'Scroll automatico en tablas',
			key: 'scroll_en_tablas',
			type: 'checkbox',
		},
		{
			text: 'Mostrar stocks minimos al ingresar al sistema',
			key: 'show_stock_min_al_iniciar',
			type: 'checkbox',
		},
		{
			text: 'Mostrar errores de facturacion al ingresar al sistema',
			key: 'show_afip_errors_al_iniciar',
			type: 'checkbox',
		},

		// {
		// 	text: 'Cantidad de letras del nombre a partir de las cuales buscar en VENDER',
		// 	key: 'str_limint_en_vender',
		// 	type: 'number',
		// },



		{
			group_title: 'Alertas',
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
			group_title: 'Produccion',
		},
		{
			text: 'Descontar stock en los insumos recien cuando se supera el estado de produccion',
			key: 'discount_stock_from_recipe_after_advance_to_next_status',
			type: 'checkbox',
			descriptions:
			[
			 	'Si se activa, los insumos del estado 1 se descontaran cuando el articulo a producir avance al estado 2. Si no se activa, los insumos del estado 1 se descontaran ni bien el articulo a producir llegue al estado 1',
			],
			if_has_extencion: 'production',
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