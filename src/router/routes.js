export default [
	// {
	// 	text: 'Ingresar',
	// 	path: '/ingresar-articulo',
	// 	name: 'ingresar',
	// 	component: '@/views/Ingresar',
	// 	can: 'article.store',
	// },
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
			NO con name 'online' + params: toRoute() (common-vue/mixins/nav.js:141-146)
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
					sus hermanos, por el motivo del comentario de arriba. Es EXACTAMENTE
					la misma pantalla que IA -> Ofertas, un componente en dos entradas.
				*/
				text: 'Promociones',
				name: 'online_promociones',
				function: 'ir_a_online_promociones',
				can: 'buyer.index',
				/*
					Sin este gate, un comercio con la extension `online` pero SIN el motor
					de ofertas ve la entrada en el menu, entra, y se come el cartel de
					"este modulo requiere la extension" — o sea que le estamos mostrando
					una funcion que no compro. Su gemela de IA -> Ofertas ya lo tiene, y
					por eso ahi no pasaba. Lo detecto el chequeo independiente del 15/8/2026.
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
	{
		/*
			Módulo padre "IA" (misión "chat IA", 15/8/2026). El `name: 'ia'` es
			EXPLÍCITO y propio: openItem del NavVertical compara contra route.name y
			un padre sin name colisionaría. Va con `function:` y no con `path:`
			porque setRoute() (common-vue/mixins/nav.js:106-140) ejecuta la función
			antes que cualquier otra rama, y así el padre no necesita una ruta
			propia en router/index.js.

			Gate (misión "sugerencias de compra", 15/8/2026): ahora hay DOS hijos con
			extensiones distintas, así que el padre ya NO lleva if_has_extencion
			(showRoute trataría el array como AND, no OR, y dejaría sin ver "IA" a
			quien solo tiene una de las dos). En su lugar lleva
			if_has_alguna_extencion (bloque aditivo de nav.js:showRoute, OR entre
			extensiones) y cada hijo se gatea solo con su propio if_has_extencion.
		*/
		text: 'IA',
		name: 'ia',
		function: 'ir_a_modulo_ia',
		icon: 'stars',
		if_has_alguna_extencion: ['sugerencias_inteligentes', 'sugerencias_compras', 'motor_de_ofertas'],
		childrens: [
			{
				text: 'Sugerencias',
				path: '/sugerencias-de-stock',
				name: 'sugerencias_stock',
				component: '@/views/SugerenciasDeStock',
				// Mismo gateo que usa el backend en check_extencion_empresa: sin la
				// extension, el modulo no aparece en el menu y el flujo viejo de modales
				// del Listado sigue siendo el unico camino.
				if_has_extencion: 'sugerencias_inteligentes',
				icon: 'lightbulb',
			},
			{
				text: 'Compras',
				path: '/sugerencias-de-compra',
				name: 'sugerencias_compra',
				component: '@/views/SugerenciasDeCompra',
				// Extension propia: es funcionalidad vendible aparte, mismo criterio
				// que asistente_ia (PLAN §0-bis R8 / INSUMOS-MEDIDOS.md §12).
				if_has_extencion: 'sugerencias_compras',
				icon: 'cart-plus',
			},
			{
				// La MISMA pantalla que Tienda Online -> Promociones, no dos vistas.
				text: 'Ofertas',
				path: '/ofertas',
				name: 'ofertas',
				component: '@/views/Ofertas',
				if_has_extencion: 'motor_de_ofertas',
				icon: 'tag',
			},
		],
	},
]