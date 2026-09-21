/**
 * Descripciones de los controles de Tesorería que tocan cheques: la fila de un método de pago
 * de tipo cheque en el pago a proveedor (cuenta corriente) y en el gasto, y el módulo de
 * Cheques (Tesorería > Cheques). Misión cheques-endoso-y-bancos del 21/9/2026.
 *
 * Lo que más importa acá son los `repercute` del endoso: elegir un cheque recibido en una fila
 * de pago lo SACA DE CARTERA (pasa a Endosados), cancela deuda del proveedor o paga el gasto por
 * su monto, y NO mueve caja. Cada afirmación sale del contrato de la §4 del plan y de
 * ChequeHelper::endosar de empresa-api; no inventar acá.
 */
export default {

	'cheque-origen-*': {
		titulo: 'Cheque nuevo o endoso',
		que_hace: 'Elige si en esta fila se carga un cheque nuevo (emitido por vos) o se endosa uno que ya recibiste de un cliente y todavía está en cartera.',
		repercute: [
			'"Cheque nuevo" deja los campos de siempre: número, banco, fechas, echeq y notas. El cheque queda en Tesorería > Cheques > Emitidos.',
			'"Endosar un cheque recibido" muestra la lista de los que se pueden endosar: recibidos, sin cobrar ni rechazar, no endosados y no vencidos (hasta 30 días después de la fecha de pago).',
			'Volver a "Cheque nuevo" con un cheque ya elegido deja la fila en blanco: los datos eran de ese cheque.',
		],
		requiere: 'Solo aparece al pagarle a un proveedor o al cargar un gasto. Si no tenés cheques recibidos disponibles, la opción se ve deshabilitada.',
		nota_interna: 'La prop es permitir_endoso, y la pasan solo current-acounts/pago/PaymentMethods.vue (!es_cobro_a_cliente) y expenses/modals/payment-methods/Index.vue. Vender, la agenda y las comisiones no la pasan: una venta cobrada con cheque es un cheque recibido.',
	},

	'cheque-a-endosar-*': {
		titulo: 'Cheque a endosar',
		que_hace: 'El cheque recibido que se le entrega al proveedor (o con el que se paga el gasto). Cada opción muestra número, banco, monto, fecha de pago y el cliente que lo entregó.',
		repercute: [
			'El cheque recibido sale de cartera: pasa a Tesorería > Cheques > Recibidos > Endosados, con el proveedor o el gasto al que fue.',
			'Aparece una copia en Emitidos, con el mismo número, banco, monto y fechas, y desde qué cliente vino.',
			'El proveedor queda pagado (o el gasto registrado) por el monto del cheque: el monto de la fila se fija en ese valor y no se puede cambiar. Se endosa entero, no hay endoso parcial.',
			'No mueve ninguna caja: la plata nunca entró ni salió del comercio, cambió de mano el papel.',
			'Si el mismo pago tiene varias filas, un cheque elegido en una fila desaparece de la lista de las otras.',
		],
		requiere: 'Al confirmar, la API vuelve a verificar que el cheque siga disponible. Si mientras tanto se cobró, se rechazó, venció o alguien lo endosó, el pago no se registra y se muestra el motivo.',
		nota_interna: 'La lista sale de GET cheque/disponibles-para-endosar, pedida una vez por apertura del modal en PaymentMethodsStep. La fila viaja con cheque_id; ChequeHelper::crear_cheque llama a endosar() en vez de crear. La prevalidación es problemas_de_endoso_en_payload (422 con message antes de escribir nada).',
	},

	'cheque-banco-*': {
		titulo: 'Banco del cheque',
		que_hace: 'El banco del cheque, elegido de la lista de bancos cargados (ABM > Tesorería > Bancos de cheques).',
		repercute: [
			'El cheque se guarda con el banco elegido, y la columna Banco de Tesorería > Cheques lo muestra unificado con el resto.',
			'"Sin banco" deja el cheque sin banco. Un cheque viejo que tenía el banco escrito a mano lo conserva como texto hasta que se le asigne uno de la lista.',
		],
		nota_interna: 'Viajan las dos claves: cheque_banco_id y banco (= nombre), para que una API vieja, el Excel y el mostrador que leen el texto no queden con el banco vacío. Los textos viejos los unifica el asistente (proponer_unificar_bancos_de_cheques, siempre con tarjeta).',
	},

	'cheque-nuevo-banco-*': {
		titulo: 'Nuevo banco',
		que_hace: 'Da de alta un banco sin salir del pago: escribís el nombre, lo creás y queda elegido en esta fila.',
		repercute: [
			'El banco queda en la lista para todos los cheques que vengan y en ABM > Tesorería > Bancos de cheques.',
		],
		requiere: 'El nombre no puede estar vacío.',
	},

	'cheques-cargando': {
		titulo: 'Cargando cheques',
		que_hace: 'Se está pidiendo la lista de cheques agrupada por tipo (recibidos, emitidos) y estado; las solapas aparecen cuando llega.',
	},
}
