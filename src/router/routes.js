export default [
	// {
	// 	text: 'Ingresar',
	// 	path: '/ingresar-articulo',
	// 	name: 'ingresar',
	// 	component: '@/views/Ingresar',
	// 	can: 'article.store',
	// },
	{
		/*
			Módulo IA: el mostrador (misión "modulo-ia-mostrador", 14/9/2026). Va PRIMERO
			por decisión de Lucas: es el primer ítem de la barra. Reemplaza al módulo IA
			viejo (Sugerencias / Compras / Ofertas), que salió del menú; Promociones sigue
			entrando por Tienda Online.

			Gate doble, y los dos son deliberados: `if_has_extencion: 'asistente_ia'`
			(la misma extensión que gatea el botón flotante del chat y las rutas
			mostrador/* del backend; no se creó una extensión nueva) y
			`check_is_owner: true` (solo el dueño y el acceso maestro ven el módulo,
			decisión 8 del plan; el backend devuelve 403 a un empleado).

			`no_aterrizar: true` es lo que evita que ser el PRIMERO del array lo vuelva
			la pantalla de aterrizaje después del login: redirect() de
			common-vue/mixins/permissions.js elige la primera ruta con permiso y no mira
			extensiones, así que sin esta marca un dueño sin la extensión caía en un
			módulo que el menú le esconde, y el lead de la demo aterrizaba en un mostrador
			vacío. El aterrizaje sigue siendo el de siempre (Reportes).

			La ruta real vive en router/index.js (`/ia/:id?`): el :id opcional es el
			puente desde una conversación del chat hacia su informe.
		*/
		text: 'IA',
		path: '/ia',
		name: 'ia',
		component: '@/views/Ia',
		icon: 'stars',
		if_has_extencion: 'asistente_ia',
		check_is_owner: true,
		no_aterrizar: true,
	},
	{
		text: 'Reportes',
		path: '/reportes',
		component: '@/views/Reportes',
		image_url: 'nav-icons-2/reportes.png',
		icon: 'bar-chart-line',
		// image_url: 'nav-icons/caja.png',
		name: 'reportes',
		can: 'reportes.index',
		params: {
			view: 'estado-de-resultados',
		},
	},
	{
		text: 'Listado',
		path: '/listado-de-articulos',
		model_name: 'article',
		component: '@/views/Listado',
		can: 'article.index',
		image_url: 'nav-icons-2/listado.png',
		icon: 'list-ul',
		// image_url: 'nav-icons/listado.png',
	},
	{
		text: 'Vender',
		path: '/vender',
		name: 'vender',
		component: '@/views/Vender',
		can: 'sale.store',
		params: {
			view: 'remito',
		},
		if_has_extencion: 'comerciocity_interno',
		image_url: 'nav-icons-2/vender.png',
		icon: 'cart-check',
		childrens: [
			{
				path: '/presupuestos',
				model_name: 'budget',
				component: '@/views/Budget',
				can: 'budget.index',
				if_has_extencion: ['budgets', 'comerciocity_interno'],
				image_url: 'nuevos-nav-icons/presupuesto.png',
				icon: 'file-earmark-text',
				// image_url: 'nav-icons/presupuestos.png',
			},
		]
	},
	{
		text: 'Alertas',
		path: '/alertas',
		component: '@/views/Alertas',
		icon: 'bell',
		budget_function: 'alerts_count',
		name: 'alertas',
		params: {
			view: 'cobros',
		},
		childrens: [
			{
				text: 'Agenda',
				path: '/agenda',
				model_name: 'pending',
				component: '@/views/Pending',
				image_url: 'nuevos-nav-icons/agenda.png',
				icon: 'calendar-check',
				can: 'pending.index',
				params: {
					view: 'por-realizar',
				},
			},
		],
	},
	{
		path: '/deposito-para-checkear',
		text: 'Deposito',
		name: 'deposito-para-checkear',
		component: '@/views/DepositoParaCheckear',
		can: 'deposito_para_checkear',
		image_url: 'nav-icons/ventas-to-check.png',
		icon: 'clipboard-check',
		if_has_extencion: 'check_sales',
		params: {
			view: 'para-checkear',
		},
	},
	{
		path: '/deposito-checkeadas',
		text: 'Checkeadas',
		name: 'deposito-checkeadas',
		component: '@/views/DepositoCheckeadas',
		can: 'deposito_checkeadas',
		image_url: 'nav-icons/ventas-checked.png',
		icon: 'patch-check',
		if_has_extencion: 'check_sales',
	},
	{
		path: '/ventas',
		model_name: 'sale',
		component: '@/views/Ventas',
		can: 'sale.index',
		function: 'toSales',
		params: {
			view: 'todas',
			sub_view: 'todos',
		},
		image_url: 'nav-icons-2/ventas.png',
		icon: 'cash-stack',
		childrens: [
			{
				path: '/por-entregar',
				text: 'Por Entregar',
				name: 'por-entregar',
				component: '@/views/PorEntregar',
				// can: 'deposito_checkeadas',
				image_url: 'nuevos-nav-icons/por_entregar.png',
				icon: 'truck',
				if_has_extencion: 'ventas_con_fecha_de_entrega',
				can: 'road_map.index',
				params: {
					view: 'ventas',
				},
			},
			{
				path: '/por-estado',
				text: 'Por Estados',
				name: 'por-estado',
				component: '@/views/PorEstado',
				image_url: 'nuevos-nav-icons/por_entregar.png',
				icon: 'ui-checks-grid',
				if_has_extencion: 'ventas_con_estados',
				params: {
					view: 'ventas',
				},
			},
			{
				text: 'Devoluciones',
				path: '/devoluciones',
				name: 'devoluciones',
				component: '@/views/Devoluciones',
				can: 'devolucion.store', 
				image_url: 'nuevos-nav-icons/devoluciones.png',
				icon: 'arrow-counterclockwise',
			},
		]
	},
	{
		text: 'Ventas',
		path: '/ventas-completas',
		name: 'VentasAll',
		model_name: 'sale',
		component: '@/views/Ventas',
		can: 'sale.index',
		image_url: 'nav-icons-2/ventas.png',
		icon: 'receipt',
		params: {
			view: 'todas',
			sub_view: 'todos',
		},
		not_show: true,
		childrens: [
			{
				text: 'Devoluciones',
				path: '/devoluciones',
				name: 'devoluciones',
				component: '@/views/Devoluciones',
				can: 'devolucion.store', 
				image_url: 'nuevos-nav-icons/devoluciones.png',
				icon: 'arrow-counterclockwise',
				// image_url: 'iconos-reportes/devoluciones.png',
			},
			{
				path: '/por-entregar',
				text: 'Por Entregar',
				name: 'por-entregar',
				component: '@/views/PorEntregar',
				// can: 'deposito_checkeadas',
				image_url: 'nuevos-nav-icons/por_entregar.png',
				icon: 'truck',
				if_has_extencion: 'ventas_con_fecha_de_entrega',
				can: 'road_map.index',
				params: {
					view: 'ventas',
				},
			}
		]
	},
	{
		path: '/rutas',
		text: 'Rutas',
		name: 'rutas',
		component: '@/views/Rutas',
		// can: 'deposito_checkeadas',
		image_url: 'nuevos-nav-icons/rutas.png',
		icon: 'signpost-split',
		if_has_extencion: 'ventas_con_fecha_de_entrega',
		can: 'road_map.terminadas.index',
	},
	// {
	// 	text: 'Devoluciones',
	// 	path: '/devoluciones',
	// 	name: 'devoluciones',
	// 	component: '@/views/Devoluciones',
	// 	can: 'devolucion.store', 
	// 	image_url: 'nuevos-nav-icons/devoluciones.png',
	// 	// image_url: 'iconos-reportes/devoluciones.png',
	// },
	{
		path: '/proveedores',
		model_name: 'provider',
		component: '@/views/Provider',
		can: 'provider.index',
		params: {
			view: 'proveedores',
		},
		if_has_extencion: 'comerciocity_interno',
		image_url: 'nav-icons-2/proveedores.png',
		icon: 'person-badge',
		// image_url: 'nav-icons/proveedores.png',
	},
	{
		path: '/clientes',
		model_name: 'client',
		component: '@/views/Client',
		can: 'client.index',
		params: {
			view: 'clientes',
		},
		if_has_extencion: 'comerciocity_interno',
		image_url: 'nav-icons-2/clientes.png',
		icon: 'people',
		// image_url: 'nav-icons/clientes.png',
	},
	// {
	// 	text: 'Agenda',
	// 	path: '/agenda',
	// 	model_name: 'pending',
	// 	component: '@/views/Pending',
	// 	image_url: 'nuevos-nav-icons/agenda.png',
	// 	can: 'pending.index',
	// 	params: {
	// 		view: 'por-realizar',
	// 	},
	// },
	// {
	// 	path: '/gastos',
	// 	model_name: 'expense',
	// 	component: '@/views/Expense',
	// 	image_url: 'nuevos-nav-icons/gastos.png',
	// 	can: 'expense.index',
	// },
	// {
	// 	text: 'Panel de Control',
	// 	path: '/panel-de-control',
	// 	component: '@/views/PanelDeControl',
	// 	image_url: 'nav-icons/caja.png',
	// 	name: 'panel',
	// 	params: {
	// 		view: 'proveedores',
	// 		sub_view: 'rendimiento-general',
	// 	},
	// },
	// {
	// 	path: '/presupuestos',
	// 	model_name: 'budget',
	// 	component: '@/views/Budget',
	// 	can: 'budget.index',
	// 	if_has_extencion: ['budgets', 'comerciocity_interno'],
	// 	image_url: 'nuevos-nav-icons/presupuesto.png',
	// 	// image_url: 'nav-icons/presupuestos.png',
	// },
	{
		text: 'Tienda Online',
		name: 'online',
		path: '/online',
		component: '@/views/Online',
		params: {
			view: 'pedidos',
		},
		/*
			Clic en el padre estando en Clientes/Cupones/Promociones vuelve a Pedidos. Sin este
			flag toRoute() corta por tener el mismo name 'online' (ver debeIrAParamsDeLaRuta en
			common-vue/mixins/nav.js).
		*/
		volver_a_params: true,
		if_has_extencion: 'online',
		can: [
			'order.index',
			'buyer.index',
		],
		/* Badge: pedidos sin confirmar (Mensajes quedó oculto; ver online_menu_alert_count) */
		budget_function: 'online_menu_alert_count',
		image_url: 'nuevos-nav-icons/online.png',
		icon: 'shop',
		// image_url: 'nav-icons/tienda.png',
		/*
			Las secciones se navegan desde acá porque Online.vue ya no monta su nav
			horizontal (misión "chat IA", 15/8/2026). Los hijos van con `function:` y
			NO con name 'online' + params: toRoute() (common-vue/mixins/nav.js)
			corta con `if (route_name == this.route_name) return`, así que un hijo
			llamado 'online' no navegaría nunca estando ya adentro de /online — que es
			justo el caso de uso. Costo conocido y cosmético: los hijos no se pintan
			"activos" (isActiveRoute compara contra route_name).
		*/
		childrens: [
			{
				text: 'Clientes',
				name: 'online_clientes',
				function: 'ir_a_online_clientes',
				can: 'buyer.index',
				icon: 'people',
			},
			{
				text: 'Cupones',
				name: 'online_cupones',
				function: 'ir_a_online_cupones',
				can: 'cupon.index',
				icon: 'ticket-perforated',
			},
			{
				/*
					Promociones (motor de ofertas, 15/8/2026): va con `function:` como
					sus hermanos, por el motivo del comentario de arriba. Desde la misión
					"modulo-ia-mostrador" (14/9/2026) es la ÚNICA entrada del menú a esa
					pantalla: la gemela IA -> Ofertas se fue con el módulo IA viejo. La
					ruta /ofertas/:id? de router/index.js sigue existiendo (la usa el
					puente "Ver las ofertas sugeridas" del chat).
				*/
				text: 'Promociones',
				name: 'online_promociones',
				function: 'ir_a_online_promociones',
				can: 'buyer.index',
				/*
					Sin este gate, un comercio con la extension `online` pero SIN el motor
					de ofertas ve la entrada en el menu, entra, y se come el cartel de
					"este modulo requiere la extension" — o sea que le estamos mostrando
					una funcion que no compro. Lo detecto el chequeo independiente del 15/8/2026.
				*/
				if_has_extencion: 'motor_de_ofertas',
				icon: 'tag',
			},
		],
	},
	{
		text: 'WhatsApp',
		name: 'whatsapp',
		path: '/whatsapp',
		component: '@/views/Whatsapp',
		// Solo visible con la extensión 'whatsapp' activa (mismo gateo que usa el backend en check_extencion_empresa).
		if_has_extencion: 'whatsapp',
		icon: 'whatsapp',
	},
	{
		text: 'Tienda Nube',
		name: 'tienda_nube',
		path: '/tienda-nube',
		component: '@/views/TiendaNube',
		params: {
			view: 'pedidos',
		},
		if_has_extencion: 'usa_tienda_nube',
		/* Badge que muestra la cantidad de sincronizaciones fallidas con Tienda Nube */
		budget_function: 'tn_failed_syncs_count',
		// can: [
		// 	'order.index',
		// 	'buyer.index',
		// ],
		image_url: 'nuevos-nav-icons/tienda_nube.png',
		icon: 'cloud',
		// image_url: 'nav-icons/tienda.png',
	},
	{
		text: 'MercadoLibre',
		name: 'mercado_libre',
		path: '/mercado-libre',
		component: '@/views/MercadoLibre',
		params: {
			view: 'pedidos',
		},
		if_has_extencion: 'usa_mercado_libre',
		can: [
			'mercado_libre.orders',
		],
		image_url: 'nav-icons/mercado_libre.png',
		icon: 'bag',
	},
	// {
	// 	text: 'Produccion',
	// 	path: '/produccion',
	// 	name: 'produccion',
	// 	component: '@/views/Produccion',
	// 	can: 'produccion.index',
	// 	function: 'toProduccion',
	// 	if_has_extencion: ['production', 'comerciocity_interno'],
	// 	can: [
	// 		'production_movement.index',
	// 		'order_production.index',
	// 		'recipe.index',
	// 	],
	// 	image_url: 'nuevos-nav-icons/produccion.png',
	// },
	{
		text: 'ProduccionV2',
		path: '/produccionV2',
		name: 'produccionV2',
		component: '@/views/ProduccionV2',
		can: 'produccion.index',
		if_has_extencion: ['production', 'comerciocity_interno', 'productionV2'],
		params: {
			view: 'lotes-de-produccion',
		},
		// can: [
		// 	'production_movement.index',
		// 	'order_production.index',
		// 	'recipe.index',
		// ],
		image_url: 'nuevos-nav-icons/produccion.png',
		icon: 'gear-wide-connected',
	},
	{
		text: 'Tesoreria',
		path: '/cajas',
		name: 'caja',
		model_name: 'caja',
		component: '@/views/Caja',
		// if_has_extencion: 'cajas',
		image_url: 'nuevos-nav-icons/cajas.png',
		icon: 'wallet2',
		// image_url: 'nav-icons/cajas.png',
		call_models_always: true,
		can: 'caja.index',
		childrens: [
			{
				path: '/gastos',
				model_name: 'expense',
				component: '@/views/Expense',
				image_url: 'nuevos-nav-icons/gastos.png',
				icon: 'cash-coin',
				can: 'expense.index',
			},
			{
				/*
					Misión cheques-endoso-y-bancos (21/9/2026): el módulo de Cheques vivía en
					Reportes y pasa acá, debajo de Gastos, por pedido de Lucas. El permiso sigue
					siendo `reportes.cheques` (decisión 3 del plan): los empleados que ya lo tenían
					lo ven en el lugar nuevo sin seeder ni tarea manual.

					Sin `model_name` a propósito: setRoute() del menú llenaría el store con
					`cheque/getModels` y lo trataría como una lista, pero GET cheque devuelve los
					cheques agrupados por tipo y estado. El store lo llena views/Cheques.vue.
				*/
				text: 'Cheques',
				path: '/cheques',
				name: 'cheque',
				component: '@/views/Cheques',
				icon: 'journal-check',
				can: 'reportes.cheques',
				params: {
					sub_view: 'recibido',
					sub_sub_view: 'pendientes',
				},
			},
		]
	},
	{
		text: 'ABM',
		name: 'abm',
		params: {
			view: 'articulos',
			sub_view: 'categorias',
			model_name: 'category',
		},
		can: 'abm',
		image_url: 'nav-icons-2/abm.png',
		icon: 'sliders',
		// image_url: 'nav-icons/abm.png',
		childrens: [
			{
				model_name: 'employee',
				name: 'employee',
				path: '/empleados',
				component: '@/common-vue/views/Employee',
				check_is_owner: true,
				if_has_extencion: 'comerciocity_interno',
				image_url: 'nuevos-nav-icons/empleados.png',
				icon: 'person-workspace',
				// image_url: 'nav-icons/empleados.png',
			},
			{
				text: 'Papelera',
				path: '/papelera',
				name: 'papelera',
				params: {
					view: 'articulos',
				},
				component: '@/views/Papelera',
				image_url: 'nuevos-nav-icons/papelera.png',
				icon: 'trash',
				// image_url: 'nav-icons/papelera.png',
				check_is_owner: true,
			},
		]
	},
	{
		text: 'Comprobantes',
		path: '/comprobantes',
		name: 'comprobantes',
		component: '@/views/Comprobantes',
		image_url: 'nuevos-nav-icons/comprobantes.png',
		icon: 'file-earmark-text',
		// image_url: 'nav-icons/comprobantes.png',
		params: {
			view: 'notas-de-credito',
		},
	},
	{
		text: 'Cons. Precios',
		path: '/consultora-de-precios',
		name: 'consultora_de_precios',
		component: '@/views/ConsultoraDePrecios',
		if_has_extencion: 'consultora_de_precios',
		image_url: 'nav-icons/consulta_precios.png',
		icon: 'graph-up-arrow',
	},
]