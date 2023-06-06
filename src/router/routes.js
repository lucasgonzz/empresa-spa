export default [
	// {
	// 	text: 'Ingresar',
	// 	path: '/ingresar-articulo',
	// 	name: 'ingresar',
	// 	component: '@/views/Ingresar',
	// 	can: 'article.store',
	// },
	{
		text: 'Listado',
		path: '/listado-de-articulos',
		name: 'article',
		model_name: 'article',
		component: '@/views/Listado',
		can: 'article.index',
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
	},
	{
		text: 'Ventas',
		path: '/ventas',
		name: 'sale',
		model_name: 'sale',
		component: '@/views/Ventas',
		can: 'sale.index',
		params: {
			view: 'todas',
			sub_view: 'todos',
		}
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
		text: 'Proveedores',
		path: '/proveedores',
		model_name: 'provider',
		name: 'provider',
		component: '@/views/Provider',
		can: 'provider.index',
		params: {
			view: 'proveedores',
		},
		if_has_extencion: 'comerciocity_interno',
	},
	{
		text: 'Clientes',
		path: '/clientes',
		model_name: 'client',
		name: 'client',
		component: '@/views/Client',
		can: 'client.index',
		params: {
			view: 'clientes',
		},
		if_has_extencion: 'comerciocity_interno',
	},
	{
		text: 'Presupuestos',
		path: '/presupuestos',
		model_name: 'budget',
		name: 'budget',
		component: '@/views/Budget',
		can: 'budget.index',
		if_has_extencion: ['budgets', 'comerciocity_interno'],
	},
	{
		text: 'Produccion',
		path: '/produccion',
		name: 'produccion',
		component: '@/views/Produccion',
		can: 'produccion.index',
		params: {
			view: 'ordenes',
		},
		if_has_extencion: ['production', 'comerciocity_interno'],
		can: [
			'production_movement',
			'order_production',
			'recipe',
		]
	},
	{
		text: 'Caja',
		path: '/caja',
		name: 'caja',
		model_name: 'report',
		component: '@/views/Caja',
		params: {
			view: 'reportes',
		},
		if_has_extencion: 'comerciocity_interno',
	},
	// {
	// 	text: 'Ventas',
	// 	path: '/ventas',
	// 	name: 'ventas',
	// 	component: '@/views/Ventas',
	// 	can: 'sale.index',
	// },
	{
		text: 'ABM',
		name: 'abm',
		params: {
			view: 'listado',
			sub_view: 'categorias',
			model_name: 'category',
		},
	},
	{
		model_name: 'employee',
		name: 'employee',
		path: '/empleados',
		component: '@/common-vue/views/Employee',
		check_is_owner: true,
		if_has_extencion: 'comerciocity_interno',
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
		]
	},
]