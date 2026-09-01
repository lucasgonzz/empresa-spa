/**
 * Descripciones de los controles del modulo Vender.
 *
 * Todo lo que dice `repercute` fue MEDIDO por diferencia con los circuitos e2e del
 * 31/8 al 1/9/2026 (`e2e/tests/circuito-*.spec.js`), no leido del codigo. Si una
 * afirmacion de aca deja de ser cierta, hay un spec que se pone en rojo.
 *
 * 🔴 Los textos de las entradas LOS LEE UN CLIENTE, asi que van con acentos y bien
 * escritos --a diferencia de los comentarios del codigo, que en este repo van sin--.
 *
 * Ver `descripciones/index.js` para la forma de una entrada y por que existe este archivo.
 */
export default {

	/* ---------------------------------------------------------------- armar la venta */

	'venta-sucursal': {
		titulo: 'Sucursal',
		que_hace: 'Elegís desde qué sucursal sale la mercadería de esta venta.',
		repercute: [
			'El stock se descuenta del depósito de esta sucursal, no del total del negocio.',
		],
		requiere: 'Es obligatoria. Sin sucursal elegida, el botón de guardar no hace absolutamente nada: no manda el pedido y tampoco avisa por qué. Si apretás guardar y no pasa nada, mirá primero acá.',
	},

	'venta-total': {
		titulo: 'Total de la venta',
		que_hace: 'Suma de los renglones, ya con el descuento o el recargo del método de pago aplicado.',
		repercute: [
			'Es el importe que se le debita a la cuenta corriente del cliente.',
			'Es el importe que entra a la caja cuando el cobro es en el momento.',
		],
	},

	'btn-guardar-venta': {
		titulo: 'Guardar la venta',
		que_hace: 'Confirma la venta y la registra.',
		repercute: [
			'Descuenta el stock de cada renglón, en el depósito de la sucursal elegida.',
			'Si hay cliente y no se omitió, deja el movimiento de deuda en su cuenta corriente.',
			'Si el método de pago tiene caja, entra la plata efectivamente cobrada —el total ya con descuento o recargo—, no el subtotal de la mercadería.',
		],
		requiere: 'Sucursal elegida, y cada artículo del buscador con su cantidad confirmada. Un artículo elegido al que le falta confirmar la cantidad frena el guardado.',
	},

	'venta-guardar-presupuesto': {
		titulo: 'Guardar como presupuesto',
		que_hace: 'Guarda la operación como presupuesto en vez de como venta.',
		repercute: [
			'NO toca el stock y NO toca la cuenta corriente. Un presupuesto no mueve nada hasta que se confirma.',
			'Al confirmarlo después, recién ahí nace la venta, baja el stock y aparece la deuda.',
		],
	},

	'venta-omitir-cuenta-corriente': {
		titulo: 'Omitir cuenta corriente',
		que_hace: 'Guarda la venta sin dejar el movimiento en la cuenta del cliente.',
		repercute: [
			'La deuda no queda registrada: el saldo del cliente no se mueve.',
			'El stock se descuenta igual. Esto solo afecta la plata, no la mercadería.',
		],
	},

	/* ------------------------------------------------------------- metodos de pago */

	'venta-metodo-pago': {
		titulo: 'Método de pago',
		que_hace: 'Elegís con qué se cobra, y aplica el descuento o el recargo que ese método tenga configurado.',
		repercute: [
			'Cambia el total de la venta.',
			'El porcentaje aplicado queda guardado en la venta, no solo el importe final.',
			'La caja asociada al método recibe lo efectivamente cobrado.',
		],
	},

	'venta-caja': {
		titulo: 'Caja',
		que_hace: 'Elegís a qué caja entra la plata de este cobro.',
		requiere: 'Si el selector aparece vacío no es que falte cargar cajas: es que están CERRADAS. Una caja cerrada no se ofrece. Hay que abrirla desde el módulo de cajas.',
	},

	'venta-btn-metodos-pago': {
		titulo: 'Repartir en varios métodos de pago',
		que_hace: 'Abre el reparto del total entre varios métodos.',
		repercute: [
			'Quita el método de pago que estaba elegido y, con él, el descuento o recargo que ese método traía. Por eso el total a repartir puede no coincidir con el total que se veía recién: es correcto, el descuento se fue junto con el método.',
		],
	},

	'multipago-total-a-repartir': {
		titulo: 'Total a repartir',
		que_hace: 'El importe que hay que cubrir entre todas las filas del reparto.',
		repercute: [
			'Es el total SIN el descuento del método que se quitó al abrir el reparto.',
		],
	},

	'pago-monto-*': {
		titulo: 'Monto de esta fila',
		que_hace: 'Cuánto se cobra con este método de pago.',
		repercute: [
			'La suma de todas las filas tiene que dar el total a repartir, o el reparto no se puede cerrar.',
		],
		requiere: 'Cargalo ANTES de elegir la caja: el selector de caja de una fila no se dibuja hasta que la fila tiene monto.',
	},

	'pago-caja-*': {
		titulo: 'Caja de esta fila',
		que_hace: 'A qué caja entra la parte cobrada con este método.',
		repercute: [
			'Cada fila deposita en SU caja. Repartir entre dos métodos con cajas distintas mueve las dos, cada una por su parte.',
		],
		requiere: 'Aparece recién cuando la fila tiene un monto cargado.',
	},

	'venta-multipago-calcular': {
		titulo: 'Calcular el reparto',
		que_hace: 'Reparte el total entre las filas cargadas.',
		repercute: [
			'Pisa los montos que hubiera escritos a mano en las filas.',
		],
	},

	'venta-multipago-listo': {
		titulo: 'Confirmar el reparto',
		que_hace: 'Cierra el reparto y vuelve a la venta con los métodos ya asignados.',
		requiere: 'La suma de las filas tiene que igualar el total a repartir. Se comparan los dos importes redondeados al centavo, así que un resto de fracciones de centavo —el que deja repartir un total que no es divisible exacto— no lo frena.',
		nota_interna: 'Ese redondeo es el arreglo del 1/9/2026. Antes se truncaba, y un resto de 1e-12 se convertia en un centavo de diferencia que frenaba el reparto mostrando los dos totales iguales en pantalla. Lo cubre circuito-multipago.spec.js, que tipea todos los montos a mano justamente para pasar por este camino.',
	},

	/* ------------------------------------------------------------------ devoluciones */

	'devolucion-num-venta': {
		titulo: 'Número de venta',
		que_hace: 'Trae los renglones de una venta ya hecha, buscándola por su NÚMERO.',
		requiere: 'Se busca por número de venta, no por cliente ni por fecha. Se confirma con Enter.',
	},

	'devolucion-btn-marcar-todo': {
		titulo: 'Marcar todo devuelto',
		que_hace: 'Llena cada renglón con la cantidad completa que se había vendido.',
		repercute: [
			'Es para una devolución total. Para devolver una parte, se carga renglón por renglón.',
		],
	},

	'devolucion-item-devueltas-*': {
		titulo: 'Unidades devueltas',
		que_hace: 'Cuántas unidades de este renglón vuelven.',
		repercute: [
			'El total de la devolución es el de la mercadería devuelta, no el de la venta. Devolver la mitad de cada renglón da la mitad del total.',
		],
	},

	'devolucion-regresar-stock': {
		titulo: 'Regresar stock',
		que_hace: 'Devuelve las unidades al inventario.',
		repercute: [
			'Al tildarlo aparece el selector de depósito: hay que decir a cuál entran.',
			'Sin esto, la mercadería vuelve físicamente pero el sistema la sigue contando como vendida.',
		],
	},

	'devolucion-generar-cuenta-corriente': {
		titulo: 'Generar cuenta corriente',
		que_hace: 'Deja el crédito a favor del cliente en su cuenta.',
		repercute: [
			'Baja el saldo que el cliente debe, por el total de la devolución.',
		],
	},

	'devolucion-facturar-nota-credito-*': {
		titulo: 'Facturar la nota de crédito',
		que_hace: 'Emite la nota de crédito ante ARCA sobre la factura elegida.',
		repercute: [
			'Si ARCA la rechaza NO se guarda nada: el stock no vuelve y el crédito no se genera. La devolución entera se cancela junto con el comprobante.',
		],
		requiere: 'La opción solo aparece si la venta tiene una factura con CAE. Sin factura autorizada no hay sobre qué emitir, y que no esté es correcto.',
		nota_interna: 'Defecto abierto al 1/9/2026: la nota de credito NO baja el IVA debito de Posicion Fiscal. Dos causas y hacen falta las dos --el join de query_iva_debito va por afip_tickets.sale_id, que en una nota de credito es NULL, y el comprobante se guarda con importe_iva en NULL--. Medido: factura que sumo 4.833,68, devuelta la mitad con NC autorizada, el reporte siguio mostrando 4.833,68.',
	},

	/* --------------------------------------------------------- editar, cobrar, borrar */

	'btn-actualizar-venta': {
		titulo: 'Actualizar la venta',
		que_hace: 'Guarda los cambios de una venta ya confirmada.',
		repercute: [
			'Recalcula el total y ajusta el stock por la diferencia de cada renglón.',
			'Rehace el movimiento de cuenta corriente de esta venta: el movimiento viejo se reemplaza por uno nuevo.',
		],
	},

	'btn-registrar-pago': {
		titulo: 'Registrar el pago',
		que_hace: 'Cobra contra la cuenta corriente del cliente.',
		repercute: [
			'Baja el saldo acumulado del cliente por el importe cobrado.',
			'La plata entra a la caja elegida.',
		],
	},

	'confirm-compensar-caja': {
		titulo: 'Compensar la caja',
		que_hace: 'Al borrar una venta, decide si además sale de la caja la plata que había entrado.',
		repercute: [
			'Tildado, la caja vuelve al saldo que tenía antes de la venta.',
			'Sin tildar, el stock vuelve igual pero la plata QUEDA en la caja. Es la opción correcta solo si esa plata ya se justificó por otro lado.',
		],
	},
}
