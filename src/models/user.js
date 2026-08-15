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
			// Grupo 231, prompt 06: con la dinamica nueva de costeo por condicion fiscal activa
			// (usar_condicion_fiscal_en_costeo) esta tilde ya no tiene ningun efecto (ver grupo 231,
			// prompt 02), asi que se oculta del formulario para que el cliente no la toque creyendo
			// que hace algo.
			v_if_function: 'ocultar_aplicar_iva_al_costo_si_usa_condicion_fiscal_v_if_function',
		},
		// Grupo 231, prompt 06: condicion de IVA de la cuenta. Determina como se calculan los
		// costos cuando la dinamica nueva (ver siguiente propiedad) esta activa.
		{
			text: 'Condicion de IVA',
			key: 'condicion_iva_precios',
			type: 'select',
			options: [
				{text: 'Responsable Inscripto', value: 'RRII'},
				{text: 'Monotributista', value: 'MT'},
			],
			descriptions: [
				'Determina como se calculan los costos. Un Monotributista no recupera el IVA de sus compras, asi que el IVA forma parte del costo. Un Responsable Inscripto lo recupera, asi que el IVA se suma al momento de vender.',
			],
			// Simetrico de la tilde historica de arriba: con el checkbox de abajo apagado, este
			// select no gobierna nada (iva_va_al_costo() resuelve por aplicar_iva_al_costo y la
			// condicion fiscal se ignora), asi que se oculta en vez de dejarlo a la vista invitando
			// a tocarlo. Mismo mecanismo de v_if_function, no uno nuevo.
			v_if_function: 'mostrar_condicion_iva_si_usa_condicion_fiscal_v_if_function',
		},
		// Grupo 231, prompt 06: activa la dinamica de costeo por condicion fiscal (grupo 231,
		// prompt 02) en reemplazo de la tilde historica "aplicar_iva_al_costo".
		{
			text: 'Calcular costos segun la condicion de IVA',
			key: 'usar_condicion_fiscal_en_costeo',
			type: 'checkbox',
			descriptions: [
				'Si se activa, el sistema calcula los costos y los precios segun la condicion de IVA indicada arriba, en lugar de la configuracion historica de esta cuenta.',
				'Al cambiar esta opcion se recalculan los precios de todos los articulos. El costo real de los articulos va a cambiar y los precios finales pueden moverse. No la actives sin haber hablado antes con el equipo de ComercioCity.',
			],
		},
		/*
		 * Prompt 266 (Fase 2, Capa 3): modo "precio de etiqueta incluye la tarjeta mas cara".
		 * Si esta activo, el precio final del articulo (el que se muestra en LISTADO y VENDER) ya
		 * tiene incorporado el recargo del metodo de pago mas caro configurado. Al elegir un metodo
		 * de pago en VENDER, se muestra el precio ajustado para ese metodo y su descuento respecto
		 * del precio de etiqueta (por ejemplo, elegir "Efectivo" muestra un precio menor con su
		 * porcentaje de descuento). Si esta desactivado, el comportamiento es el de siempre: precio
		 * base + recargo del metodo de pago elegido.
		 */
		{
			text: 'El precio de etiqueta ya incluye el recargo de la tarjeta mas cara',
			key: 'precio_base_incluye_tarjeta',
			type: 'checkbox',
			value: 0,
			descriptions:
			[
				'Si se activa, el precio final del articulo ya incluye el recargo del metodo de pago mas caro configurado.',
				'En VENDER, al elegir un metodo de pago se muestra el precio ajustado y el descuento respecto del precio de etiqueta.',
				'Si se desactiva, el precio final es el base y el recargo del metodo de pago elegido se suma aparte (comportamiento actual).',
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
		/*
		 * Tarea 4 — las cuatro tildes de redondeo (centenas, decenas, de a 50 y centavos) se
		 * reemplazaron por este unico select. Las cinco columnas booleanas siguen existiendo en la
		 * base y siguen siendo lo que lee ArticleHelper::redondear(): el select es una fachada que
		 * las lee (accessor modo_redondeo del modelo User) y las escribe (UserController@update).
		 *
		 * No se colapsaron a una columna nueva a proposito: hay clientes con dos flags prendidos, y
		 * como el backend los encadena, esa combinacion da un resultado que ningun valor unico
		 * representa. A esos se les muestra "Combinacion personalizada" y no se les toca nada hasta
		 * que elijan otra opcion.
		 */
		{
			text: 'Opciones de redondeo',
			key: 'modo_redondeo',
			type: 'select',
			// options: [] intencional (mismo patron que sale_factura_print_option en este archivo y
			// que address.default_afip_information_id): FieldSelectInput monta el componente
			// generico de relacion cuando typeof prop.options == 'undefined', y esta key no es un
			// "*_id". Las opciones reales las calcula dynamic_options_function en tiempo real.
			options: [],
			dynamic_options_function: 'get_modo_redondeo_options',
			descriptions:
			[
				'Define como se redondean los precios finales de venta.',
				'Se aplica al recalcular los precios: al elegir una opcion distinta se vuelven a calcular los precios de todos los articulos.',
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
			text: 'PDF a imprimir al presionar "Imprimir" en la factura ARCA de la venta',
			key: 'sale_factura_print_option',
			type: 'select',
			// options: [] vacío es intencional: evita que FieldSelectInput monte el
			// componente genérico de relación (que espera una clave "*_id"). Las
			// opciones reales las calcula dynamic_options_function en tiempo real.
			options: [],
			dynamic_options_function: 'get_sale_factura_print_options',
			v_if_function: 'is_owner_v_if_function',
			descriptions: [
				'Aplica a TODOS los usuarios del sistema, no solo al dueño.',
				'Sin elegir ninguno, se imprime el ticket común (comportamiento de siempre).',
			],
		},



		{
			group_title: 'Configuración del ticket de venta',
		},
		// Ancho de la comandera para imprimir tickets de venta, ajustado por el usuario.
		{
			text: 'Ancho en milimetros de la comandera para imprimir los Tickets de Ventas',
			key: 'sale_ticket_width',
			type: 'number',
		},
		// Descripción personalizada a mostrar en los tickets de venta.
		{
			text: 'Descripcion para mostrar en Tickets de Ventas',
			key: 'sale_ticket_description',
			type: 'textarea',
		},
		// Tamaño de letra del nombre del artículo en el ticket de venta.
		// Se ajusta automáticamente entre 8 y 16 puntos.
		{
			text: 'Tamaño de letra del nombre del artículo en el ticket',
			key: 'sale_ticket_name_font_size',
			type: 'number',
			descriptions: [
				'Valor recomendado: 12.',
				'Se ajusta automáticamente entre 8 y 16.',
			],
		},
		// Tamaño de letra de los precios (unitario y total) en el ticket de venta.
		// Los precios siempre se imprimen en negrita.
		{
			text: 'Tamaño de letra de los precios (unitario y total) en el ticket',
			key: 'sale_ticket_price_font_size',
			type: 'number',
			descriptions: [
				'Los precios siempre se imprimen en negrita.',
				'Valor recomendado: 10. Se ajusta entre 8 y 14.',
			],
		},
		// Controla si el logo ocupa todo el ancho del ticket o aparece en un lado.
		// Cuando está activado, el logo ocupa todo el ancho y los datos de la empresa van debajo.
		// Cuando está desactivado, el logo va a la izquierda y los datos a la derecha.
		{
			text: 'El logo ocupa todo el ancho del ticket',
			key: 'sale_ticket_logo_full_width',
			type: 'checkbox',
			descriptions: [
				'Activado: el logo se muestra a todo el ancho y los datos de la empresa quedan debajo.',
				'Desactivado: el logo va a la izquierda y los datos a la derecha (como hasta ahora).',
			],
		},




		{
			group_title: 'Modulo de LISTADO',
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
			text: 'Minutos de duracion del reporte de inventario',
			key: 'duracion_reporte_inventario',
			type: 'number',
			descriptions: [
				'Cada cuantos minutos se vuelve a calcular el reporte de inventario y las alertas de stock minimo. Si tenes muchos articulos, conviene un valor alto: el calculo se hace en segundo plano y puede tardar varios minutos.',
			],
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
			group_title: 'Sugerencias inteligentes de stock',
		},
		/*
		 * Configuracion de la extension 'sugerencias_inteligentes': periodicidad de la
		 * generacion automatica y valores por defecto de cada sugerencia (los usa la
		 * corrida automatica y precargan el form de "Nueva sugerencia" de la vista
		 * propia). Persisten en columnas sugerencias_* de users via UserController@update,
		 * el mismo camino que usar_condicion_fiscal_en_costeo. Sin la extension, el
		 * grupo entero desaparece de Configuracion general.
		 */
		{
			text: 'Generar sugerencias automaticamente',
			key: 'sugerencias_periodicidad',
			type: 'select',
			options: [
				{text: 'Nunca', value: 'nunca'},
				{text: 'Todos los dias', value: 'diaria'},
				{text: 'Una vez por semana', value: 'semanal'},
				{text: 'Cada quince dias', value: 'quincenal'},
				{text: 'Una vez por mes', value: 'mensual'},
			],
			if_has_extencion: 'sugerencias_inteligentes',
			descriptions: [
				'El sistema genera solo una sugerencia de movimientos de stock con la frecuencia que elijas, a la madrugada, usando los valores por defecto de abajo.',
				'Cuando la sugerencia queda lista te llega una notificacion para abrirla con un click.',
				'Con "Nunca", las sugerencias se generan unicamente a mano desde la pantalla de sugerencias.',
			],
		},
		{
			text: 'Objetivo por defecto',
			key: 'sugerencias_modo',
			type: 'select',
			options: [
				{text: 'Minimo', value: 'minimo'},
				{text: 'Ideal', value: 'ideal'},
				{text: 'Maximo', value: 'maximo'},
			],
			if_has_extencion: 'sugerencias_inteligentes',
			descriptions: [
				'Hasta donde completar el stock de cada deposito en las sugerencias generadas automaticamente (y como valor inicial al crear una a mano).',
				'MINIMO: sugiere stock solo para los depositos que estan por debajo de su stock minimo.',
				'IDEAL: lleva cada deposito a su valor ideal, calculado como (minimo + maximo) / 2.',
				'MAXIMO: lleva cada deposito hasta su stock maximo definido.',
			],
		},
		{
			text: 'Eleccion del origen por defecto',
			key: 'sugerencias_origen',
			type: 'select',
			options: [
				{text: 'Absoluto', value: 'absoluto'},
				{text: 'Relativo', value: 'relativo'},
			],
			if_has_extencion: 'sugerencias_inteligentes',
			descriptions: [
				'Como elegir el deposito desde el cual mover stock cuando no hay depositos de origen designados (o para desempatar entre ellos).',
				'ABSOLUTO: el deposito con mayor cantidad de stock en total.',
				'RELATIVO: el deposito mas lleno respecto de su propio stock maximo.',
			],
		},
		{
			text: 'Limite del origen por defecto',
			key: 'sugerencias_limite_origen',
			type: 'select',
			options: [
				{text: 'Minimo', value: 'minimo'},
				{text: 'Ideal', value: 'ideal'},
				{text: 'Sin limite', value: 'sin_limite'},
			],
			if_has_extencion: 'sugerencias_inteligentes',
			descriptions: [
				'Hasta donde permitir vaciar el deposito origen al sugerir movimientos.',
				'MINIMO: no se mueve stock si eso deja al origen por debajo de su stock minimo.',
				'IDEAL: se puede vaciar el origen hasta su nivel ideal.',
				'SIN LIMITE: se puede mover todo el stock necesario, aunque el origen quede vacio.',
			],
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