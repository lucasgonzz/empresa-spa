/**
 * Descripciones de los controles del modulo de Agenda (Alertas -> Agenda,
 * components/agenda/*), mision agenda-tareas-calendario del 14/9/2026.
 *
 * Lo que mas importa acá son los `repercute` del gasto: marcar como hecha una tarea con gasto
 * MUEVE PLATA (crea el gasto y el movimiento de la caja elegida), y deshacerla NO la devuelve.
 * Cada afirmacion sale del contrato de la seccion 2 del plan y de AgendaCompletarHelper de
 * empresa-api; no inventar acá.
 */
export default {

	'agenda-nueva-tarea': {
		titulo: 'Nueva tarea',
		que_hace: 'Abre el formulario para agendar una tarea en una fecha, con repetición y gasto asociado opcionales.',
		repercute: [
			'En la vista Calendario, si hay un día elegido, la tarea arranca en ese día.',
			'Todavía no guarda nada: recién al apretar "Guardar" la tarea existe.',
		],
	},

	'agenda-vista-lista': {
		titulo: 'Vista Lista',
		que_hace: 'Muestra las tareas pendientes agrupadas por urgencia: Vencidas, Hoy, Esta semana (hasta el domingo) y Próximas (hasta 60 días).',
		repercute: [
			'Las tareas ya hechas no aparecen acá: están en Realizadas (y tachadas en el Calendario).',
			'De una tarea que se ignoró mucho tiempo se muestran como mucho 30 vencidas; el resto se informa como omitidas.',
		],
	},

	'agenda-vista-calendario': {
		titulo: 'Vista Calendario',
		que_hace: 'Muestra el mes en una grilla de lunes a domingo con las tareas de cada día; al tocar un día, sus tareas se listan abajo para completarlas o editarlas.',
		repercute: [
			'Cambiar de mes vuelve a pedir las tareas de ese mes a la API.',
			'En teléfono cada día muestra puntos de color en vez de nombres; la lista del día elegido es donde se leen.',
		],
	},

	'agenda-vista-realizadas': {
		titulo: 'Vista Realizadas',
		que_hace: 'Lista lo que se marcó como hecho en un rango de fechas (últimos 30 días por defecto), con el gasto registrado si lo hubo.',
	},

	'agenda-completar-*': {
		titulo: 'Marcar la tarea como hecha',
		que_hace: 'Marca esta ocurrencia como realizada. Si la tarea tiene un gasto asociado, primero pregunta cómo se pagó.',
		repercute: [
			'Sin gasto: la tarea sale de la lista al instante y abajo aparece "Hecha" con Deshacer durante unos segundos.',
			'Con gasto: no se marca nada hasta confirmar en la ventana "Marcar como hecha".',
			'En una tarea recurrente se marca solo ESA fecha; las siguientes siguen apareciendo.',
			'Una tarea no recurrente marcada como hecha deja de aparecer en la lista y en el calendario futuro.',
		],
		nota_interna: 'POST pending-completed con { pending_id, fecha_realizacion }. La API tiene candado contra el doble clic: un segundo POST de la misma ocurrencia responde 409 y la SPA avisa "ya estaba marcada".',
	},

	'agenda-confirmar-gasto': {
		titulo: 'Confirmar y registrar el gasto',
		que_hace: 'Marca la tarea como hecha y da de alta el gasto con el concepto de la tarea, el monto y los métodos de pago indicados.',
		repercute: [
			'Crea un gasto en Tesorería → Gastos con observación "Agenda: <tarea>", visible en los reportes de gastos.',
			'Cada método de pago con caja mueve esa caja: se registra un egreso por el monto de esa fila.',
			'Si la caja elegida no tiene apertura, no se registra nada (ni la tarea ni el gasto) y se avisa.',
			'El Importe IVA, si se carga, impacta en el IVA crédito de Reportes.',
		],
		requiere: 'Un monto mayor a cero, al menos un método de pago elegido, y que la suma de los métodos coincida con el monto.',
		nota_interna: 'Todo en una sola transacción del lado de la API (AgendaCompletarHelper). El gasto sale por ExpenseHelper::crear, el mismo camino que POST api/expense.',
	},

	'agenda-sin-gasto': {
		titulo: 'Hecha sin registrar el gasto',
		que_hace: 'Marca la tarea como hecha sin dar de alta ningún gasto (por ejemplo, si el pago ya se cargó por otro lado o no hubo).',
		repercute: [
			'No crea ningún gasto ni mueve ninguna caja.',
			'Queda registrada en Realizadas sin gasto asociado, y se puede deshacer desde ahí o desde la barra "Hecha".',
		],
	},

	'agenda-deshacer-*': {
		titulo: 'Deshacer',
		que_hace: 'Vuelve la tarea a pendiente: borra la marca de realizada de esa fecha.',
		repercute: [
			'🔴 El gasto que se registró al marcarla NO se borra: queda cargado y se elimina desde Tesorería → Gastos, que es donde se compensa la caja.',
			'Una tarea no recurrente vuelve a aparecer en la lista y el calendario.',
		],
		nota_interna: 'DELETE pending-completed/{id} responde { expense_id } para que la SPA avise que el gasto sigue existiendo. Borrar el gasto desde acá implicaría compensar cajas, y eso ya tiene su flujo en Gastos.',
	},

	'agenda-deshacer-ultima': {
		titulo: 'Deshacer (barra "Hecha")',
		que_hace: 'Revierte la última tarea que se marcó como hecha sin gasto, durante los segundos que la barra está visible.',
		repercute: [
			'La tarea vuelve a la lista. No hay gasto involucrado: esta barra solo aparece para tareas sin gasto.',
		],
	},

	'agenda-guardar-tarea': {
		titulo: 'Guardar la tarea',
		que_hace: 'Crea la tarea o guarda los cambios de la que se está editando.',
		repercute: [
			'En una tarea recurrente cambia TODAS las ocurrencias futuras (la fecha "Primera vez" es la base de la repetición).',
			'Lo que ya se marcó como hecho no cambia.',
			'Asociar un gasto no crea ningún gasto todavía: se crea al marcar la tarea como hecha.',
		],
		requiere: 'Detalle y fecha. Si se repite: cada cuánto. Si tiene gasto: el concepto (se crean en ABM → Gastos).',
	},

	'agenda-eliminar-tarea': {
		titulo: 'Eliminar la tarea',
		que_hace: 'Borra la tarea (y, si es recurrente, la regla entera: todas las ocurrencias futuras).',
		repercute: [
			'Lo que ya se marcó como hecho queda en Realizadas.',
			'Los gastos que se registraron al completarla no se tocan.',
		],
	},

	'agenda-se-repite': {
		titulo: 'Se repite',
		que_hace: 'Convierte la tarea en recurrente: cada N días, semanas, meses o años desde la fecha indicada, hasta la fecha "Hasta" si se carga.',
		repercute: [
			'Una mensual del 31 cae el último día en los meses más cortos y vuelve al 31 en los que lo tienen; no se corre mes a mes.',
		],
	},

	'agenda-tiene-gasto': {
		titulo: 'Tiene un gasto asociado',
		que_hace: 'Vincula la tarea a un concepto de gasto y un monto estimado, para que al marcarla como hecha se pregunte cómo se pagó y se registre el gasto.',
		repercute: [
			'El monto estimado es solo una sugerencia: se puede cambiar al marcar la tarea como hecha.',
		],
	},

	'agenda-hoy': {
		titulo: 'Hoy',
		que_hace: 'Vuelve el calendario al mes actual y selecciona el día de hoy.',
	},

	'agenda-realizadas-buscar': {
		titulo: 'Buscar realizadas',
		que_hace: 'Carga las tareas marcadas como hechas entre las dos fechas.',
	},
}
