/**
 * Descripciones de los controles del Listado de articulos y de las acciones masivas.
 *
 * Igual que en `vender.js`: lo que dice `repercute` fue medido, no supuesto, y los
 * textos van con acentos porque LOS LEE UN CLIENTE.
 *
 * Ver `descripciones/index.js` para la forma de una entrada.
 */
export default {

	/* -------------------------------------------------------------- buscar y filtrar */

	'buscador-general': {
		titulo: 'Buscador general',
		que_hace: 'Busca en todo el sistema por el término escrito.',
		requiere: 'La búsqueda se dispara al apretar la lupa o Enter, no mientras se escribe.',
	},

	'btn-reiniciar-filtros': {
		titulo: 'Reiniciar filtros',
		que_hace: 'Saca todos los filtros puestos y la búsqueda, y vuelve a traer el listado completo.',
		repercute: [
			'El listado RECUERDA la última búsqueda y los filtros entre sesiones: no se limpian solos al salir y volver. Si el listado aparece vacío o más corto de lo esperado sin que nadie haya filtrado recién, es esto, y este botón lo resuelve.',
		],
	},

	'btn-modo-seleccion': {
		titulo: 'Modo selección',
		que_hace: 'Prende la selección por filas para después aplicarles una acción en conjunto.',
		repercute: [
			'Mientras está prendido, las acciones masivas trabajan sobre lo SELECCIONADO. Apagado, trabajan sobre todo lo filtrado.',
		],
	},

	/* ---------------------------------------------------------------------- masivas */

	'btn-confirmar-masiva': {
		titulo: 'Confirmar la actualización masiva',
		que_hace: 'Aplica el cambio a todos los artículos alcanzados de una sola vez.',
		repercute: [
			'Alcanza a TODO lo filtrado, no solo a lo que se ve en la página actual. La cuenta de arriba dice a cuántos artículos va a llegar; conviene leerla antes de confirmar.',
			'Tocar el costo o el margen de un artículo recalcula su precio final.',
			'Un artículo publicado en la tienda comparte base con el ERP: el precio cambiado acá se ve en la tienda, sin sincronización de por medio.',
		],
	},

	'masiva-modo-*': {
		titulo: 'Modo de la actualización',
		que_hace: 'Decide si el valor escrito reemplaza al actual o lo modifica en porcentaje.',
		repercute: [
			'En porcentaje, cada artículo cambia respecto de SU propio valor: el resultado es distinto para cada uno.',
		],
	},

	'btn-eliminar-*': {
		titulo: 'Eliminar los seleccionados',
		que_hace: 'Borra en conjunto todo lo seleccionado.',
		repercute: [
			'Repone el stock de lo que se borra, pero NO compensa la caja: la plata que había entrado queda adentro.',
		],
		requiere: 'En VENTAS esta opción está deshabilitada a propósito. Una venta se borra de a una, desde la venta, porque ese camino ofrece compensar la caja y este no lo hace.',
		nota_interna: 'La opcion esta deshabilitada en la interfaz (OptionsDropdown.vue) desde el 1/9/2026, pero el endpoint PUT delete/sale sigue aceptando el borrado masivo. Cerrarlo tambien del lado del servidor toca el borrado masivo generico y quedo esperando decision.',
	},

	/* ------------------------------------------------------------------- importacion */

	'btn-importar-excel': {
		titulo: 'Importar Excel',
		que_hace: 'Abre el asistente para cargar artículos desde una planilla.',
		repercute: [
			'Según cómo se mapeen las columnas, puede crear artículos nuevos y además pisar los datos de los que ya existen.',
		],
	},

	'import-fila-desde': {
		titulo: 'Fila desde la que se lee',
		que_hace: 'Indica en qué fila de la planilla arrancan los datos.',
		requiere: 'Si la planilla tiene encabezado, esta es la fila siguiente. Dejarla en 1 con encabezado hace que el título de cada columna entre como si fuera un artículo.',
	},

	/* --------------------------------------------------------------------- reportes */

	'posicion-fiscal-iva-debito': {
		titulo: 'IVA débito del período',
		que_hace: 'Suma el IVA de los comprobantes de venta emitidos en el período.',
		nota_interna: 'Defecto abierto al 1/9/2026: las notas de credito NO lo bajan, asi que este numero queda sobreestimado cuando hubo devoluciones facturadas. Ver la nota de devolucion-facturar-nota-credito-*. El spec fija el comportamiento real, asi que el dia que se arregle se pone en rojo.',
	},
}
