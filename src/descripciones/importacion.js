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
		que_hace: 'Sube el archivo y Claude propone qué columna del Excel corresponde a cada propiedad del sistema.',
		repercute: [
			'El análisis corre en segundo plano: se puede cerrar la ventana y seguir trabajando.',
			'Todavía no importa nada: el mapeo se revisa y se confirma en el paso siguiente.',
		],
		requiere: 'Un archivo elegido y, si el libro tiene varias hojas, una hoja elegida. Sin eso el botón está deshabilitado.',
		nota_interna: 'El resultado se espera por polling HTTP (analysis_polling en Index.vue), no por broadcast. Con la API key de Anthropic inválida el análisis muere con estado "error" y el mensaje genérico "El servicio de IA rechazó el pedido" (medido el 2/9/2026 con una key vencida: el motivo real —401 authentication_error— queda solo en el log de Laravel).',
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
		],
		nota_interna: 'Los valores de sucursal viajan como address_{id}_amount/min/max y los de lista como price_type_{id}_final_price/_percentage/_setear (build_columns los traduce a las claves planas de ProcessRow). Si se mapean a la vez "Stock actual" y columnas de sucursal, el global se ignora sin aviso (ProcessRow::obtener_stock, líneas 3006-3035).',
	},

	'ai-import-btn-confirmar-mapeo': {
		titulo: 'Confirmar y configurar importación',
		que_hace: 'Da por bueno el mapeo y pasa al paso de duplicados, donde Claude recomienda una configuración.',
		repercute: [
			'El sistema recorre el archivo y cuenta códigos repetidos (en el archivo y contra lo ya cargado): de eso salen las decisiones del paso 3.',
		],
	},

	'ai-import-politica-intra-*': {
		titulo: 'Filas repetidas dentro del archivo',
		que_hace: 'Decide qué son las filas que comparten código de proveedor en este mismo Excel.',
		repercute: [
			'"El mismo producto": las filas repetidas se tratan como una sola y el detalle de qué fila pisó a cuál se reporta al final.',
			'"Productos distintos": cada fila crea su propio artículo aunque compartan el código.',
		],
		nota_interna: 'Viaja como filas_repetidas_del_archivo = ultima_gana | productos_distintos. Solo gobierna el escalón provider_code: un código de barras repetido en el archivo se mergea SIEMPRE con última-gana. 🔴 DEFECTO ABIERTO (2/9/2026, exploración de importación): con la política de colisión "Actualizar todos" (permitir_provider_code_repetido=1), ProcessRow::esta_repetido() (~línea 2663) saltea la detección intra-archivo por provider_code —quedó colgada del flag viejo— y "última gana" NO fusiona: cada fila crea su artículo. Fijado en exploracion-importacion-codigos.spec.js (test 4a); cuando se corrija, actualizar también este texto a la promesa completa ("queda la información de la última aparición").',
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
