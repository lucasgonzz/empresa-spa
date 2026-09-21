/**
 * Descripciones de los controles de las tarjetas de carga del asistente de IA
 * (components/asistente-ia/AccionCard.vue), mision asistente-ia-acciones del 15/9/2026.
 *
 * La tarjeta aparece en el chat cuando el asistente propone un gasto, un pago de cliente o a
 * proveedor, una tarea nueva, cambios en una tarea o marcar una tarea como hecha. Desde la
 * mision asistente-masivas-imagenes-y-remito (19/9/2026) tambien: buscar imagenes para
 * categorias y para articulos elegidos por un filtro, una actualizacion masiva por filtro
 * (siempre con confirmacion) y un cambio en un diseño de PDF. Nada se registra hasta
 * Confirmar. La misma tarjeta se ve en el panel flotante y en el sidebar del informe del
 * mostrador.
 *
 * Desde la mision asistente-omnisciente (21/9/2026) el asistente ademas: muestra la foto de un
 * articulo adjunta a su respuesta (la miniatura de abajo del texto, que se abre completa con un
 * clic), resume ventas y totales por periodo (lo que se vendio la semana pasada, agrupado por
 * dia, vendedor, rubro...), y propone dar de alta, editar o borrar lo que se carga desde una
 * pantalla (un proveedor, un cliente, un rubro, un articulo...) y hacer una venta por el mismo
 * camino que Vender -- siempre con tarjeta para confirmar, nunca solo.
 *
 * Cada afirmacion sale del contrato de la seccion 2 y de las reglas por tipo de la seccion 3.4
 * del plan de la mision (el API registra por el mismo camino que la pantalla); no inventar aca.
 */
export default {

	'asistente-accion-confirmar': {
		titulo: 'Confirmar la carga',
		que_hace: 'Registra en el sistema lo que dice la tarjeta. Un gasto o un pago mueve la caja elegida y, si es un pago, la cuenta corriente. Un alta, una edición o una baja queda como si se hubiera hecho desde la pantalla, y una venta como si se hubiera hecho desde Vender.',
		repercute: [
			'Un gasto queda en Tesorería → Gastos, con un egreso en la caja de cada forma de pago.',
			'Un pago de un cliente entra en la caja elegida y baja lo que debe en su cuenta corriente; un pago a un proveedor sale de la caja y baja lo que se le debe.',
			'Una tarea nueva o un cambio en una tarea queda en la Agenda y no mueve plata.',
			'Marcar como hecha una tarea con gasto asociado registra ese gasto, igual que desde la Agenda.',
			'Una búsqueda de imágenes (para categorías o para artículos por filtro) o una actualización masiva por filtro se manda a procesar en segundo plano y aparece en la píldora de procesos; un cambio en un diseño de PDF se aplica en el momento. En una tarjeta de imagen de categoría el botón dice "Usar esta imagen" y deja esa foto como imagen de la categoría en el sistema y en la tienda.',
			'Un alta, una edición o una baja de lo que se carga desde una pantalla (un proveedor, un cliente, un rubro, un artículo...) se registra por el mismo camino que esa pantalla: la tarjeta muestra los datos exactos y, en una edición, cada campo con el valor anterior y el nuevo. Una baja avisa qué se borra, y si el registro cambió después de armarse la tarjeta, no se toca.',
			'Una venta se registra por el mismo camino que Vender: queda en Ventas, descuenta stock cuando corresponde y, si es al contado, entra en la caja del método de pago elegido; si es a cuenta corriente, suma a la cuenta del cliente.',
			'Si algo cambió desde que se armó la tarjeta (una caja sin apertura, un permiso, una tarea editada o ya hecha), no se registra nada y la tarjeta muestra el motivo.',
			'Un segundo clic no duplica la carga.',
		],
		requiere: 'Que el usuario tenga permiso para cargar eso desde la pantalla correspondiente, y que el asistente no esté respondiendo: mientras responde, Confirmar queda deshabilitado porque esa respuesta puede corregir la tarjeta. La tarjeta vence a las 24 horas.',
		nota_interna: 'POST ai-conversations/{id}/acciones/{accion_id}/confirmar, autenticado como la persona que hace clic. El API toma un candado sobre la accion: un segundo POST responde 409 accion_resuelta sin duplicar. Un 422 no escribe nada y deja error_mensaje en la accion. La ejecucion va por ExpenseHelper::crear, CurrentAcountPagoAltaHelper::registrar, AgendaTareaHelper y AgendaCompletarHelper::completar, los mismos caminos que las pantallas. Las tarjetas alta/edicion/baja (mision asistente-omnisciente) van por EjecutorGenericoIaHelper, que llama al store/update/destroy del MISMO controller de la pantalla con el payload que manda la SPA; la venta por PropuestaVentaIaHelper -> SaleController::store. Ninguna de las cuatro se auto-confirma.',
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
		que_hace: 'Lleva a la pantalla donde quedó la carga: Gastos para un gasto, la Agenda para una tarea, Ventas para una venta, y la pantalla de lo que se dio de alta o se editó (Proveedores, Clientes, Listado...).',
		repercute: [
			'Desde el panel del asistente, lo cierra. Desde la conversación de un informe del mostrador, lo que se cierra es el informe.',
			'Si ya estás en esa pantalla no navega: la vuelve a cargar para que aparezca lo que se registró. En Gastos, si hay una búsqueda activa, no se toca.',
			'No registra ni cambia nada.',
			'Los pagos no tienen este botón: se ven en la cuenta corriente del cliente o del proveedor.',
			'Una baja tampoco: no hay nada que ir a ver. Si el sistema no tiene una pantalla para lo que se registró, el botón directamente no aparece.',
		],
		nota_interna: 'La pantalla sale de resultado.ruta ({ name, params, texto }) que manda el API; la SPA no la decide, y con resultado.ruta en null (una baja, una entidad sin pantalla) AccionCard.vue no pinta el boton. La recarga es ai_chat/refrescarPantallaDeLaAccion: agenda/cargar si la agenda ya se cargo (la vista Realizadas no: su rango vive en el componente) y expense/getModels si no hay busqueda activa. Despues de Confirmar pasa lo mismo sin tocar este boton.',
	},

	'asistente-adjunto-imagen': {
		titulo: 'Ver la imagen completa',
		que_hace: 'Abre a tamaño natural la foto que el asistente adjuntó a su respuesta: hoy, la foto de un artículo cuando se la pedís.',
		repercute: [
			'No registra ni cambia nada: es solo un visor. Se cierra con la cruz, con Escape o tocando fuera de la foto, y cerrarlo no cierra el chat.',
			'La foto es la misma que tiene el artículo en el sistema y en la tienda. Si no carga, en su lugar queda la línea "No se pudo cargar la imagen" y el mensaje sigue entero.',
		],
		nota_interna: 'Los adjuntos viajan en message.adjuntos ({ tipo, url, texto, articulo_id }, tope 6, contrato seccion 1 de asistente-omnisciente); los pinta AdjuntosDeMensaje.vue debajo del texto y arriba de las tarjetas, solo los de tipo imagen con url. El visor es un b-modal propio con el z-index fijado en 1065 por id, como el modal de cuenta corriente (el porque esta en el componente). Sin la clave (API viejo) no se pinta nada.',
	},
}
