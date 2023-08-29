export default {
	computed: {
		features() {
			return [
				'Sucursales/depósitos',
				'Ventas por mes',
				'Facturación ',
				'E-commerce propio',
				'Módulo de producción ',
				'Clientes y c/corriente',
				'Presupuestos ',
				'Proveedores y c/corriente',
				'Pedidos a proveedores ',
				'Actualización de ventas',
				'Copias de seguridad diarias',
				'Stock por sucursales',
				'Estadísticas y métricas',
				'Listas de precios',
				'Empleados con permisos',
				'Aplicación móvil',
				'Fotos automáticas',
				'Ayuda con la integración ',
				'Soporte y atención al cliente',
				'Cierre de caja',
				'Compatibilidad con Excel',
				// 'Compatibilidad con Excel de artículos, clientes y proveedores',
			]
		},
		plans() {
			return [
				{
					name: 'Basico',
					price: '$3.000',
					features: [
						{
							title: 'Sucursales/depósitos',
							value: '1',
						},
						{
							title: 'Ventas por mes',
							value: '150',
						},
						{
							title: 'Facturación ',
							value: 'Si',
						},
						{
							title: 'E-commerce propio',
							description: 'sus clientes podrán acceder al e-commerce con sus propias cuentas, las cuales se podrán vincular a su correspondiente perfil cliente de ComercioCity, esto significa que luego de que el cliente haga su pedido desde la tienda, se generará el correspondiente movimiento en su cuenta corriente',
							value: '$2000 x mes',
						},
						{
							title: 'Módulo de producción ',
							value: 'No',
						},
						{
							title: 'Clientes y c/corriente',
							value: 'No',
						},
						{
							title: 'Presupuestos ',
							value: 'No',
						},
						{
							title: 'Proveedores y c/corriente',
							value: 'No',
						},
						{
							title: 'Pedidos a proveedores ',
							value: 'No',
						},
						{
							title: 'Actualización de ventas',
							value: 'No',
						},
						{
							title: 'Copias de seguridad diarias',
							value: 'Si',
						},
						{
							title: 'Stock por sucursales',
							value: 'No',
						},
						{
							title: 'Estadísticas y métricas',
							value: 'No',
						},
						{
							title: 'Listas de precios',
							description: 'Cuando se indique el cliente en una venta, los precios de la misma se calcularán en base a la lista de precios del cliente, lo mismo para cuando ese cliente acceda al e-commerce desde su cuenta',
							value: 'No',
						},
						{
							title: 'Empleados con permisos',
							value: 'No',
						},
						{
							title: 'Aplicación móvil',
							value: 'Si',
						},
						{
							title: 'Fotos automáticas',
							description: 'Sacadas desde Google',
							value: 'No',
						},
						{
							title: 'Ayuda con la integración ',
							value: 'Si',
						},
						{
							title: 'Soporte y atención al cliente',
							value: 'Si',
						},
						{
							title: 'Cierre de caja',
							value: 'Si',
						},
						{
							title: 'Compatibilidad con Excel',
							value: 'No',
						},
					]
				},
				{
					name: 'Completo',
					price: '$5.000',
					features: [
						{
							title: 'Sucursales/depósitos',
							value: '3',
						},
						{
							title: 'Ventas por mes',
							value: '300',
						},
						{
							title: 'Facturación ',
							value: 'Si',
						},
						{
							title: 'E-commerce propio',
							description: 'sus clientes podrán acceder al e-commerce con sus propias cuentas, las cuales se podrán vincular a su correspondiente perfil cliente de ComercioCity, esto significa que luego de que el cliente haga su pedido desde la tienda, se generará el correspondiente movimiento en su cuenta corriente',
							value: '$3500 x mes',
						},
						{
							title: 'Módulo de producción',
							value: 'No',
						},
						{
							title: 'Clientes y c/corriente',
							value: 'Si',
						},
						{
							title: 'Presupuestos ',
							value: 'Si',
						},
						{
							title: 'Proveedores y c/corriente',
							value: 'Si',
						},
						{
							title: 'Pedidos a proveedores ',
							value: 'Si',
						},
						{
							title: 'Actualización de ventas',
							value: 'Si',
						},
						{
							title: 'Copias de seguridad diarias',
							value: 'Si',
						},
						{
							title: 'Stock por sucursales',
							value: 'Si',
						},
						{
							title: 'Estadísticas y métricas',
							value: 'Si',
						},
						{
							title: 'Listas de precios',
							description: 'Cuando se indique el cliente en una venta, los precios de la misma se calcularán en base a la lista de precios del cliente, lo mismo para cuando ese cliente acceda al e-commerce desde su cuenta',
							value: 'Si',
						},
						{
							title: 'Empleados con permisos',
							// mostrar precio si es que tiene permiso 
							value: '$800 por mes',
						},
						{
							title: 'Aplicación móvil',
							value: 'Si',
						},
						{
							title: 'Fotos automáticas',
							description: 'Sacadas desde Google',
							value: 'Si',
						},
						{
							title: 'Ayuda con la integración',
							value: 'Si',
						},
						{
							title: 'Soporte y atención al cliente',
							value: 'Si',
						},
						{
							title: 'Compatibilidad con Excel',
							value: 'Si',
						},
						{
							title: 'Cierre de caja',
							value: 'Si',
						},
					]
				},
				{
					name: 'Empresa',
					price: '$7.000',
					features: [
						{
							title: 'Sucursales/depósitos',
							value: 'Ilimitado',
						},
						{
							title: 'Ventas por mes',
							value: 'Ilimitado',
						},
						{
							title: 'Facturación ',
							value: 'Si',
						},
						{
							title: 'E-commerce propio',
							description: 'sus clientes podrán acceder al e-commerce con sus propias cuentas, las cuales se podrán vincular a su correspondiente perfil cliente de ComercioCity, esto significa que luego de que el cliente haga su pedido desde la tienda, se generará el correspondiente movimiento en su cuenta corriente',
							value: '$5000 x mes',
						},
						{
							title: 'Módulo de producción',
							value: 'Si',
						},
						{
							title: 'Clientes y c/corriente',
							value: 'Si',
						},
						{
							title: 'Presupuestos ',
							value: 'Si',
						},
						{
							title: 'Proveedores y c/corriente',
							value: 'Si',
						},
						{
							title: 'Pedidos a proveedores ',
							value: 'Si',
						},
						{
							title: 'Actualización de ventas',
							value: 'Si',
						},
						{
							title: 'Copias de seguridad diarias',
							value: 'Si',
						},
						{
							title: 'Stock por sucursales',
							value: 'Si',
						},
						{
							title: 'Estadísticas y métricas',
							value: 'Si',
						},
						{
							title: 'Listas de precios',
							description: 'Cuando se indique el cliente en una venta, los precios de la misma se calcularán en base a la lista de precios del cliente, lo mismo para cuando ese cliente acceda al e-commerce desde su cuenta',
							value: 'Si',
						},
						{
							title: 'Empleados con permisos',
							// mostrar precio si es que tiene permiso 
							value: '$1000 por mes',
						},
						{
							title: 'Aplicación móvil',
							value: 'Si',
						},
						{
							title: 'Fotos automáticas',
							description: 'Sacadas desde Google',
							value: 'Si',
						},
						{
							title: 'Ayuda con la integración',
							value: 'Si',
						},
						{
							title: 'Soporte y atención al cliente',
							value: 'Si',
						},
						{
							title: 'Compatibilidad con Excel',
							value: 'Si',
						},
						{
							title: 'Cierre de caja',
							value: 'Si',
						},
					]
				},
			]
		}
	}
}