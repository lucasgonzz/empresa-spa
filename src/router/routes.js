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
		image_url: 'nav-icons/caja.png',
		name: 'reportes',
		can: 'reportes.index',
		params: {
			view: 'generales',
		},
	},
	{
		text: 'Listado',
		path: '/listado-de-articulos',
		model_name: 'article',
		component: '@/views/Listado',
		can: 'article.index',
		image_url: 'nav-icons/listado.png',
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
		image_url: 'nav-icons/vender.png',
	},
	{
		text: 'Alertas',
		path: '/alertas',
		component: '@/views/Alertas',
		budget_function: 'alerts_count',
		name: 'alertas',
		params: {
			view: 'cobros',
		},
	},
	{
		path: '/deposito-para-checkear',
		text: 'Deposito',
		name: 'deposito-para-checkear',
		component: '@/views/DepositoParaCheckear',
		can: 'deposito_para_checkear',
		image_url: 'nav-icons/ventas-to-check.png',
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
		image_url: 'nav-icons/ventas.png',
	},
	{
		text: 'Ventas',
		path: '/ventas-completas',
		name: 'VentasAll',
		model_name: 'sale',
		component: '@/views/Ventas',
		can: 'sale.index',
		params: {
			view: 'todas',
			sub_view: 'todos',
		},
		not_show: true,
	},
	{
		text: 'Devoluciones',
		path: '/devoluciones',
		name: 'devoluciones',
		component: '@/views/Devoluciones',
		can: 'devolucion.store', 
		image_url: 'iconos-reportes/devoluciones.png',
	},
	{
		path: '/proveedores',
		model_name: 'provider',
		component: '@/views/Provider',
		can: 'provider.index',
		params: {
			view: 'proveedores',
		},
		if_has_extencion: 'comerciocity_interno',
		image_url: 'nav-icons/proveedores.png',
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
		image_url: 'nav-icons/clientes.png',
	},
	{
		text: 'Agenda',
		path: '/agenda',
		model_name: 'pending',
		component: '@/views/Pending',
		image_url: 'nav-icons/pendings.png',
		can: 'pending.index',
		params: {
			view: 'por-realizar',
		},
	},
	{
		path: '/gastos',
		model_name: 'expense',
		component: '@/views/Expense',
		image_url: 'nav-icons/expenses.png',
		can: 'expense.index',
	},
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
	{
		path: '/presupuestos',
		model_name: 'budget',
		component: '@/views/Budget',
		can: 'budget.index',
		if_has_extencion: ['budgets', 'comerciocity_interno'],
		image_url: 'nav-icons/presupuestos.png',
	},
	{
		text: 'Online',
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
		image_url: 'nav-icons/tienda.png',
	},
	{
		text: 'MercadoLibre',
		name: 'mercado_libre',
		path: '/mercado-libre',
		component: '@/views/MercadoLibre',
		params: {
			view: 'pedidos',
		},
		if_has_extencion: 'mercado_libre',
		can: [
			'mercado_libre.orders',
		],
		image_url: 'nav-icons/mercado_libre.png',
	},
	{
		text: 'Produccion',
		path: '/produccion',
		name: 'produccion',
		component: '@/views/Produccion',
		can: 'produccion.index',
		function: 'toProduccion',
		if_has_extencion: ['production', 'comerciocity_interno'],
		can: [
			'production_movement.index',
			'order_production.index',
			'recipe.index',
		],
		image_url: 'nav-icons/produccion.png',
	},
	{
		text: 'Cajas',
		path: '/cajas',
		name: 'caja',
		model_name: 'caja',
		component: '@/views/Caja',
		if_has_extencion: 'cajas',
		image_url: 'nav-icons/cajas.png',
		call_models_always: true,
		can: 'caja.index',
	},
	{
		text: 'ABM',
		name: 'abm',
		params: {
			view: 'listado',
			sub_view: 'categorias',
			model_name: 'category',
		},
		can: 'abm',
		image_url: 'nav-icons/abm.png',
	},
	{
		model_name: 'employee',
		name: 'employee',
		path: '/empleados',
		component: '@/common-vue/views/Employee',
		check_is_owner: true,
		if_has_extencion: 'comerciocity_interno',
		image_url: 'nav-icons/empleados.png',
	},
	{
		text: 'Comprobantes',
		path: '/comprobantes',
		name: 'comprobantes',
		component: '@/views/Comprobantes',
		image_url: 'nav-icons/comprobantes.png',
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
	},
	{
		text: 'Papelera',
		path: '/papelera',
		name: 'papelera',
		params: {
			view: 'articulos',
		},
		component: '@/views/Papelera',
		image_url: 'nav-icons/papelera.png',
		check_is_owner: true,
	},
]