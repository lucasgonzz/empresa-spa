/**
 * Descripciones de los controles del modulo Alertas.
 *
 * Todo lo que dice `repercute` fue MEDIDO en la exploracion del modulo (3/9/2026, specs
 * `e2e/tests/exploracion-alertas-*.spec.js` y el feature test
 * `tests/Feature/Alertas/3_Pedidos_proveedor_dias_de_aviso_Test.php` de empresa-api) o
 * verificado contra el codigo con la linea a la vista. Si una afirmacion deja de ser
 * cierta, hay un test que se pone en rojo.
 *
 * 🔴 Los textos de las entradas LOS LEE UN CLIENTE, asi que van con acentos y bien
 * escritos --a diferencia de los comentarios del codigo, que en este repo van sin--.
 *
 * Ver `descripciones/index.js` para la forma de una entrada y por que existe este archivo.
 */
export default {

	/* ------------------------------------------------------------------------ cobros */

	'alertas-cobros-dias': {
		titulo: 'Ventas de hace más de N días',
		que_hace: 'Cambia la antigüedad mínima que tiene que tener una venta impaga para aparecer en esta lista.',
		repercute: [
			'Con 0, entran todas las ventas impagas, incluidas las de hoy.',
			'Vacío no es cero: vacío vuelve al plazo configurado en el negocio (el de administradores o el del empleado, según quién mira).',
			'Una venta que tiene su propio plazo de aviso se sigue rigiendo por el suyo: este número no la toca.',
		],
		requiere: 'El número solo no filtra nada: hay que apretar Aplicar (o Enter).',
		nota_interna: 'La cascada del plazo por rol y el umbral propio por venta viven en VentasSinCobrarHelper::query_de_ventas() de empresa-api. Fijado por exploracion-alertas-cobros.spec.js.',
	},

	'alertas-cobros-aplicar-dias': {
		titulo: 'Aplicar el filtro de días',
		que_hace: 'Vuelve a pedir la lista con la antigüedad elegida.',
		repercute: [
			'Rearma las tarjetas, el contador de clientes y el número rojo de la pestaña: los tres cuentan siempre lo mismo que está a la vista.',
		],
	},

	'alertas-cobros-contador': {
		titulo: 'Clientes con ventas por cobrar',
		que_hace: 'Cuenta los clientes que tienen al menos una venta impaga dentro del filtro actual.',
		repercute: [
			'Las ventas sin cliente asignado se agrupan en una tarjeta propia que este número no cuenta (el número rojo de la pestaña sí la cuenta).',
		],
		nota_interna: 'Defecto conocido que el operador no ve: una venta en estado "pagándose" a la que le faltan $300 o menos desaparece de la alerta aunque la deuda siga viva (umbral fijo en VentasSinCobrarHelper). Una venta sin ningún pago alerta desde cualquier monto. Medido y fijado por spec el 3/9/2026.',
	},

	'alertas-cobros-chip-*': {
		titulo: 'Saldo de la cuenta corriente',
		que_hace: 'Abre la cuenta corriente del cliente en esa moneda.',
		repercute: [
			'El importe es el saldo total de la cuenta, no la suma de las ventas listadas en la tarjeta: puede incluir deudas más viejas que el filtro dejó afuera.',
		],
	},

	'alertas-cobros-ver-detalle': {
		titulo: 'Ver el detalle de las ventas',
		que_hace: 'Abre la lista completa de ventas impagas del cliente.',
		repercute: [
			'Es el único lugar donde se ve cuánto se está pagando de cada venta y su fecha exacta; la tarjeta muestra solo las 5 más viejas.',
		],
	},

	/* ------------------------------------------------------------------ stock mínimo */

	'stock-minimo-chip-bajo-minimo': {
		titulo: 'Bajo el mínimo',
		que_hace: 'Cuenta las alertas de stock mínimo del último reporte de inventario.',
		repercute: [
			'Un artículo alerta cuando su stock queda igual o por debajo del mínimo: la igualdad ya alerta.',
			'Cuenta alertas, no artículos: un artículo con el mínimo cargado en dos depósitos distintos y los dos en falta suma dos.',
			'Es el mismo número rojo de la pestaña y el que suma a la campana de Alertas del menú.',
		],
		nota_interna: 'El conteo por depósito usa la condición stock_min >= amount del pivot (InventoryPerformanceHelper); la rama por depósito corre solo si el artículo no alertó por su stock global. Badge arreglado el 3/9/2026 (leía una relación que el endpoint ya no manda).',
	},

	'stock-minimo-chip-sin-stock': {
		titulo: 'Sin stock',
		que_hace: 'Cuenta los artículos con stock en cero o menos.',
		repercute: [
			'Los artículos con stock negativo también cuentan acá, además de en su propio indicador.',
			'Un artículo sin stock asignado (nunca se le cargó) no cuenta: no es lo mismo "sin stock" que "sin stockear".',
		],
	},

	'stock-minimo-chip-negativo': {
		titulo: 'Con stock negativo',
		que_hace: 'Cuenta los artículos cuyo stock quedó por debajo de cero.',
		repercute: [
			'Suele ser una venta sin el ingreso de mercadería registrado, o un error de carga: conviene revisarlos.',
		],
	},

	'stock-minimo-chip-reposicion': {
		titulo: 'Costo de reposición',
		que_hace: 'Estima cuánto costaría comprar lo que falta para que cada artículo alertado vuelva a su mínimo.',
		repercute: [
			'Suma faltante × costo de cada alerta. Un artículo justo en el mínimo (faltante cero) cuenta en el número de alertas pero no suma plata acá.',
			'Los artículos sin costo cargado no se estiman: quedan afuera de este número.',
			'El costo se normaliza por presentación y unidades individuales, igual que en el resto del inventario.',
		],
	},

	'stock-minimo-buscador': {
		titulo: 'Buscar en las alertas de stock',
		que_hace: 'Filtra la tabla de artículos bajo el mínimo por nombre, código de barras o código de proveedor.',
		repercute: [
			'Busca solo dentro del último reporte de inventario, no en todo el catálogo: un artículo que no está alertado no va a aparecer acá.',
		],
	},

	/* ------------------------------------------------------------------- facturación */

	'alertas-facturacion-venta-*': {
		titulo: 'Abrir la venta',
		que_hace: 'Abre el detalle de la venta cuyo comprobante quedó sin autorizar por ARCA.',
		repercute: [
			'Desde el detalle se puede reintentar la facturación; los botones de la columna Acciones muestran los errores y observaciones que devolvió ARCA.',
		],
	},

	/* ----------------------------------------------- stock mínimo por depósito (listado) */

	'btn-editar-depositos': {
		titulo: 'Editar stock por depósito',
		que_hace: 'Abre la edición del stock, el mínimo y el máximo del artículo en cada depósito.',
		repercute: [
			'El valor que pongas en cada depósito queda como stock final: no se suma al actual, lo reemplaza.',
			'El mínimo cargado acá alimenta las alertas de stock mínimo en la próxima actualización del reporte de inventario.',
		],
		nota_interna: 'Defecto abierto (3/9/2026): este botón hoy NO se renderiza — los slots #table-prop-* de views/Listado.vue no llegan a las celdas de la tabla del listado, así que no hay ningún camino de interfaz para configurar un stock mínimo (el campo global del artículo es not_show y la masiva no lo ofrece). El endpoint PUT article-update-addresses funciona; los specs lo usan directo.',
	},

	'btn-guardar-depositos': {
		titulo: 'Guardar los depósitos',
		que_hace: 'Guarda el stock, el mínimo y el máximo cargados para cada depósito.',
		repercute: [
			'Si el stock de un depósito cambió, genera el movimiento de stock por la diferencia.',
			'El mínimo y el máximo se guardan tal cual; el reporte de inventario los toma cuando se vuelve a generar.',
		],
		nota_interna: 'Misma situación que btn-editar-depositos: hoy inalcanzable por interfaz.',
	},

	'deposito-stock-min-*': {
		titulo: 'Stock mínimo del depósito',
		que_hace: 'El umbral de alerta de este artículo en este depósito.',
		repercute: [
			'Cuando el stock del depósito queda igual o por debajo de este número, el artículo entra a las alertas de stock mínimo en la próxima actualización del reporte.',
		],
	},

	'deposito-stock-max-*': {
		titulo: 'Stock máximo del depósito',
		que_hace: 'El tope de referencia de este artículo en este depósito.',
	},

	'deposito-stock-*': {
		titulo: 'Stock del depósito',
		que_hace: 'La cantidad que este depósito tiene de este artículo.',
		repercute: [
			'El valor que pongas queda como stock final del depósito: reemplaza al actual, no se le suma. Si cambió, se registra el movimiento de stock por la diferencia.',
		],
	},
}
