/**
 * Descripciones de los controles del modal de importación de Excel con IA
 * (components/listado/modals/ai-excel-import/Index.vue) y del modal de resultado.
 *
 * Escritas durante la exploración del módulo del 2/9/2026 (slot s8): cada `repercute` se midió
 * por diferencia contra la base (specs exploracion-importacion-*.spec.js) o se verificó contra
 * el código con archivo y línea. No inventar acá: el operador le cree al popover.
 */
export default {

	'ai-import-archivo': {
		titulo: 'Archivo Excel a importar',
		que_hace: 'Elige la planilla (.xlsx) y lee sus filas para detectar la última con contenido y la fila del encabezado.',
		repercute: [
			'Si el libro tiene varias hojas, aparece el selector de hoja y no se analiza nada hasta elegir una.',
		],
		requiere: 'Un Excel viejo (.xls) no se puede leer: hay que abrirlo en Excel y guardarlo como .xlsx.',
	},

	'ai-import-hoja': {
		titulo: 'Hoja del libro a importar',
		que_hace: 'Elige cuál de las hojas del archivo se analiza y se importa.',
		repercute: [
			'Todo el análisis y la importación usan solo esa hoja; las demás no se leen.',
			'Al cambiar de hoja se recalculan la última fila y el encabezado detectado.',
		],
		requiere: 'Con más de una hoja, el botón "Analizar con IA" queda deshabilitado hasta elegir una.',
	},

	'ai-import-btn-analizar': {
		titulo: 'Analizar con IA',
		que_hace: 'Sube el archivo y la IA propone qué columna del Excel corresponde a cada propiedad del sistema.',
		repercute: [
			'El análisis corre en segundo plano: se puede cerrar la ventana y seguir trabajando.',
			'Todavía no importa nada: el mapeo se revisa y se confirma en el paso siguiente.',
		],
		requiere: 'Un archivo elegido y, si el libro tiene varias hojas, una hoja elegida. Sin eso el botón está deshabilitado.',
		nota_interna: 'El resultado se espera por polling HTTP (analysis_polling en Index.vue), no por broadcast. El modelo de IA lo elige el admin por cliente (default DeepSeek Pro; sin DEEPSEEK_API_KEY cae a Anthropic, misión modelos-ia-por-cliente 30/9/2026). Con la API key del proveedor inválida el análisis muere con estado "error" y el mensaje genérico "El servicio de IA rechazó el pedido" (medido el 2/9/2026 con una key vencida: el motivo real —401 authentication_error— queda solo en el log de Laravel).',
	},

	'ai-import-proveedor': {
		titulo: 'Proveedor de la importación',
		que_hace: 'Asigna todos los artículos del Excel a este proveedor.',
		repercute: [
			'Si el Excel además trae una columna de proveedor, elegir uno acá la pisa para todas las filas.',
			'Con "Sin proveedor", cada fila usa el proveedor de su columna (si se mapeó una).',
		],
	},

	'ai-import-mapeo-*': {
		titulo: 'Propiedad del sistema para esta columna',
		que_hace: 'Dice qué dato del artículo se carga con esta columna del Excel. "Ignorar columna" la deja afuera.',
		repercute: [
			'Con sucursales creadas aparece el grupo "Stock por depósito": el número de esa columna pasa a ser el stock final de ESA sucursal.',
			'Con listas de precios aparece el grupo "Listas de precio": $ final, % de margen y "setear precio final" de cada lista.',
			'Con la tienda online, cada lista que muestra en la tienda solo los artículos habilitados suma "Visible en tienda: <lista>": un Sí habilita el artículo para los clientes de esa lista y un No lo deja sin habilitar. Una celda vacía, o con algo que no sea un Sí o un No, no cambia lo que el artículo ya tenía.',
		],
		nota_interna: 'Los valores de sucursal viajan como address_{id}_amount/min/max y los de lista como price_type_{id}_final_price/_percentage/_setear/_visible_en_tienda (build_columns los traduce a las claves planas de ProcessRow; visible_en_tienda va como visible_en_tienda_<nombre de la lista normalizado>, mision catalogo-por-lista-tienda 5/10/2026). La opcion de visible_en_tienda solo se ofrece con la extension online y la lista con catalogo_restringido_en_tienda = 1. Si se mapean a la vez "Stock actual" y columnas de sucursal, el global se ignora sin aviso (ProcessRow::obtener_stock, líneas 3006-3035).',
	},

	'ai-import-mapeo-guardado-*': {
		titulo: 'Columna con configuración guardada',
		que_hace: 'Avisa que la propiedad de esta columna sale de lo que confirmaste la última vez que importaste de este proveedor, no de lo que propuso la IA esta vez.',
		repercute: [
			'Si dice "corregiste", la última vez cambiaste a mano lo que la IA había propuesto (típico: la columna "Precio" del proveedor es tu costo) y el sistema ya la deja así.',
			'Si dice "confirmaste", la IA propuso lo mismo que vos dejaste la última vez.',
			'Podés cambiar el select igual: lo que confirmes ahora es lo que se guarda para la próxima importación de este proveedor.',
		],
		nota_interna: 'Viene en resultado.column_mapping[i].mapeo_guardado ({system_property, origen, guardado_en, proveedor}) del análisis; lo arma ProviderImportMappingHelper::aplicar() de empresa-api a partir de provider_import_mappings (una fila por dueño + proveedor, escrita al confirmar el paso 2 en POST get-recomendacion, misión importacion-excel-motor-rapido 24/9/2026). El formato se reconoce por la firma sha1 de los encabezados normalizados; si no coincide, se usa la configuración del proveedor que infirió la IA. Un depósito o lista de precio que ya no existe no se aplica. normalize_column_mapping() conserva la clave a propósito.',
	},

	'ai-import-aplicar-mapeo-guardado': {
		titulo: 'Aplicar la configuración guardada del proveedor',
		que_hace: 'Cambia las columnas de la tabla a lo que confirmaste la última vez que importaste de este proveedor.',
		repercute: [
			'Sólo toca las columnas que quedarían distintas; las que ya coinciden no cambian.',
			'Nunca se aplica sola: si cambiás el proveedor y hay una configuración guardada distinta, aparece este aviso y decidís vos.',
		],
		requiere: 'Aparece sólo si el proveedor elegido tiene una configuración guardada que difiere de la tabla.',
		nota_interna: 'refresh_provider_stats() lee mapeo_guardado_del_proveedor ([{excel_column_index, excel_column, system_property, origen}] | null) y ofrecer_mapeo_guardado() lo compara contra column_mapping por excel_column_index. El watch de selected_provider_id dispara el request siempre que haya excel_path, tenga o no el archivo columna de código de proveedor (sin esa columna el backend devuelve los conteos en cero sin leer el archivo).',
	},

	'ai-import-btn-confirmar-mapeo': {
		titulo: 'Confirmar y configurar importación',
		que_hace: 'Da por bueno el mapeo y pasa al paso de duplicados, donde la IA recomienda una configuración.',
		repercute: [
			'El sistema recorre el archivo y cuenta códigos repetidos (en el archivo y contra lo ya cargado): de eso salen las decisiones del paso 3.',
			'También revisa si los nombres de proveedor, categoría, subcategoría y marca (en clientes: provincia, localidad, vendedor y lista de precios; en proveedores: localidad) se parecen a otros que ya tenés cargados, para que no se creen duplicados.',
			'En clientes y proveedores el paso 3 es solo esa revisión: si no encuentra nombres parecidos, pasa directo a las opciones finales.',
		],
	},

	'ai-import-politica-intra-*': {
		titulo: 'Filas repetidas dentro del archivo',
		que_hace: 'Decide qué son las filas que comparten código de proveedor en este mismo Excel.',
		repercute: [
			'"El mismo producto": queda la información de la última aparición de cada código, y el detalle de qué fila pisó a cuál se reporta al terminar.',
			'"Productos distintos": cada fila crea su propio artículo aunque compartan el código.',
			'Es una decisión sobre ESTE archivo y es independiente de lo que se elija para los códigos que ya existen en el sistema: las dos preguntas se responden por separado.',
		],
		nota_interna: 'Viaja como filas_repetidas_del_archivo = ultima_gana | productos_distintos. Solo gobierna el escalón provider_code: un código de barras repetido en el archivo se mergea SIEMPRE con última-gana. Hasta el 2/9/2026 esta elección quedaba ANULADA si además se elegía "Actualizar todos" (permitir_provider_code_repetido=1): ProcessRow::esta_repetido() apagaba con ese flag su escalón provider_code, que decide sobre el archivo y no sobre la base, y no fusionaba nada. Arreglado ese día (misión fix-ultima-gana-con-actualizar-todos); lo custodian RepetidosConPermitirRepetidoTest en empresa-api y el test 4a de exploracion-importacion-codigos.spec.js.',
	},

	'ai-import-politica-colision-*': {
		titulo: 'El código coincide con artículos ya cargados',
		que_hace: 'Decide qué pasa cuando el código de proveedor de una fila ya existe en el sistema.',
		repercute: [
			'"Actualizar todos": una sola fila actualiza TODOS los artículos que tengan ese código, sin importar cuántos sean.',
			'"Saltear y avisarme": esas filas no tocan nada y quedan reportadas en el historial.',
			'"No identificar por código": se crean artículos nuevos aunque el código exista (así aparecen los duplicados a propósito).',
		],
		nota_interna: 'derive_flags_from_choice (Index.vue ~4157) traduce a los flags viejos: actualizar_todos prende permitir_provider_code_repetido + en_multi_providers; crear_nuevo apaga actualizar_por_provider_code; saltear_y_reportar deja la combinación que produce AmbiguousMatch. actualizar_proveedor queda SIEMPRE en 0 en este flujo (no hay forma de reasignar proveedor desde el modal de IA; el clásico de compras sí lo permitía).',
	},

	'ai-import-politica-otro-*': {
		titulo: 'El código existe en otros proveedores',
		que_hace: 'Decide si los artículos de OTRO proveedor con ese mismo código se actualizan o se dejan como están.',
		repercute: [
			'"Ignorar": los del otro proveedor no se tocan y se crean artículos nuevos para el proveedor elegido.',
			'"Actualizar": las filas pisan los artículos del otro proveedor (para corregir importaciones que entraron con el proveedor equivocado).',
		],
	},

	/*
	 * Nombres parecidos (misión importacion-relaciones-parecidas, 8/10/2026). Sale en el paso 3
	 * (al final en artículos; solo eso en clientes y proveedores). Lo que hace cada opción del
	 * lado del backend está en el plan de la misión, "Resolución en el worker".
	 */
	'ai-import-relaciones-lista': {
		titulo: 'Nombres parecidos',
		que_hace: 'Lista los nombres del Excel que se parecen a otros que ya tenés cargados, o que se parecen entre sí dentro del mismo archivo. En artículos: proveedor, categoría, subcategoría y marca; en clientes: provincia, localidad, vendedor y lista de precios; en proveedores: localidad.',
		repercute: [
			'Cada nombre trae marcada la opción que proponemos: si no tocás nada, se importa con esa opción.',
			'"Es «…», que ya está cargado" lleva las filas con ese nombre al que ya existe, sin crear otro.',
			'"Es uno nuevo" crea uno con el nombre exacto del Excel, aunque exista otro que solo cambia en mayúsculas o tildes.',
			'Cuando elegís uno que ya está cargado, queda recordado para tu comercio: la próxima importación con ese mismo nombre lo trae resuelto, en "Confirmadas en importaciones anteriores".',
		],
		requiere: 'Aparece solo si el archivo trae nombres parecidos. Un nombre escrito exactamente igual que uno cargado no se pregunta nunca.',
		nota_interna: 'Viene en resultado.relaciones_parecidas de la corrida de get-recomendacion, que el SPA pide con chequear_relaciones: true (sin la bandera el backend no lo calcula). Las elecciones viajan como equivalencias [{ tipo, valor, padre?, accion: usar|crear|unir, id?|con? }] en POST ai-excel-import/import, para los tres modelos, y solo si hubo lista. Lo que se ve y lo que se manda lo decide ai-excel-import/relaciones_parecidas.js: la API manda cada subcategoría (o localidad) una vez por cada resolución posible de su categoría (o provincia), con padre_ref ("id:X" / "nuevo:<nombre>"), y se ve y viaja solo la que coincide con lo elegido para el padre; con una API sin padre_ref, la que no coincide con padre_id se oculta y no viaja. Un clic redibuja un solo ítem (RelacionesParecidasItem.vue) y la lista llega congelada (Object.freeze): con cientos de ítems no se nota. Del lado de la API, "usar" guarda la equivalencia en import_equivalencias, "crear" la borra y "unir" la guarda el worker cuando conoce el id.',
	},

	'ai-import-relaciones-opcion-*': {
		titulo: 'Qué es este nombre',
		que_hace: 'Decide a qué registro van las filas del Excel que traen este nombre.',
		repercute: [
			'"Es «…», que ya está cargado": las filas se asignan al existente y no se crea nada.',
			'"Es uno nuevo": se crea uno con el nombre exacto del Excel; las filas que traen el nombre del existente siguen yendo al existente.',
			'"Es el mismo que «…» (también nuevo)": los dos nombres se cargan como uno solo, con el nombre que más se repite en el archivo.',
			'"Son distintos": se crean los dos.',
		],
		nota_interna: 'El índice elegido es el de opciones[] del ítem (decisiones_relaciones de Index.vue). En subcategoría, "usar" solo se aplica si la subcategoría elegida pertenece a la categoría que resolvió la fila; si no, el worker la ignora y sigue el camino normal. Lo mismo para localidad dentro de provincia. El testid queda en el input del radio, que está oculto: la ayuda no aparece al pasar el mouse por el texto.',
	},

	'ai-import-relaciones-usar-todas': {
		titulo: 'Usar el existente en todas',
		que_hace: 'Marca en todos los nombres pendientes la opción "es el que ya está cargado" (o "es el mismo", cuando los dos nombres parecidos son nuevos).',
		repercute: [
			'Ningún nombre de la lista crea un registro aparte: se asigna al que ya existe, y los parecidos entre sí se cargan como uno solo.',
			'No toca las confirmadas en importaciones anteriores: esas se cambian de a una.',
			'Es solo una marca en pantalla: después podés cambiar cualquier nombre, uno por uno.',
		],
		requiere: 'Aparece con dos o más nombres pendientes de revisar.',
	},

	'ai-import-relaciones-crear-todas': {
		titulo: 'Crear todas como nuevas',
		que_hace: 'Marca en todos los nombres pendientes la opción "es uno nuevo".',
		repercute: [
			'Cada nombre se carga tal como está escrito en el Excel, aunque ya exista uno que solo cambia en mayúsculas, tildes o espacios: puede dejar duplicados.',
			'Si una categoría pasa a ser nueva, sus subcategorías se vuelven a comparar contra esa categoría nueva: pueden cambiar las que se preguntan.',
			'No toca las confirmadas en importaciones anteriores.',
		],
		requiere: 'Aparece con dos o más nombres pendientes de revisar.',
		nota_interna: 'Viaja como accion "crear" por cada ítem: el worker busca un registro con ese nombre exacto (comparación binaria) y, si no hay, lo crea; además el controller borra la equivalencia recordada de ese valor si existía.',
	},

	'ai-import-relaciones-recordadas': {
		titulo: 'Confirmadas en importaciones anteriores',
		que_hace: 'Despliega los nombres que tu comercio ya resolvió en una importación anterior. Vienen marcados como los dejaste.',
		repercute: [
			'Si no los tocás, se importan igual que la vez pasada.',
			'Si cambiás uno a "es uno nuevo", deja de estar recordado y la próxima importación no lo va a traer resuelto.',
		],
		nota_interna: 'Ítems con motivo "recordado" (tabla import_equivalencias: user_id, tipo, contexto_id, valor_clave -> model_id, solo si el modelo sigue vivo). La equivalencia también se aplica en los caminos que no muestran esta lista (AdminSync, import clásico). Arranca plegado por decisión de Lucas.',
	},

	'ai-import-relaciones-recortado': {
		titulo: 'Revisión acotada',
		que_hace: 'Avisa que el archivo tiene tantos nombres que solo se revisaron los más probables.',
		repercute: [
			'Puede haber nombres parecidos a otros cargados que no aparecen en la lista: esos se cargan como en cualquier importación: el que coincide con uno ya cargado, aunque cambien las mayúsculas, se asigna a ese, y el resto se crea.',
		],
		nota_interna: 'relaciones_parecidas.recortado === true: alguna capa del chequeo se acotó (más ítems de los que entran en la IA, una columna con demasiados valores distintos o el presupuesto de comparaciones agotado). Tanda 2 de la misión importacion-relaciones-parecidas.',
	},

	'ai-import-relaciones-sin-ia': {
		titulo: 'Revisión sin IA',
		que_hace: 'Avisa que no se pudo consultar a la IA: la lista salió solo de la comparación automática de los nombres.',
		repercute: [
			'Los que solo cambian en mayúsculas, tildes o espacios vienen marcados como el que ya está cargado.',
			'El resto viene marcado como nuevo, que es lo que pasaría sin esta revisión: conviene mirarlos uno por uno.',
		],
		nota_interna: 'relaciones_parecidas.ia_consultada === false. Fallback del chequeo cuando la IA falla (error, timeout o JSON inválido): quedan los de clave fuerte y, de los parecidos, solo los de puntaje >= 0,85, con motivo "posible" y preseleccionados en "crear".',
	},

	'ai-import-relaciones-saltear': {
		titulo: 'Seguir sin revisar los nombres',
		que_hace: 'Deja de esperar la revisión de nombres parecidos y pasa a las opciones de importación.',
		repercute: [
			'La importación funciona como siempre: los nombres que ya existen se asignan y los que no, se crean.',
		],
		requiere: 'Solo en clientes y proveedores, cuando la revisión tarda más de 20 segundos.',
		nota_interna: 'Suelta el polling, marca la corrida como vista (no la cancela: es un job y termina igual) y la anota en excel_analysis.salteados (si el POST de get-recomendacion todavía no volvió, se anota el token y la marca se hace al volver el POST, con el uuid nuevo: tokens_salteados_en_vuelo en Index.vue): cuando termina, el broadcast excel_analysis_ready llega igual, pero ExcelAnalysisReadyModal cancela su apertura (evento show) para no ofrecer "Ver resultado" sobre un archivo que el usuario ya pudo haber importado. Aparece a los 20 s contados desde el clic en Confirmar, aunque la corrida siga "en espera" (cola ocupada o sin worker). Si la corrida falla o se pierde la conexión, clientes y proveedores siguen al paso 4 solos, sin mostrar error; lo mismo si la revisión se retoma después de cerrar el modal.',
	},

	'ai-import-btn-continuar': {
		titulo: 'Continuar al último paso',
		que_hace: 'Cierra las decisiones de duplicados y pasa a las opciones finales.',
		requiere: 'Queda deshabilitado hasta responder las decisiones que hayan aparecido (si el archivo trae códigos repetidos o coincidencias, hay que elegir qué hacer con ellas).',
	},

	'ai-import-operacion-solo-editar': {
		titulo: 'Solo editar existentes',
		que_hace: 'Las filas que no coinciden con ningún artículo cargado se saltean: no se crea nada nuevo.',
		repercute: [
			'Sirve para actualizar costos o stock sin riesgo de meter artículos duplicados por un código mal escrito.',
		],
	},

	'ai-import-operacion-crear-y-editar': {
		titulo: 'Cargar nuevos y editar existentes',
		que_hace: 'Las filas que coinciden actualizan el artículo; las que no coinciden crean uno nuevo.',
		repercute: [
			'Un artículo nuevo nace con IVA 21% y "aplicar IVA" activo si el Excel no dice otra cosa, y queda relacionado con TODAS las listas de precios de la cuenta con el margen por defecto de cada una.',
		],
	},

	'ai-import-precios_incluyen_iva': {
		titulo: 'Los costos de la planilla son brutos',
		que_hace: 'Declara que los costos del Excel ya traen el IVA adentro.',
		repercute: [
			'El sistema le descuenta el IVA a cada costo con la alícuota de ese artículo antes de guardarlo (el costo se guarda siempre neto).',
			'Un artículo Exento, No Gravado o al 0% no tiene IVA para descontar: su costo se importa tal cual.',
		],
		requiere: 'Dejarla apagada si los costos ya son netos: activarla sobre costos netos los achica un 21% en silencio.',
	},

	'ai-import-vaciar_valores_en_blanco': {
		titulo: 'Las celdas vacías borran el dato cargado',
		que_hace: 'Hace que una celda vacía del Excel VACÍE esa propiedad en el sistema, en vez de ignorarse.',
		repercute: [
			'Solo afecta a las columnas mapeadas: lo que no está en el archivo no se toca.',
			'Puede vaciar una propiedad en miles de artículos de una sola importación, y no hay forma de deshacerlo desde acá.',
		],
		requiere: 'Apagada por defecto, y es lo seguro: con ella apagada una celda vacía deja el valor que ya estaba.',
	},

	'ai-import-fila-desde': {
		titulo: 'Primera fila a importar',
		que_hace: 'La importación arranca en esta fila del Excel (la 2 cuando la 1 es el encabezado).',
	},

	'ai-import-fila-hasta': {
		titulo: 'Última fila a importar',
		que_hace: 'La importación corta en esta fila. Vacío importa hasta la última con contenido.',
	},

	'ai-import-btn-importar': {
		titulo: 'Importar',
		que_hace: 'Encola la importación con todo lo configurado. Corre en segundo plano y avisa al terminar.',
		repercute: [
			'Un costo nuevo recalcula el costo real, el precio final y el precio de cada lista de precios del artículo; una lista con "setear precio final" conserva su precio y lo que cambia es su margen.',
			'El stock por sucursal se compara contra el actual y la diferencia queda como movimiento de stock ("Importacion de excel") hacia esa sucursal; si el número coincide, no se genera ningún movimiento.',
			'Las categorías del Excel que no existen se crean; las que existen se asignan aunque estén escritas con otras mayúsculas.',
			'Si apareció la lista de nombres parecidos, cada uno de esos nombres se carga según lo que elegiste ahí.',
			'Cada sobrescritura, fila salteada o valor ilegible queda en el Historial de importaciones, con su número de fila.',
		],
		requiere: 'Elegir una de las dos operaciones (solo editar / crear y editar); sin eso el botón está deshabilitado.',
	},

	'resultado-importacion-metrica': {
		titulo: 'Resultado de la importación',
		que_hace: 'Cuánto procesó la importación: filas leídas, artículos creados, coincidencias y actualizados.',
		repercute: [
			'"Creados con código repetido" aparece solo si algún artículo nuevo comparte código con uno ya cargado: es la señal de revisar la política de duplicados usada.',
		],
	},
}
