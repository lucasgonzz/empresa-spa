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

	'masiva-opcion-eliminar-seleccion': {
		titulo: 'Eliminar los seleccionados',
		que_hace: 'Borra de una vez todos los registros tildados. Antes pide confirmación con la cantidad.',
		repercute: [
			'Si son más de uno, el borrado sigue en segundo plano: se puede seguir trabajando y, cuando termina, un aviso dice cuántos se eliminaron.',
			'Si son artículos, van a la papelera, desde donde el dueño de la cuenta los puede restaurar.',
		],
		nota_interna: 'Es el item Eliminar del menu de seleccionados (OptionsDropdown.vue). Hasta el 5/10/2026 su texto vivia en la clave btn-eliminar-*, que en realidad matchea el Eliminar del formulario de UN registro (BtnDelete.vue), y este item no tenia ayuda. En VENTAS el item esta deshabilitado a proposito (el masivo no compensa la caja: DeleteModelsHelper llama al destroy de la venta con un Request vacio) y un item deshabilitado NO abre este popover (medido: el motivo lo dice el globo del item); el endpoint PUT delete/sale igual acepta el borrado masivo. Con mas de un registro va por ProcessDeleteModelsJob (DeleteModelsHelper::BACKGROUND_THRESHOLD = 1); con uno solo es sincronico y la SPA no lee not_deleted. Solo provider_order respeta el rechazo de su destroy (MODELOS_QUE_RESPETAN_RECHAZO). Los textos de esta entrada y la de filtrados se leyeron en el codigo (DeleteController, DeleteModelsHelper, opciones-filtrados-seleccion/Index.vue), no se midieron por diferencia. La deshabilitacion del item en Ventas es del 1/9/2026. Cerrar el borrado masivo de ventas tambien del lado del servidor toca el borrado masivo generico y quedo esperando decision.',
	},

	'masiva-opcion-eliminar-filtrados': {
		titulo: 'Eliminar todo lo filtrado',
		que_hace: 'Borra de una vez todos los registros que deja el filtro. Antes pide confirmación con la cantidad.',
		repercute: [
			'Alcanza a TODO lo filtrado, no solo a lo que se ve en la página: la cantidad está en el botón del menú.',
			'Si son más de uno, el borrado sigue en segundo plano: se puede seguir trabajando y, cuando termina, un aviso dice cuántos se eliminaron.',
			'Si son artículos, van a la papelera, desde donde el dueño de la cuenta los puede restaurar.',
		],
		nota_interna: 'Es el item Eliminar del menu de filtrados (OptionsDropdown.vue). Se apaga sin filtro de columnas (listado por defecto, buscador general o sucursal elegida: ver motivo_masiva_por_filtro_apagada) y apagado no abre este popover; el servidor tambien lo frena con 422 si no hay filtros efectivos (DeleteController). En articulos, el servidor no deja borrar si el conjunto son TODOS los activos. Ver la nota de masiva-opcion-eliminar-seleccion.',
	},

	/* ------------------------------------------------------------ borrar un registro */

	'btn-eliminar-*': {
		titulo: 'Eliminar este registro',
		que_hace: 'Borra este registro. Antes pide confirmación.',
		nota_interna: 'Comodin del Eliminar del formulario de UN registro: el testid btn-eliminar-<modelo> lo pone BtnDelete.vue y nadie mas. Hasta el 5/10/2026 esta clave tenia el texto del borrado MASIVO ("Eliminar los seleccionados", "NO compensa la caja"), que en el detalle de una venta decia lo contrario de lo que hace ese boton; el masivo es masiva-opcion-eliminar-*. Los modelos con efectos que le importan al operador tienen su clave exacta, que le gana a esta: btn-eliminar-article, btn-eliminar-category y btn-eliminar-promocion_vinoteca (aca) y btn-eliminar-sale (vender.js). No lleva repercute porque lo que mueve un borrado depende del modelo. Las promociones de vinoteca y las categorias tienen clave exacta porque no son un borrado simple (vinoteca abre un formulario que descuenta stock; categoria arrastra subcategorias), y la exacta le gana a esta.',
	},

	'btn-eliminar-article': {
		titulo: 'Eliminar este artículo',
		que_hace: 'Borra el artículo abierto. Antes pide confirmación.',
		repercute: [
			'Va a la papelera, desde donde el dueño de la cuenta lo puede restaurar. Al restaurarlo no vuelven ni su receta ni su publicación en Tienda Nube.',
			'Si está publicado en Tienda Nube, se borra también de ahí.',
			'Si se fabrica con una receta, la receta se borra con él y no se puede recuperar.',
		],
		nota_interna: 'Leido en el codigo el 5/10/2026, no medido. ArticleController::destroy (soft delete; check_delete_tienda_nube solo con USA_TIENDA_NUBE y tiendanube_product_id; ArticleHelper::check_article_recipe_to_delete). Recipe NO usa SoftDeletes: el borrado de la receta es fisico. PapeleraController::aplicar_restauracion_soft_delete no rehace ni la receta ni Tienda Nube (solo recalcula combos). No se dice nada del insumo de otra receta porque check_recipes_despues_de_eliminar_articulo solo recalcula si la receta tiene article_cost_from_recipe y la SPA no tiene control para prenderlo (comentado en src/models/recipe_route.js). Tambien borra los articulos espejo de las cuentas con inventory linkage (InventoryLinkageHelper); no se le dice al operador porque aplica a muy pocas cuentas.',
	},

	'btn-eliminar-category': {
		titulo: 'Eliminar esta categoría',
		que_hace: 'Borra la categoría abierta. Antes pide confirmación.',
		repercute: [
			'Borra también todas sus subcategorías.',
			'Los artículos que estaban en ella quedan sin categoría ni subcategoría.',
		],
		nota_interna: 'Leido en CategoryController::destroy el 5/10/2026: detachArticlesCategory pone category_id y sub_category_id en 0 a los articulos de la cuenta, deleteSubCategories borra las subcategorias, y ademas intenta borrar la categoria en Tienda Nube (delete_category_from_tienda_nube).',
	},

	'btn-eliminar-promocion_vinoteca': {
		titulo: 'Eliminar promociones',
		que_hace: 'Abre un cartel para sacar promociones armadas: cuántas se eliminan y cuántas unidades de cada artículo vuelven al stock.',
		repercute: [
			'La cantidad que se escribe se resta del stock de la promoción, no del de los artículos que la componen.',
			'Cada artículo vuelve al stock solo con la cantidad que se le cargue en el cartel: si se deja vacía, no vuelve nada.',
			'La promoción se borra recién cuando su stock llega a cero.',
		],
		nota_interna: 'BtnDelete con solo_emitir_delete (promociones-vinoteca/Modal.vue) abre promociones-vinoteca/DeleteModal.vue, que manda PUT promocion-vinoteca/delete-stock (PromocionVinotecaController::delete_stock + PromocionVinotecaHelper::regresar_stock, que saltea los articulos sin cantidad). No es un confirm y no usa el destroy() del controlador. Leido en el codigo el 5/10/2026.',
	},

	/* ------------------------------------------- catalogo de la tienda por lista de precios */

	/*
		Mision catalogo-por-lista-tienda (5/10/2026). Los cuatro controles existen solo con la
		extension online, pero no todos con la misma condicion:
		- El check de la ficha y la tarjeta de la masiva (con sus botones) aparecen solo para las
			listas que tienen activado "En la tienda, mostrar solo los articulos habilitados para
			esta lista".
		- El contador (habilitados-en-tienda-de-lista) aparece en CUALQUIER lista ya guardada, la
			tenga activada o no: cuelga del interruptor, que es lo que existe con la extension.
	*/

	'visible-en-tienda-lista-*': {
		titulo: 'Visible en la tienda para esta lista',
		que_hace: 'Habilita este artículo en la tienda online para los clientes que tienen esta lista de precios.',
		repercute: [
			'Esta lista muestra en la tienda SOLO los artículos habilitados: sin el tilde, sus clientes no ven el artículo, no lo pueden agregar al carrito ni comprarlo.',
			'El artículo también tiene que estar «Disponible en la tienda» (solapa Tienda online) para verse.',
			'No cambia el precio ni lo que ven los clientes de las otras listas.',
			'Los artículos nuevos nacen sin habilitar.',
		],
		requiere: 'Aparece solo en las listas que tienen activado "En la tienda, mostrar solo los artículos habilitados para esta lista" (ABM de listas de precios). La tienda de tu negocio tiene que estar actualizada a la versión que incluye esta función; hasta entonces sigue mostrando todo.',
		nota_interna: 'Escribe article_price_type.visible_en_tienda (1 habilitado; 0 y NULL no). La tienda aplica la restriccion recien cuando corre una version de tienda-api que la conoce (CatalogoPorListaHelper). Escrito desde el contrato de la mision, falta medirlo en vivo.',
	},

	'masiva-campo-visible_en_tienda_lista_*': {
		titulo: 'Visible en la tienda para una lista',
		que_hace: 'Habilita o deja sin habilitar en la tienda, para esa lista de precios, todos los artículos alcanzados.',
		repercute: [
			'"Activar": los clientes de esa lista pasan a ver estos artículos en la tienda. "Desactivar": dejan de verlos.',
			'El artículo también tiene que estar «Disponible en la tienda» (solapa Tienda online) para verse.',
			'Se puede revertir desde el historial de actualizaciones masivas.',
		],
		nota_interna: 'Viaja como key visible_en_tienda_lista_<id>, type checkbox (contrato C2). La API valida que la lista sea del dueño y registra el valor anterior para el revert (MasiveUpdateHelper).',
	},

	'masiva-checkbox-visible_en_tienda_lista_*': {
		titulo: 'Visible en la tienda para una lista',
		que_hace: '"No modificar" deja todo como está; "Activar" habilita los artículos alcanzados para esa lista en la tienda; "Desactivar" los deja sin habilitar.',
		repercute: [
			'Solo cambia lo que ven en la tienda los clientes de esa lista: el precio y las otras listas no se tocan.',
		],
	},

	'habilitados-en-tienda-de-lista': {
		titulo: 'Artículos habilitados en la tienda',
		que_hace: 'Cuántos artículos están habilitados en la tienda para esta lista, sobre el total de artículos cargados.',
		repercute: [
			'Con la opción activada, los clientes de esta lista ven en la tienda solo esos artículos. Con cero habilitados, no ven ninguno.',
		],
		requiere: 'El número aparece con la lista ya guardada.',
		nota_interna: 'GET price-type/{id}/habilitados-en-tienda -> {habilitados, total} (contrato C2).',
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

	/* ------------------------------------------------- stock y depósitos (exploración 3/9/2026) */

	'menu-depositos': {
		titulo: 'Depósitos',
		que_hace: 'Abre el menú de depósitos: los movimientos entre depósitos y las sugerencias de reposición.',
		nota_interna: 'DepositButtons.vue. Desde la mision modulo-ia-mostrador (14/9/2026) el item Sugerencias lleva al mostrador (/ia) solo a quien puede entrar (mixin mostrador_acceso: extension asistente_ia + dueño o acceso maestro); a cualquier otra persona le abre los modales historicos, aunque la cuenta tenga la extension.',
	},

	'menu-depositos-movimientos': {
		titulo: 'Movimientos entre depósitos',
		que_hace: 'Abre la lista de movimientos de mercadería entre depósitos, para ver los pendientes y cargar nuevos.',
		repercute: [
			'Crear un movimiento acá NO mueve el stock todavía: nace "En proceso" y el stock recién se traslada cuando el movimiento pasa a "Recibido". Medido: con el movimiento En proceso, ningún depósito cambia.',
		],
		requiere: 'La lista entra por día: al abrirla, elegí el día en el calendario o el modo Histórico para ver los movimientos.',
	},

	'menu-depositos-sugerencias': {
		titulo: 'Sugerencias de reposición',
		que_hace: 'Abre las sugerencias de qué mover de un depósito al otro antes de comprar. Si sos el dueño y tenés el asistente IA, te lleva a la carpeta Stock del mostrador (módulo IA); si no, abre la lista de sugerencias de siempre, acá mismo en el listado.',
		nota_interna: 'DepositButtons.show_modal_sugerencias(). El destino lo decide puede_entrar_al_mostrador (mixins/mostrador_acceso.js), no la extension sugerencias_inteligentes: un empleado de una cuenta con asistente_ia va a los modales, porque /ia le devuelve "solo para el dueño". Los modales los monta stock-suggestion/Index.vue con el mismo gate invertido. La vista propia /sugerencias-de-stock ya no existe (mision modulo-ia-mostrador, 14/9/2026).',
	},

	'btn-asignar-stock': {
		titulo: 'Movimiento de stock',
		que_hace: 'Abre el formulario para sumar o restar unidades de este artículo en un depósito (número negativo para restar). Se deshabilita mientras esa fila está en edición de stock por depósito (botón verde), para no usar las dos acciones a la vez.',
		nota_interna: 'StockBtn.vue abre el modal #stock-movement. Muestra el stock global como texto del boton, o "Asignar Stock" si es null. El detalle del modal (proveedor automatico con cantidad positiva) quedo sin medir en la exploracion del 3/9/2026. Desde la mision bloqueo-boton-stock-en-edicion (17/9/2026): computed se_esta_editando_stock compara el articulo en edicion del store article/edit_addresses_stock contra el id de la fila y lo manda a :disabled.',
	},

	'btn-editar-depositos': {
		titulo: 'Stock por depósito',
		que_hace: 'Despliega, en la misma fila, el stock y el mínimo y máximo de este artículo en cada depósito, para cargarlos de una.',
		repercute: [
			'El valor de Stock que se guarda SOBREESCRIBE al actual de ese depósito: el sistema no suma, pisa. Por adentro registra la diferencia como un movimiento de stock ("Creación de depósito" la primera vez, "Actualización de depósito" después), así que el historial del artículo queda completo.',
			'El stock global del artículo se recalcula solo: es siempre la suma de todos los depósitos.',
			'Los mínimos y máximos por depósito son los que después usan las sugerencias de reposición para decidir qué mover.',
		],
		requiere: 'Cargar Mínimo y Máximo de un depósito dejando el Stock vacío guarda los límites pero NO le crea stock: para las sugerencias ese depósito sigue sin existir hasta que reciba stock por primera vez.',
		nota_interna: 'Defecto conocido (exploracion 3/9/2026): address_article.amount queda NULL y StockSuggestionService saltea pivots con amount NULL — un deposito con minimo definido y sin stock no genera deficit. Tambien: los inputs Min y Max comparten el mismo id HTML (EditAddressStock.vue, copy-paste). Y el boton entero solo existe si el usuario guardo alguna vez su configuracion de columnas (hallazgo de los puentes de slots con props_to_show vacio).',
	},

	'btn-guardar-depositos': {
		titulo: 'Guardar stock por depósito',
		que_hace: 'Guarda el stock y los mínimos y máximos cargados en la fila.',
		repercute: [
			'Cada depósito cuyo stock cambió deja su movimiento en el historial del artículo, con la diferencia exacta.',
			'El mínimo y el máximo se guardan tal cual; el reporte de inventario (Alertas → Stock mínimo) los toma cuando se vuelve a generar.',
		],
	},

	'btn-cancelar-depositos': {
		titulo: 'Descartar cambios de stock',
		que_hace: 'Cierra la edición de stock por depósito sin guardar nada.',
	},
}
