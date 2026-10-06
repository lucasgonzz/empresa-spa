/**
 * Descripciones de los controles del modulo Alertas.
 *
 * Todo lo que dice `repercute` fue MEDIDO en la exploracion del modulo (3/9/2026, specs
 * `e2e/tests/exploracion-alertas-*.spec.js` y el feature test
 * `tests/Feature/Alertas/3_Pedidos_proveedor_dias_de_aviso_Test.php` de empresa-api) o
 * verificado contra el codigo con la linea a la vista. Si una afirmacion deja de ser
 * cierta, hay un test que se pone en rojo.
 *
 * 🔴 Los textos de las entradas LOS LEE UN CLIENTE, asi que van con acentos y bien
 * escritos --a diferencia de los comentarios del codigo, que en este repo van sin--.
 *
 * Ver `descripciones/index.js` para la forma de una entrada y por que existe este archivo.
 */
export default {

	/* ------------------------------------------------------------------------ cobros */

	'alertas-cobros-dias': {
		titulo: 'Ventas de hace más de N días',
		que_hace: 'Cambia la antigüedad mínima que tiene que tener una venta impaga para aparecer en esta lista.',
		repercute: [
			'Con 0, entran todas las ventas impagas, incluidas las de hoy.',
			'Vacío no es cero: vacío vuelve al plazo configurado en el negocio (el de administradores o el del empleado, según quién mira).',
			'Una venta que tiene su propio plazo de aviso se sigue rigiendo por el suyo: este número no la toca.',
		],
		requiere: 'El número solo no filtra nada: hay que apretar Aplicar (o Enter).',
		nota_interna: 'La cascada del plazo por rol y el umbral propio por venta viven en VentasSinCobrarHelper::query_de_ventas() de empresa-api. Fijado por exploracion-alertas-cobros.spec.js.',
	},

	'alertas-cobros-aplicar-dias': {
		titulo: 'Aplicar el filtro de días',
		que_hace: 'Vuelve a pedir la lista con la antigüedad elegida.',
		repercute: [
			'Rearma las tarjetas, el contador de clientes y el número rojo de la pestaña: los tres cuentan siempre lo mismo que está a la vista.',
		],
	},

	'alertas-cobros-contador': {
		titulo: 'Clientes con ventas por cobrar',
		que_hace: 'Cuenta los clientes que tienen al menos una venta impaga dentro del filtro actual.',
		repercute: [
			'Las ventas sin cliente asignado se agrupan en una tarjeta propia que este número no cuenta (el número rojo de la pestaña sí la cuenta).',
		],
		nota_interna: 'Defecto conocido que el operador no ve: una venta en estado "pagándose" a la que le faltan $300 o menos desaparece de la alerta aunque la deuda siga viva (umbral fijo en VentasSinCobrarHelper). Una venta sin ningún pago alerta desde cualquier monto. Medido y fijado por spec el 3/9/2026.',
	},

	'alertas-cobros-chip-*': {
		titulo: 'Saldo de la cuenta corriente',
		que_hace: 'Abre la cuenta corriente del cliente en esa moneda.',
		repercute: [
			'El importe es el saldo total de la cuenta, no la suma de las ventas listadas en la tarjeta: puede incluir deudas más viejas que el filtro dejó afuera.',
		],
	},

	'alertas-cobros-ver-detalle': {
		titulo: 'Ver el detalle de las ventas',
		que_hace: 'Abre la lista completa de ventas impagas del cliente.',
		repercute: [
			'Es el único lugar donde se ve cuánto se está pagando de cada venta y su fecha exacta; la tarjeta muestra solo las 5 más viejas.',
		],
	},

	/* ------------------------------------------------------------------ stock mínimo */

	'stock-minimo-chip-bajo-minimo': {
		titulo: 'Bajo el mínimo',
		que_hace: 'Cuenta las alertas de stock mínimo del último reporte de inventario.',
		repercute: [
			'Un artículo alerta cuando su stock queda igual o por debajo del mínimo: la igualdad ya alerta.',
			'Cuenta alertas, no artículos: un artículo con el mínimo cargado en dos depósitos distintos y los dos en falta suma dos.',
			'Es el mismo número rojo de la pestaña y el que suma a la campana de Alertas del menú.',
		],
		nota_interna: 'El conteo por depósito usa la condición stock_min >= amount del pivot (InventoryPerformanceHelper); la rama por depósito corre solo si el artículo no alertó por su stock global. Badge arreglado el 3/9/2026 (leía una relación que el endpoint ya no manda).',
	},

	'stock-minimo-chip-sin-stock': {
		titulo: 'Sin stock',
		que_hace: 'Cuenta los artículos con stock en cero o menos.',
		repercute: [
			'Los artículos con stock negativo también cuentan acá, además de en su propio indicador.',
			'Un artículo sin stock asignado (nunca se le cargó) no cuenta: no es lo mismo "sin stock" que "sin stockear".',
		],
	},

	'stock-minimo-chip-negativo': {
		titulo: 'Con stock negativo',
		que_hace: 'Cuenta los artículos cuyo stock quedó por debajo de cero.',
		repercute: [
			'Suele ser una venta sin el ingreso de mercadería registrado, o un error de carga: conviene revisarlos.',
		],
	},

	'stock-minimo-chip-reposicion': {
		titulo: 'Costo de reposición',
		que_hace: 'Estima cuánto costaría comprar lo que falta para que cada artículo alertado vuelva a su mínimo.',
		repercute: [
			'Suma faltante × costo de cada alerta. Un artículo justo en el mínimo (faltante cero) cuenta en el número de alertas pero no suma plata acá.',
			'Los artículos sin costo cargado no se estiman: quedan afuera de este número.',
			'El costo se normaliza por presentación y unidades individuales, igual que en el resto del inventario.',
		],
	},

	'stock-minimo-buscador': {
		titulo: 'Buscar en las alertas de stock',
		que_hace: 'Filtra la tabla de artículos bajo el mínimo por nombre, código de barras o código de proveedor.',
		repercute: [
			'Busca solo dentro del último reporte de inventario, no en todo el catálogo: un artículo que no está alertado no va a aparecer acá.',
		],
	},

	/* ------------------------------------------------------------------- facturación */

	'alertas-facturacion-venta-*': {
		titulo: 'Abrir la venta',
		que_hace: 'Abre el detalle de la venta cuyo comprobante quedó sin autorizar por ARCA.',
		repercute: [
			'Desde el detalle se puede reintentar la facturación; los botones de la columna Acciones muestran los errores y observaciones que devolvió ARCA.',
		],
	},

	/* ----------------------------------------------- stock mínimo por depósito (listado) */

	/*
	 * btn-editar-depositos y btn-guardar-depositos NO van aca: los define listado.js, que es el
	 * modulo del boton (vive en la fila del listado) y tiene la version mas completa. Las dos
	 * exploraciones del 3/9/2026 los describieron por separado y, al mergearlas (14/9/2026), la
	 * copia de este archivo pisaba a la de listado.js por el orden de modulos de index.js.
	 */

	'deposito-stock-min-*': {
		titulo: 'Stock mínimo del depósito',
		que_hace: 'El umbral de alerta de este artículo en este depósito.',
		repercute: [
			'Cuando el stock del depósito queda igual o por debajo de este número, el artículo entra a las alertas de stock mínimo en la próxima actualización del reporte.',
		],
	},

	'deposito-stock-max-*': {
		titulo: 'Stock máximo del depósito',
		que_hace: 'El tope de referencia de este artículo en este depósito.',
	},

	'deposito-stock-*': {
		titulo: 'Stock del depósito',
		que_hace: 'La cantidad que este depósito tiene de este artículo.',
		repercute: [
			'El valor que pongas queda como stock final del depósito: reemplaza al actual, no se le suma. Si cambió, se registra el movimiento de stock por la diferencia.',
		],
	},

	/* -------------------------------------------------------------------- imágenes */

	/*
	 * Pestaña Alertas → Imágenes (misión imagenes-catalogo-completo, 27/9/2026). Los `repercute`
	 * salen del contrato de la misión (plan §4 a §6) y del código de la SPA: no hay spec de
	 * exploración que los mida todavía (la suite la corre Lucas).
	 *
	 * Misma regla de palabras que las pantallas (nota de imagenes/textos.js): la corrida entera
	 * es una "asignación"; "búsqueda" es cada consulta al buscador, la que se cuenta y se cobra.
	 */

	'imagenes-catalogo-abrir': {
		titulo: 'Asignar imágenes a todo el catálogo',
		que_hace: 'Abre la confirmación para buscarle imagen, de una sola vez, a todos los artículos activos que no tienen.',
		repercute: [
			'Antes de lanzar muestra cuántos artículos se buscarían, cuáles quedan afuera y por qué, y cuánto se estima que tarda y cuesta.',
			'Solo aparece entrando con el acceso maestro: el comercio sigue pidiendo imágenes desde el listado, con su límite diario de búsquedas.',
		],
		nota_interna: 'El botón mira auth.user.es_acceso_maestro (la API lo arma desde la sesión del login maestro). La previa es GET image-assignment-runs/catalogo/previa, que contesta 403 a cualquier otra sesión.',
	},

	'imagenes-catalogo-lanzar': {
		titulo: 'Lanzar la asignación de todo el catálogo',
		que_hace: 'Arranca en segundo plano la asignación de imágenes para los artículos que muestra la confirmación.',
		repercute: [
			'Las imágenes que la IA da por buenas se asignan solas y se ven en la tienda; las dudosas quedan en "A revisar" y no se ven hasta que alguien las aprueba.',
			'Hay un tope de artículos por vez: los que no entran se buscan lanzándola de nuevo cuando termina. Lo que ya se buscó sin éxito en los últimos 90 días no se vuelve a buscar.',
			'No gasta el límite diario de búsquedas del comercio.',
		],
		requiere: 'Que el servidor tenga configurados el buscador de imágenes y la revisión con IA, y que no haya otra asignación de todo el catálogo en curso.',
		nota_interna: 'POST image-assignment-runs/catalogo. 422 sin SERPER_API_KEY, sin IA configurada (ia_configurada: false en la previa, plan §13), sin artículos para buscar o con otra de catálogo activa. Corre en tramos de ~50 s encadenados; tope IMAGENES_TOPE_CATALOGO (5000 por defecto). Orden: publicados en la tienda, con stock, resto.',
	},

	'imagenes-catalogo-estimacion': {
		titulo: 'Estimación de la asignación',
		que_hace: 'Cuántas búsquedas, cuánto tiempo y cuántos dólares se calcula que va a llevar buscar el catálogo.',
		repercute: [
			'Es una cuenta aproximada: cerca de 1,5 búsquedas y 8 segundos por artículo. Lo real queda en el detalle de la asignación cuando termina.',
		],
		nota_interna: 'Sale de estimacion de GET image-assignment-runs/catalogo/previa (plan §3: ~USD 1 cada 1.000 búsquedas + ~USD 0,005 por artículo de IA).',
	},

	'imagenes-chip-trabada': {
		titulo: 'Parece trabada',
		que_hace: 'Avisa que la asignación figura en curso pero no avanza hace más de 15 minutos.',
		repercute: [
			'Suele destrabarse sola. Si sigue así, se puede reanudar desde el detalle.',
		],
		nota_interna: 'Antes decía "con el acceso maestro se puede reanudar": el popover lo ve cualquiera y desde el plan §13 las de selección y del asistente las reanuda cualquiera que las ve; solo las de todo el catálogo piden el acceso maestro (y ahí el botón ni aparece para el resto).',
	},

	'imagenes-detalle-busquedas': {
		titulo: 'Búsquedas usadas',
		que_hace: 'Cuántas búsquedas de imágenes gastó esta asignación: el total, el promedio por artículo y cuántas fueron por código de barras y cuántas por nombre.',
		repercute: [
			'Cuenta toda búsqueda que el buscador contestó, aunque no haya traído resultados. Las que fallaron no cuentan.',
			'Primero se busca por código de barras (solo si es un código real) y, si no aparece una imagen buena, por nombre: por eso un artículo puede gastar dos.',
			'Las validaciones con IA van aparte: son las veces que la IA miró las imágenes candidatas para ver si eran el producto.',
		],
	},

	'imagenes-motivo-articulo': {
		titulo: 'Por qué quedó sin imagen',
		que_hace: 'El motivo principal por el que no se le asignó imagen a este artículo.',
		repercute: [
			'"Ver qué se probó" muestra el detalle: qué se buscó por código de barras y por nombre, y qué pasó con cada imagen que apareció.',
		],
	},

	'imagenes-resumen-a-revisar': {
		titulo: 'Imágenes para revisar',
		que_hace: 'Cuántas imágenes encontró la asignación pero dejó para que alguien las mire antes de ponérselas a los artículos.',
		repercute: [
			'Todavía no se ven en los artículos ni en la tienda: se aprueban o se rechazan desde Alertas → Imágenes.',
		],
	},

	'imagenes-resumen-busquedas': {
		titulo: 'Búsquedas usadas',
		que_hace: 'Cuántas búsquedas de imágenes gastó esta asignación, y el promedio por artículo.',
	},

	'imagenes-ver-asignacion-*': {
		titulo: 'Ver la asignación de imágenes',
		que_hace: 'Abre el detalle de la asignación: qué imagen se asignó, cuáles quedaron para revisar y por qué no se encontró el resto.',
		repercute: [
			'Abrirla la marca como vista: deja de sumar al número rojo de la pestaña. Las imágenes para revisar siguen sumando hasta que se aprueban o se rechazan.',
		],
	},

	'imagenes-buscador': {
		titulo: 'Buscar artículos en esta asignación',
		que_hace: 'Filtra los artículos de la solapa abierta por nombre o código de barras.',
		repercute: [
			'Busca solo entre los artículos de esta asignación, no en todo el catálogo.',
		],
	},

	'imagenes-por-pagina': {
		titulo: 'Artículos por página',
		que_hace: 'Cambia cuántos artículos se ven por página en la solapa: 25, 50 o 100.',
	},

	'imagenes-aprobar-*': {
		titulo: 'Aprobar la imagen',
		que_hace: 'Le asigna al artículo la imagen que quedó para revisar.',
		repercute: [
			'Desde ese momento la imagen se ve en el artículo y en la tienda (y se sincroniza con Tienda Nube si está conectada).',
			'Se puede deshacer con "Quitar" desde la solapa Asignadas.',
		],
		nota_interna: 'POST image-assignment-items/{id}/aprobar. 422 si ya no estaba para revisar o si el artículo se borró (en ese caso lo pasa a no asignadas, motivo articulo_borrado).',
	},

	'imagenes-rechazar-*': {
		titulo: 'Rechazar la imagen',
		que_hace: 'Descarta la imagen que quedó para revisar: el artículo queda sin imagen.',
		repercute: [
			'La imagen se borra y el artículo pasa a "No asignadas". Nunca llegó a verse en la tienda.',
		],
	},

	'imagenes-seleccionar-pagina': {
		titulo: 'Seleccionar la página',
		que_hace: 'Tilda todas las imágenes para revisar de la página que se ve, para aprobarlas o rechazarlas juntas.',
		repercute: [
			'Solo toma las de esta página: las de las páginas siguientes no se tildan.',
		],
	},

	'imagenes-tilde-*': {
		titulo: 'Seleccionar esta imagen',
		que_hace: 'La suma a las que se van a aprobar o rechazar juntas.',
	},

	'imagenes-lote-aprobar': {
		titulo: 'Aprobar las seleccionadas',
		que_hace: 'Aprueba de una vez todas las imágenes tildadas.',
		repercute: [
			'Cada una pasa a verse en su artículo y en la tienda, igual que al aprobarlas de a una.',
			'Si alguna no se pudo aprobar (por ejemplo, porque el artículo se borró), se avisa cuántas y por qué; las demás se aprueban igual.',
		],
	},

	'imagenes-lote-rechazar': {
		titulo: 'Rechazar las seleccionadas',
		que_hace: 'Descarta de una vez todas las imágenes tildadas, después de confirmar.',
		repercute: [
			'Esos artículos quedan sin imagen y pasan a "No asignadas".',
		],
	},

	'imagenes-quitar-*': {
		titulo: 'Quitar la imagen',
		que_hace: 'Le saca al artículo la imagen que le puso esta asignación, después de confirmar.',
		repercute: [
			'Deja de verse en el artículo y en la tienda (Tienda Nube también se entera).',
			'El artículo pasa a "No asignadas".',
		],
	},

	'imagenes-diagnostico-*': {
		titulo: 'Ver qué se probó',
		que_hace: 'Despliega lo que se intentó con este artículo: la búsqueda por código de barras y por nombre, cuántos resultados dio cada una y por qué se descartó cada imagen.',
		repercute: [
			'Tocar una imagen abre, en otra pestaña, la página donde apareció.',
			'Si el motivo de una imagen no entra entero, tocarlo lo muestra completo; otro toque lo vuelve a achicar.',
		],
	},

	'imagenes-actualizar-lista': {
		titulo: 'Actualizar la lista',
		que_hace: 'Trae los artículos que la asignación procesó desde que se abrió la solapa.',
		repercute: [
			'Mientras la asignación corre, la lista no se mueve sola, para no cambiarle las filas de lugar a quien está revisando.',
		],
	},

	'imagenes-detener': {
		titulo: 'Detener la asignación',
		que_hace: 'Frena la asignación de imágenes en curso, después de confirmar.',
		repercute: [
			'Lo que ya se procesó queda como está; los artículos que faltaban no se buscan.',
			'Se puede reanudar después desde el mismo detalle.',
		],
		nota_interna: 'En las de todo el catálogo, solo el acceso maestro (la API contesta 403 al resto y el botón ni aparece); en las de selección y del asistente, cualquiera que las ve (plan §13). POST image-assignment-runs/{id}/detener.',
	},

	'imagenes-reanudar': {
		titulo: 'Reanudar la asignación',
		que_hace: 'Sigue la asignación desde el primer artículo que quedó sin procesar.',
		repercute: [
			'Vale para una asignación detenida, cortada o que parece trabada (no avanza hace más de 15 minutos).',
		],
		nota_interna: 'En las de todo el catálogo, solo el acceso maestro (la API contesta 403 al resto y el botón ni aparece); en las de selección y del asistente, cualquiera que las ve (plan §13). POST image-assignment-runs/{id}/reanudar.',
	},

	'imagenes-resumen-revisar': {
		titulo: 'Revisar en Alertas',
		que_hace: 'Abre esta asignación en Alertas → Imágenes, con el detalle de cada artículo.',
		repercute: [
			'Ahí se aprueban o se rechazan las imágenes que quedaron para revisar: hasta entonces no se ven en la tienda.',
		],
	},

	'imagenes-resumen-no-asignadas': {
		titulo: 'Artículos sin imagen',
		que_hace: 'Abre la asignación en Alertas → Imágenes, directo en los artículos a los que no se les encontró imagen, con el motivo de cada uno.',
	},

	'proceso-ver-en-alertas': {
		titulo: 'Ver en Alertas',
		que_hace: 'Abre esta asignación de imágenes en Alertas → Imágenes: qué se asignó, qué quedó para revisar y por qué no se encontró el resto.',
		repercute: [
			'Solo navega: no frena ni cambia la asignación.',
		],
		nota_interna: 'Vive en la fila del modal de procesos en segundo plano (Fila.vue), pero se documenta acá porque lleva a esta pestaña: descripciones/procesos.js no estaba en el alcance de la misión.',
	},

	/* ------------------------------------------------------------------ catálogo: categorías */

	/*
	 * Alertas → Catálogo → Categorías (misión categorizacion-tres-modelos, 5/10/2026). Los `repercute`
	 * salen de las reglas de negocio del plan de la misión (§4) y del código de la SPA: no hay spec de
	 * exploración que los mida todavía (la suite la corre Lucas).
	 *
	 * Vocabulario: cada tarjeta es un "sistema de categorías"; "propuesta" es palabra de la API y no se
	 * le muestra al cliente.
	 */

	'categorias-elegir-*': {
		titulo: 'Elegir este sistema de categorías',
		que_hace: 'Abre la confirmación para organizar tu catálogo con este sistema de categorías. Antes de aplicar nada, la confirmación muestra los números de lo que va a pasar.',
		repercute: [
			'Al confirmar se crean las categorías y subcategorías del sistema (si ya tenés una con el mismo nombre, se usa esa) y cada artículo que la IA ubicó con seguridad queda en su categoría.',
			'Los artículos que la IA no tiene claros quedan sin categoría hasta que los apruebes en la revisión.',
			'Mientras nadie revise ni cambie nada a mano, se puede volver atrás con "Cambiar de sistema".',
		],
		requiere: 'Ser el dueño del negocio o entrar con el acceso maestro. Si el negocio usa márgenes o listas de precios por categoría, o está conectado a Tienda Nube, los sistemas nuevos no se pueden elegir: queda la opción de mantener las categorías que ya tiene.',
		nota_interna: 'Botón de TarjetaSistema.vue. POST category-proposal-runs/{id}/elegir (plan §6.4): sincrónico, una transacción, todo o nada; 422 bloqueado_por_margenes / bloqueado_por_tienda_nube.',
	},

	'categorias-modal-confirmar': {
		titulo: 'Confirmar la elección',
		que_hace: 'Aplica a tu catálogo el sistema de categorías elegido, con los números que muestra esta pantalla.',
		repercute: [
			'Crea las categorías que falten y le asigna a cada artículo seguro su categoría, todo junto: si algo falla, no se aplica nada.',
			'Puede tardar unos segundos, según la cantidad de artículos: la pantalla queda en espera hasta que termina y, mientras tanto, el sistema puede ir más lento para vender o cargar. Conviene hacerlo cuando no se esté vendiendo, y que nadie edite artículos hasta que termine.',
			'Los artículos dudosos quedan sin categoría hasta que los apruebes.',
		],
		nota_interna: 'Dispara POST category-proposal-runs/{id}/elegir con {propuesta_id, eliminar_categorias_vacias}. El botón se apaga al primer clic: elegir dos veces la misma propuesta es inofensivo del lado de la API (200 con ya_estaba), pero no hace falta darle la oportunidad.',
	},

	'categorias-modal-cancelar': {
		titulo: 'Cancelar',
		que_hace: 'Cierra la confirmación sin elegir nada: tu catálogo no cambia.',
	},

	'categorias-modal-eliminar-vacias': {
		titulo: 'Eliminar las categorías anteriores que queden vacías',
		que_hace: 'Si está tildada, las categorías que el negocio ya tenía y que se queden sin artículos al elegir el sistema se quitan.',
		repercute: [
			'Así el menú de la tienda online no muestra categorías vacías.',
			'Solo se quitan las que quedan sin un solo artículo (ni en la categoría ni en sus subcategorías): una que todavía tiene artículos no se toca.',
			'Solo aparece con un sistema nuevo y si el negocio ya tenía categorías.',
		],
		nota_interna: 'Viaja como eliminar_categorias_vacias en el POST de elegir. La API las manda a la papelera (soft delete) y las anota en categorias_eliminadas para poder restaurarlas si se cambia de sistema.',
	},

	'categorias-cambiar-sistema': {
		titulo: 'Cambiar de sistema',
		que_hace: 'Deshace la elección y deja elegir otro sistema de categorías.',
		repercute: [
			'Los artículos vuelven a la categoría que tenían antes, las categorías que se crearon al elegir se quitan y las que se habían eliminado se restauran.',
			'Después se puede elegir cualquiera de los sistemas, incluido el mismo.',
			'Como al elegir, puede tardar unos segundos y frenar un poco las ventas y las cargas: conviene hacerlo cuando no se esté vendiendo, y que nadie edite artículos hasta que termine.',
		],
		requiere: 'Que nadie haya revisado artículos ni cambiado a mano categorías o artículos desde que se eligió. Si ya no se puede, el botón no aparece y el cartel de arriba dice por qué.',
		nota_interna: 'POST category-proposal-runs/{id}/volver-atras. Que se pueda lo decide la API (run.puede_cambiar y run.motivo_no_puede_cambiar, la misma función que valida el pedido): la SPA no lo deduce.',
	},

	'categorias-arbol-toggle-*': {
		titulo: 'Ver las categorías',
		que_hace: 'Muestra u oculta el árbol de categorías de este sistema, con la cantidad de artículos de cada una y las subcategorías que se despliegan.',
		repercute: [
			'Es solo para mirar: no cambia nada en tu catálogo.',
		],
	},

	'categorias-menu-toggle-*': {
		titulo: 'Cómo se vería en tu tienda',
		que_hace: 'Muestra un ejemplo del menú de categorías de tu tienda online con este sistema.',
		repercute: [
			'Es una vista previa: no cambia nada hasta que elijas el sistema.',
			'Muestra solo las categorías que tendrían artículos ubicados con seguridad; los dudosos no cuentan hasta que se aprueben.',
		],
	},

	'categorias-base-toggle-*': {
		titulo: 'En qué se basa',
		que_hace: 'Muestra en qué se basó ComercioCity para armar este sistema de categorías y para qué tipo de negocio sirve.',
	},

	'categorias-actualizar': {
		titulo: 'Actualizar',
		que_hace: 'Vuelve a preguntar si los sistemas de categorías ya están listos para elegir.',
		repercute: [
			'No cambia nada en tu catálogo. La pantalla también se actualiza sola cada tanto mientras se están preparando.',
		],
	},

	'categorias-sin-confirmar-actualizar': {
		titulo: 'Actualizar',
		que_hace: 'Vuelve a leer cómo quedó el sistema de categorías después de una acción que tardó demasiado o falló sin que se sepa cómo terminó.',
		repercute: [
			'No cambia nada en tu catálogo: solo muestra el estado real.',
			'Si la acción se había aplicado igual, la pantalla pasa a mostrar el resultado.',
		],
		nota_interna: 'Vive en el aviso de Index.vue que sale cuando elegir o volver atrás falla por tiempo de espera o error de servidor (sin respuesta o 5xx): la API pudo haberlo aplicado igual. Llama al mismo método que el "Actualizar" de la vista preparando.',
	},

	'categorias-reintentar': {
		titulo: 'Reintentar',
		que_hace: 'Vuelve a pedir los sistemas de categorías después de un error de conexión.',
	},

	'categorias-items-reintentar': {
		titulo: 'Reintentar',
		que_hace: 'Vuelve a pedir los artículos de la solapa después de un error de conexión.',
	},

	'categorias-buscador': {
		titulo: 'Buscar artículos en la revisión',
		que_hace: 'Filtra los artículos de la solapa abierta por nombre, código de barras o código de proveedor.',
		repercute: [
			'Busca solo entre los artículos del sistema que elegiste, no en todo el catálogo.',
		],
	},

	'categorias-por-pagina': {
		titulo: 'Artículos por página',
		que_hace: 'Cambia cuántos artículos se ven por página en la solapa: 25, 50 o 100.',
	},

	'categorias-aprobar-*': {
		titulo: 'Aprobar la sugerencia',
		que_hace: 'Le asigna al artículo la categoría que sugirió la IA.',
		repercute: [
			'Si la categoría o la subcategoría todavía no existen, se crean en ese momento.',
			'El artículo queda en esa categoría en todo el sistema, también en tu tienda online.',
			'Después de aprobar o rechazar un artículo ya no se puede cambiar de sistema.',
		],
		nota_interna: 'POST category-proposal-items/{id}/aprobar. Solo ítems en estado a_revisar; la primera revisión setea revision_iniciada_at, que cierra la regla de volver atrás.',
	},

	'categorias-rechazar-*': {
		titulo: 'Rechazar la sugerencia',
		que_hace: 'Descarta la categoría que sugirió la IA: el artículo sigue sin categoría y pasa a la solapa Sin categoría.',
		repercute: [
			'No se crea ninguna categoría.',
			'Después de aprobar o rechazar un artículo ya no se puede cambiar de sistema.',
		],
	},

	'categorias-seleccionar-pagina': {
		titulo: 'Seleccionar la página',
		que_hace: 'Tilda todos los artículos para revisar de la página que se ve, para aprobarlos o rechazarlos juntos.',
		repercute: [
			'Solo toma los de esta página: los de las páginas siguientes no se tildan.',
		],
	},

	'categorias-tilde-*': {
		titulo: 'Seleccionar este artículo',
		que_hace: 'Lo suma a los que se van a aprobar o rechazar juntos.',
	},

	'categorias-lote-aprobar': {
		titulo: 'Aprobar los seleccionados',
		que_hace: 'Aprueba de una vez todos los artículos tildados, después de confirmar.',
		repercute: [
			'A cada uno se le asigna la categoría que sugirió la IA, igual que al aprobarlos de a uno; las que todavía no existen se crean.',
			'Si alguno ya no estaba para revisar, se avisa cuántos; los demás se aprueban igual.',
		],
	},

	'categorias-lote-rechazar': {
		titulo: 'Rechazar los seleccionados',
		que_hace: 'Descarta de una vez la sugerencia de todos los artículos tildados, después de confirmar.',
		repercute: [
			'Esos artículos siguen sin categoría y pasan a la solapa Sin categoría.',
		],
	},
}
