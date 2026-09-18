/**
 * Descripciones de los controles de las tarjetas de carga del asistente de IA
 * (components/asistente-ia/AccionCard.vue), mision asistente-ia-acciones del 15/9/2026.
 *
 * La tarjeta aparece en el chat cuando el asistente propone un gasto, un pago de cliente o a
 * proveedor, una tarea nueva, cambios en una tarea o marcar una tarea como hecha. Nada se
 * registra hasta Confirmar. La misma tarjeta se ve en el panel flotante y en el sidebar del
 * informe del mostrador.
 *
 * Cada afirmacion sale del contrato de la seccion 2 y de las reglas por tipo de la seccion 3.4
 * del plan de la mision (el API registra por el mismo camino que la pantalla); no inventar aca.
 */
export default {

	'asistente-accion-confirmar': {
		titulo: 'Confirmar la carga',
		que_hace: 'Registra en el sistema lo que dice la tarjeta. Un gasto o un pago mueve la caja elegida y, si es un pago, la cuenta corriente.',
		repercute: [
			'Un gasto queda en Tesorería → Gastos, con un egreso en la caja de cada forma de pago.',
			'Un pago de un cliente entra en la caja elegida y baja lo que debe en su cuenta corriente; un pago a un proveedor sale de la caja y baja lo que se le debe.',
			'Una tarea nueva o un cambio en una tarea queda en la Agenda y no mueve plata.',
			'Marcar como hecha una tarea con gasto asociado registra ese gasto, igual que desde la Agenda.',
			'Si algo cambió desde que se armó la tarjeta (una caja sin apertura, un permiso, una tarea editada o ya hecha), no se registra nada y la tarjeta muestra el motivo.',
			'Un segundo clic no duplica la carga.',
		],
		requiere: 'Que el usuario tenga permiso para cargar eso desde la pantalla correspondiente, y que el asistente no esté respondiendo: mientras responde, Confirmar queda deshabilitado porque esa respuesta puede corregir la tarjeta. La tarjeta vence a las 24 horas.',
		nota_interna: 'POST ai-conversations/{id}/acciones/{accion_id}/confirmar, autenticado como la persona que hace clic. El API toma un candado sobre la accion: un segundo POST responde 409 accion_resuelta sin duplicar. Un 422 no escribe nada y deja error_mensaje en la accion. La ejecucion va por ExpenseHelper::crear, CurrentAcountPagoAltaHelper::registrar, AgendaTareaHelper y AgendaCompletarHelper::completar, los mismos caminos que las pantallas.',
	},

	'asistente-accion-cancelar': {
		titulo: 'Cancelar la carga',
		que_hace: 'Descarta lo que propuso el asistente sin registrar nada.',
		repercute: [
			'No mueve ninguna caja, cuenta corriente ni tarea: la tarjeta queda como cancelada y ya no se puede confirmar.',
			'Para cargarlo igual, se le pide de nuevo al asistente, que arma una tarjeta nueva.',
		],
		nota_interna: 'POST ai-conversations/{id}/acciones/{accion_id}/cancelar. El historial que lee la IA marca la tarjeta como cancelada, asi que no la vuelve a ofrecer como pendiente.',
	},

	'asistente-accion-ver': {
		titulo: 'Ver lo que se registró',
		que_hace: 'Lleva a la pantalla donde quedó la carga: Gastos para un gasto, la Agenda para una tarea.',
		repercute: [
			'Desde el panel del asistente, lo cierra. Desde la conversación de un informe del mostrador, lo que se cierra es el informe.',
			'Si ya estás en esa pantalla no navega: la vuelve a cargar para que aparezca lo que se registró. En Gastos, si hay una búsqueda activa, no se toca.',
			'No registra ni cambia nada.',
			'Los pagos no tienen este botón: se ven en la cuenta corriente del cliente o del proveedor.',
		],
		nota_interna: 'La pantalla sale de resultado.ruta ({ name, params, texto }) que manda el API; la SPA no la decide. La recarga es ai_chat/refrescarPantallaDeLaAccion: agenda/cargar si la agenda ya se cargo (la vista Realizadas no: su rango vive en el componente) y expense/getModels si no hay busqueda activa. Despues de Confirmar pasa lo mismo sin tocar este boton.',
	},
}
