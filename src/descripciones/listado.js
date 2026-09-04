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

	/* ------------------------------------------------------------------ precio del articulo */

	'article-cost': {
		titulo: 'Costo del artículo',
		que_hace: 'Lo que cuesta el artículo, sin impuestos: el punto de partida de todo el cálculo del precio.',
		repercute: [
			'Con margen de ganancia configurado, cambiar el costo recalcula el precio final en la misma proporción: costo al doble, precio final al doble.',
			'Con precio fijado a mano (margen vacío), el precio final NO se mueve al cambiar el costo. El margen que ese precio implica sí cambia.',
		],
		nota_interna: 'Los dos repercute medidos por tests/Feature/Listado/3_Precio_final_sigue_al_costo_Test.php (exploracion 1/9/2026).',
	},

	'article-percentage_gain': {
		titulo: 'Margen de ganancia',
		que_hace: 'El porcentaje que se le suma al costo real para formar el precio final.',
		repercute: [
			'Mientras tenga un valor, el precio final queda atado al costo: cada cambio de costo lo recalcula solo.',
			'Cargar un margen borra el precio fijado a mano, si lo había: las dos formas de fijar el precio no conviven.',
		],
		nota_interna: 'Que el margen borra el price manual esta en ArticleHelper::setFinalPrice (el bloque "Pongo el precio en blanco si corresponde"), verificado en la exploracion del 1/9/2026.',
	},

	/* ---------------------------------------------------------------------- masivas */

	'btn-confirmar-masiva': {
		titulo: 'Confirmar la actualización masiva',
		que_hace: 'Aplica el cambio a todos los artículos alcanzados de una sola vez.',
		repercute: [
			'Alcanza a TODO lo filtrado, no solo a lo que se ve en la página actual. La cuenta de arriba dice a cuántos artículos va a llegar; conviene leerla antes de confirmar.',
			'Tocar el costo o el margen de un artículo recalcula su precio final.',
			'Un artículo con precio fijado a mano (sin margen) conserva su precio final aunque el costo cambie: su precio no depende del costo.',
			'Un artículo publicado en la tienda comparte base con el ERP: el precio cambiado acá se ve en la tienda, sin sincronización de por medio.',
		],
	},

	'btn-revertir-masiva-*': {
		titulo: 'Revertir esta actualización masiva',
		que_hace: 'Deshace esa actualización: cada artículo alcanzado vuelve a los valores que tenía antes.',
		repercute: [
			'Vuelven el costo Y el precio final: los precios recalculados por el cambio se recalculan de nuevo con los valores restaurados, exactos.',
			'También restaura los campos que estaban vacíos: un artículo que no tenía categoría y la recibió en la masiva vuelve a quedar sin categoría.',
		],
		requiere: 'El botón aparece solo en las actualizaciones que todavía se pueden revertir.',
		nota_interna: 'Los dos repercute estan medidos: el del costo/precio final por tests/Feature/Listado/4_Masiva_de_costo_recalcula_y_revierte_Test.php (exploracion 1/9/2026) y el de los vacios por 2_Revertir_masiva_restaura_null_Test.php.',
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
		repercute: [
			'Es bruto: no descuenta las notas de crédito. Lo que se emitió por devoluciones va en el renglón de abajo, y ese es el que se resta del saldo.',
		],
	},

	'posicion-fiscal-iva-notas-credito': {
		titulo: 'IVA de notas de crédito emitidas',
		que_hace: 'Suma el IVA de las notas de crédito que se emitieron ante ARCA en el período.',
		repercute: [
			'Se resta del saldo, igual que el IVA crédito. Por eso va pegado abajo del IVA débito: los dos renglones juntos son el débito real del período.',
		],
	},

	'posicion-fiscal-aviso-sin-medir': {
		titulo: 'Notas de crédito sin el IVA medido',
		que_hace: 'Avisa que en el período hay notas de crédito emitidas de las que no se guardó el IVA.',
		repercute: [
			'Mientras el aviso esté, el renglón de notas de crédito puede estar incompleto y el saldo a pagar salir más alto del que corresponde.',
		],
		requiere: 'Aparece por los comprobantes emitidos antes del 1/9/2026, que es cuando el sistema empezó a guardar ese dato. Un cero sin este aviso significa que no hubo notas de crédito; con el aviso, significa que puede haberlas y no se midieron. No es lo mismo.',
		nota_interna: 'Lo recupera el comando SetIvaNotasCredito (empresa-api). No recupera todo: cuando no puede saber la alicuota no escribe, a proposito.',
	},
}
