/**
 * Descripciones de los controles de las sugerencias de stock (Depósitos → Sugerencias,
 * extensión `sugerencias_inteligentes`).
 *
 * Igual que en `listado.js`: lo que dice `repercute` fue medido en la exploración del
 * 3/9/2026 o verificado contra el código que se cita en `nota_interna`, y los textos
 * van con acentos porque LOS LEE UN CLIENTE.
 */
export default {

	'sugerencias-btn-nueva': {
		titulo: 'Nueva sugerencia',
		que_hace: 'Abre el formulario para generar una sugerencia de traslados entre depósitos con el stock y las ventas de este momento.',
		repercute: [
			'Generar una sugerencia no mueve nada: solo calcula y deja la propuesta guardada para revisarla.',
		],
	},

	'sugerencia-form-generar': {
		titulo: 'Generar la sugerencia',
		que_hace: 'Calcula qué conviene mover de un depósito al otro, con el objetivo, el origen y el límite elegidos.',
		repercute: [
			'Mira el stock y los mínimos y máximos por depósito de cada artículo: un depósito sin mínimo definido no pide reposición, y un depósito que nunca recibió stock tampoco (aunque tenga mínimo definido).',
			'La urgencia de cada renglón sale de las ventas de los últimos 90 días EN el depósito que necesita: cobertura = stock actual ÷ venta diaria. Un artículo que no se vende ahí va al final, sin urgencia.',
		],
		requiere: 'Con el catálogo chico el cálculo es inmediato; con catálogos grandes corre de fondo y la pantalla avisa cuando termina.',
		nota_interna: 'StockSuggestionService (que mover) + CoberturaService (en que orden). El "deposito que nunca recibio stock no pide" es el defecto conocido de amount NULL (exploracion 3/9/2026): build_suggestions_for_article saltea pivots con amount NULL. Si se arregla, actualizar el segundo repercute.',
	},

	'sugerencia-detalle-estado': {
		titulo: 'Estado de la sugerencia',
		que_hace: 'Dice si la sugerencia terminó de calcularse, sigue generándose, o falló.',
	},

	'sugerencias-btn-crear-movimientos': {
		titulo: 'Crear movimientos de depósito',
		que_hace: 'Convierte los renglones tildados en movimientos de depósito, listos para que el depósito los prepare.',
		repercute: [
			'El stock NO se mueve todavía: cada movimiento nace "En proceso" y el traslado real ocurre recién cuando el movimiento se recibe.',
			'Se crea un movimiento por cada par origen→destino tildado, agrupando los artículos que van juntos.',
			'Los movimientos aparecen en Listado → Depósitos → Movimientos, a nombre de quien los generó.',
		],
		requiere: 'Hay que tildar al menos un renglón. La selección es por página: al cambiar de página o de filtro se destilda.',
		nota_interna: 'StockSuggestionController::create_deposit_movement. El mecanismo "no mueve hasta Recibido" esta medido en exploracion-depositos-movimiento-por-estado.spec.js (I1).',
	},

	'sugerencia-resumen-ia': {
		titulo: 'Resumen escrito por la IA',
		que_hace: 'Un texto en criollo sobre el resultado: qué es urgente y qué puede esperar.',
		repercute: [
			'Es solo lectura: los números de la tabla están calculados igual, con o sin resumen. Si el texto falla o la cuenta no tiene la IA contratada, la sugerencia está completa lo mismo.',
		],
		nota_interna: 'ResumenIaService. Estados: null (sin credenciales, el bloque no se dibuja), pendiente, listo, error (con boton Reintentar que pega a stock-suggestion/{id}/resumen).',
	},
}
