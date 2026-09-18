/**
 * Descripciones de los controles de los procesos en segundo plano (misión
 * procesos-en-segundo-plano, 18/9/2026): la píldora de arriba a la derecha
 * (components/common/procesos-en-segundo-plano/Tarjeta.vue), el modal con el detalle de todos
 * (Modal.vue y sus filas), el punto de conexión junto al nombre del usuario
 * (common-vue/components/nav-vertical/UserInfo.vue) y la tarjeta flotante de importación
 * (common-vue/components/import/import-status/Index.vue).
 *
 * Los `repercute` salen del código: nada de esto toca stock, caja ni cuentas; lo único que
 * escribe en la base es marcar un proceso como visto.
 */
export default {

	'procesos-tarjeta': {
		titulo: 'Procesos en segundo plano',
		que_hace: 'Muestra cuántos procesos están corriendo en segundo plano (importaciones, recálculo de precios, actualizaciones masivas...) y el avance promedio de los que se pueden medir. Al hacer click abre el detalle de todos.',
		repercute: [
			'Solo informa: no frena ni cambia ningún proceso.',
			'Se achica al anillo (con la cantidad en un globito) a los 6 segundos y se vuelve a expandir al pasar el mouse. Cuando el último proceso termina bien avisa 4 segundos y se va sola; si alguno falló, se queda en rojo hasta que lo cierres desde el detalle.',
		],
		nota_interna: 'Se alimenta del canal background_processes.{owner_id} (evento .BackgroundProcessUpdated) y de GET background-processes al arrancar, al reconectar Echo y cada 15 s como respaldo si la conexión en tiempo real no está sana. Contra una API sin el endpoint (404) no aparece nunca.',
	},

	'proceso-fila': {
		titulo: 'Un proceso en segundo plano',
		que_hace: 'Muestra el estado de un proceso: qué es, cuándo se inició, quién lo lanzó y cuánto avanzó. Al hacer click abre su detalle (lotes, artículos procesados, resultado).',
		repercute: [
			'Solo informa. El detalle se pide a la API al abrirlo y se refresca solo mientras el proceso corre.',
		],
		nota_interna: 'La barra es proporcional cuando el proceso reporta un total (porcentaje no nulo) e indeterminada cuando no. El texto debajo es "X de Y unidad · P %" o la etapa que manda la API.',
	},

	'proceso-cerrar': {
		titulo: 'Quitar de la lista',
		que_hace: 'Saca de la lista un proceso que ya terminó. El proceso no se borra: solo deja de mostrarse acá.',
		repercute: [
			'Marca el proceso como visto en el servidor (PUT background-processes/{id}/visto). Vuelve a aparecer solo si el servidor no llegó a marcarlo.',
		],
	},

	'proceso-ver-historial': {
		titulo: 'Ver historial de importaciones',
		que_hace: 'Abre el historial de importaciones, donde está el mensaje de error completo de la importación que falló.',
		requiere: 'Estar en una pantalla donde el historial esté disponible (Artículos o Compras). En otra pantalla el botón no hace nada.',
	},

	'procesos-limpiar': {
		titulo: 'Limpiar terminados',
		que_hace: 'Saca de la lista todos los procesos terminados (completados y fallidos). Los que siguen corriendo se quedan.',
		repercute: [
			'Marca todos los terminados como vistos en el servidor (PUT background-processes/vistos). No borra ningún registro ni deshace nada de lo que esos procesos hicieron.',
		],
	},

	'procesos-volver': {
		titulo: 'Volver a la lista',
		que_hace: 'Cierra el detalle del proceso y vuelve a la lista de todos los procesos.',
	},

	'procesos-cerrar': {
		titulo: 'Cerrar',
		que_hace: 'Cierra la ventana de procesos en segundo plano. Los procesos siguen corriendo igual.',
	},

	'estado-broadcast': {
		titulo: 'Conexión en tiempo real',
		que_hace: 'Verde: el sistema recibe los avisos en tiempo real (procesos, pedidos, notificaciones). Rojo: no los está recibiendo, y lo que se muestra puede demorar hasta que se reconecte.',
		repercute: [
			'En rojo, los procesos en segundo plano se siguen actualizando igual, pero cada 15 segundos en vez de al instante.',
		],
		nota_interna: 'Estado del socket de Pusher (main.js observa connection.state y state_change) combinado con lo que el servidor dice de sí mismo (GET background-processes → broadcast.habilitado). "Conectando" también se pinta rojo (Lucas pidió dos colores); el title dice el motivo real, incluido "El sistema no está configurado para avisar en tiempo real" cuando el servidor no tiene driver pusher o clave.',
	},

	'import-status-minimizar': {
		titulo: 'Minimizar la tarjeta de importación',
		que_hace: 'Achica la tarjeta contra el borde derecho de la pantalla dejando solo la pestaña; al volver a hacer click se despliega.',
		repercute: [
			'La importación sigue igual; solo se esconde el aviso.',
		],
	},

	'import-status-ver-detalle': {
		titulo: 'Ver detalle de la importación fallida',
		que_hace: 'Abre el historial de importaciones, donde está el mensaje de error de la importación que falló.',
	},

	'import-status-cerrar': {
		titulo: 'Cerrar la tarjeta de importación',
		que_hace: 'Cierra la tarjeta de la importación fallida. El error queda en el historial de importaciones.',
	},

}
