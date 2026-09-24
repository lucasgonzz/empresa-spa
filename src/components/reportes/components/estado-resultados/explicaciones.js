/**
 * Textos de las explicaciones (popover al pasar el mouse / tocar) de cada fila del Estado de
 * Resultados, de "Ventas brutas" a "Resultado neto". Módulo de funciones puras, sin Vue: recibe el
 * modelo que devuelve la API (`api/reportes/estado-resultados`) y devuelve el objeto que dibuja
 * `common/ExplicacionDeNumero.vue`.
 *
 * Dónde vive cada cosa, para quien tenga que corregir un texto (todo en empresa-api):
 *   · el armado de la cascada          → `EstadoResultadosHelper`
 *   · qué suma cada renglón y con qué fecha → `ContabilidadRepository`
 *       ventas_brutas() · devoluciones() · costo_mercaderia_vendida() · costo_mercaderia_devuelta()
 *       gastos_por_categoria() · comisiones_de_cobro() · iibb_determinado() · ventas_con_iva_sin_medir()
 *   · cuánto IVA declaró una venta       → `IvaDeVentaHelper`
 *   · cuánto IVA trae adentro el costo   → `CostoDeVentaHelper`
 * Cada frase está escrita leyendo esos archivos. Si una regla cambia allá, se cambia el texto acá: una
 * explicación que contradice al número es peor que no tener ninguna.
 *
 * 🔴 Lo que depende de la configuración del comercio NO se afirma: se redacta condicional ("si tu
 * cuenta guarda los costos con IVA...") o sale del dato del modelo (moneda, cantidad de ventas con IVA
 * sin medir, categorías de gasto). Nada de lo que hay acá es un supuesto sobre el comercio.
 *
 * Lenguaje de comerciante: sin nombres de clases, tablas ni columnas.
 */

/**
 * Formatea un importe. Un cero se escribe "$0" y no "-" (que es lo que devuelve el `price()` del
 * sistema para un valor falsy): dentro de una cuenta, un guión parece un dato que falta.
 *
 * @param {Function} formatear
 * @param {number|null} valor
 * @returns {string}
 */
function dinero(formatear, valor) {
	if (valor === null || typeof valor == 'undefined') {
		return '—'
	}
	if (Number(valor) === 0) {
		return '$0'
	}
	return formatear(valor)
}

/**
 * De 'AAAA-MM-DD' (o con hora) a 'DD/MM/AAAA'. Se parte el texto en vez de pasarlo por `Date`, que
 * interpreta 'AAAA-MM-DD' como UTC y en Argentina lo corre un día para atrás.
 *
 * @param {string} fecha
 * @returns {string}
 */
function fecha_corta(fecha) {
	let partes = String(fecha || '').substr(0, 10).split('-')
	if (partes.length != 3) {
		return ''
	}
	return partes[2] + '/' + partes[1] + '/' + partes[0]
}

/**
 * "el 24/09/2026" o "entre el 01/09/2026 y el 24/09/2026". Si el modelo no trae fechas, no se inventa
 * un período: se habla de "el período elegido".
 *
 * @param {Object} model
 * @returns {string}
 */
function periodo(model) {
	let desde = fecha_corta(model.desde)
	let hasta = fecha_corta(model.hasta)
	if (!desde || !hasta) {
		return 'en el período elegido'
	}
	if (desde == hasta) {
		return 'el ' + desde
	}
	return 'entre el ' + desde + ' y el ' + hasta
}

/**
 * Aclaración que se suma cuando el reporte no está en pesos. Las filas por moneda (ventas, costos,
 * gastos, comisiones) la llevan; las que no dependen de la moneda (IIBB) la explican a su manera.
 *
 * @param {Object} model
 * @returns {string|null}
 */
function nota_de_moneda(model) {
	if (model.moneda == 'dolares') {
		return 'Vista en dólares: solo lo hecho en dólares, expresado en dólares.'
	}
	if (model.moneda == 'consolidado') {
		return 'Vista consolidada: lo hecho en dólares se pasa a pesos con la cotización de hoy (una estimación, no la de cada operación) y se suma a lo hecho en pesos.'
	}
	return null
}

/**
 * Aviso de las ventas facturadas cuyo IVA todavía no se pudo medir. Con ese dato faltante la venta
 * entra completa (con su IVA adentro), y por eso todo lo que sale de ventas puede quedar algo alto.
 *
 * @param {Object} model
 * @returns {string|null}
 */
function aviso_de_iva_sin_medir(model) {
	let cantidad = Number(model.ventas_con_iva_sin_medir) || 0
	if (cantidad <= 0) {
		return null
	}
	if (cantidad == 1) {
		return '1 venta tiene factura autorizada con el IVA sin medir: entra completa, con su IVA adentro, así que este número puede estar algo alto.'
	}
	return cantidad + ' ventas tienen factura autorizada con el IVA sin medir: entran completas, con su IVA adentro, así que este número puede estar algo alto.'
}

/**
 * La frase del porcentaje que se ve al lado de las filas que restan.
 *
 * @returns {string}
 */
function frase_del_porcentaje() {
	return 'El % de al lado es su peso sobre las ventas netas.'
}

/**
 * Una explicación arma su lista de avisos con lo que aplique; si no hay ninguno no lleva el campo.
 *
 * @param {Object} explicacion
 * @param {Array} avisos textos o null.
 * @returns {Object}
 */
function con_avisos(explicacion, avisos) {
	let reales = avisos.filter(aviso => !!aviso)
	if (reales.length) {
		explicacion.avisos = reales
	}
	return explicacion
}

/**
 * Sección de "Qué tener en cuenta" con la nota de moneda, si corresponde. Devuelve una lista de
 * secciones para poder concatenarla sin preguntar cada vez.
 *
 * @param {Object} model
 * @returns {Array}
 */
function seccion_de_moneda(model) {
	let nota = nota_de_moneda(model)
	if (!nota) {
		return []
	}
	return [{ titulo: 'Moneda', parrafos: [nota] }]
}

function ventas_brutas(model) {
	return con_avisos({
		titulo: 'Ventas brutas',
		resumen: 'Todo lo vendido ' + periodo(model) + ', sin el IVA de las facturas.',
		iva: {
			tono: 'no',
			etiqueta: 'Sin IVA',
			detalle: 'A cada venta con factura se le resta el IVA de su comprobante. Las ventas sin factura no declararon IVA y entran completas.',
		},
		secciones: [
			{
				titulo: 'De dónde sale',
				items: [
					'Suma el total de cada venta terminada, por su fecha de carga (no la de emisión de la factura).',
					'Si varias ventas se facturaron juntas, su IVA se reparte entre ellas. Las facturas de exportación no tienen IVA.',
					'No incluye las ventas sin terminar ni las "contenedoras" de facturación (así nada se cuenta dos veces). Las devoluciones se restan en la fila de abajo.',
					'El Total del módulo de Ventas incluye el IVA de las facturas y no mide exactamente el mismo conjunto de ventas (deja afuera las que están en revisión o con estado), así que no coincide con este número.',
				],
			},
		].concat(seccion_de_moneda(model)),
	}, [aviso_de_iva_sin_medir(model)])
}

function devoluciones(model) {
	return {
		titulo: 'Devoluciones',
		resumen: 'Lo devuelto a los clientes con notas de crédito ' + periodo(model) + ', sin IVA.',
		iva: {
			tono: 'no',
			etiqueta: 'Sin IVA',
			detalle: 'Cada nota cuenta por su importe menos el IVA que declaró. Una nota sin el IVA medido (las anteriores al 1/9/2026) entra completa.',
		},
		secciones: [
			{
				titulo: 'De dónde sale',
				items: [
					'Suma las notas de crédito emitidas en el período, por la fecha de la nota (no la de la venta que devuelve).',
					'Se restan de las Ventas brutas para dar las Ventas netas.',
					frase_del_porcentaje(),
				],
			},
		].concat(seccion_de_moneda(model)),
	}
}

function ventas_netas(model, formatear) {
	return {
		titulo: 'Ventas netas',
		resumen: 'Lo que efectivamente vendiste ' + periodo(model) + ': sin IVA y sin lo devuelto.',
		iva: {
			tono: 'no',
			etiqueta: 'Sin IVA',
			detalle: 'Las dos filas que la forman están sin IVA.',
		},
		secciones: [
			{
				titulo: 'De dónde sale',
				items: [
					'Es Ventas brutas menos Devoluciones.',
					'Es la base de los porcentajes y márgenes de toda la pantalla.',
				],
			},
		].concat(seccion_de_moneda(model)),
		cuenta: {
			titulo: 'Con los números de este período',
			filas: [
				{ etiqueta: 'Ventas brutas', valor: dinero(formatear, model.ventas_brutas) },
				{ etiqueta: '(–) Devoluciones', valor: dinero(formatear, model.devoluciones), tipo: 'resta' },
				{ etiqueta: '= Ventas netas', valor: dinero(formatear, model.ventas_netas), tipo: 'total' },
			],
		},
	}
}

function costo_mercaderia_vendida(model) {
	return {
		titulo: 'Costo de mercadería vendida',
		resumen: 'Lo que te costó la mercadería vendida ' + periodo(model) + '.',
		iva: {
			tono: 'no',
			etiqueta: 'Sin IVA recuperable',
			detalle: 'Si tu cuenta guarda los costos con el IVA de compra incluido y lo recuperás como crédito fiscal, ese IVA se descuenta; si los guarda sin IVA, se toman tal cual. Un monotributista no recupera ese IVA, así que no se le descuenta.',
		},
		secciones: [
			{
				titulo: 'De dónde sale',
				items: [
					'Por cada artículo vendido: el costo guardado en la venta por la cantidad, con la fecha de la venta.',
					'El tratamiento del IVA de compra es el que tenés configurado hoy, aunque lo hayas cambiado durante el período.',
					'Los Costos del módulo de Ventas no descuentan el IVA de compra y miden un conjunto de ventas algo distinto, por eso pueden diferir.',
					'El costo de lo devuelto va en la fila siguiente, cuando hubo devoluciones.',
					frase_del_porcentaje(),
				],
			},
		].concat(seccion_de_moneda(model)),
	}
}

function costo_mercaderia_devuelta(model) {
	return {
		titulo: 'Costo de mercadería devuelta',
		resumen: 'El costo de la mercadería que los clientes devolvieron con notas de crédito ' + periodo(model) + '.',
		iva: {
			tono: 'no',
			etiqueta: 'Sin IVA recuperable',
			detalle: 'Se trata igual que el costo de mercadería vendida, para que las dos puntas estén en la misma base.',
		},
		secciones: [
			{
				titulo: 'De dónde sale',
				items: [
					'Por cada artículo de una nota de crédito del período: el costo que tenía en la venta original por la cantidad devuelta.',
					'Se le resta al costo vendido (por eso el signo +): las devoluciones ya se restaron de las ventas y su costo tiene que acompañarlas.',
					'Esta fila solo aparece cuando hubo devoluciones con artículos.',
				],
			},
		].concat(seccion_de_moneda(model)),
	}
}

function resultado_bruto(model, formatear) {
	let filas = [
		{ etiqueta: 'Ventas netas', valor: dinero(formatear, model.ventas_netas) },
		{ etiqueta: '(–) Costo de mercadería vendida', valor: dinero(formatear, model.costo_mercaderia_vendida), tipo: 'resta' },
	]
	if (model.costo_mercaderia_devuelta) {
		filas.push({ etiqueta: '(+) Costo de mercadería devuelta', valor: dinero(formatear, model.costo_mercaderia_devuelta), tipo: 'resta' })
	}
	filas.push({ etiqueta: '= Resultado bruto', valor: dinero(formatear, model.resultado_bruto), tipo: 'total' })

	let items = [
		'Ventas netas menos el costo de la mercadería vendida (y más el de la devuelta, si hubo). El porcentaje entre paréntesis es el margen bruto sobre las ventas netas.',
		'Usa el mismo criterio que la Ganancia del módulo de Ventas, pero acá además se descuentan las devoluciones y el conjunto de ventas no es exactamente el mismo.',
	]
	if (Number(model.resultado_bruto) < 0) {
		items.push('Es negativo: las ventas netas no alcanzaron a cubrir el costo de la mercadería.')
	}

	return con_avisos({
		titulo: 'Resultado bruto',
		resumen: 'Lo que queda de las ventas después de pagar la mercadería, antes de los gastos.',
		iva: {
			tono: 'no',
			etiqueta: 'Sin IVA',
			detalle: 'Las ventas van sin el IVA de las facturas y el costo sin el IVA de compra recuperable: la resta se hace en la misma base.',
		},
		secciones: [
			{ titulo: 'De dónde sale', items: items },
		].concat(seccion_de_moneda(model)),
		cuenta: {
			titulo: 'Con los números de este período',
			filas: filas,
		},
	}, [aviso_de_iva_sin_medir(model)])
}

function gastos_operativos(model, formatear) {
	let filas = []
	let categorias = (model.gastos_por_categoria || []).filter(categoria => Number(categoria.total) !== 0)
	categorias.slice(0, 6).forEach(categoria => {
		filas.push({ etiqueta: categoria.concepto, valor: dinero(formatear, categoria.total) })
	})
	if (categorias.length > 6) {
		let resto = categorias.slice(6).reduce((suma, categoria) => suma + Number(categoria.total), 0)
		filas.push({ etiqueta: 'Otras categorías (' + (categorias.length - 6) + ')', valor: dinero(formatear, resto) })
	}
	if (filas.length > 1) {
		filas.push({ etiqueta: '= Gastos operativos', valor: dinero(formatear, model.gastos_operativos), tipo: 'total' })
	}

	let explicacion = {
		titulo: 'Gastos operativos',
		resumen: 'Todos los gastos cargados ' + periodo(model) + ', agrupados por categoría.',
		iva: {
			tono: 'parcial',
			etiqueta: 'Depende de cada gasto',
			detalle: 'Cada gasto va por el monto que cargaste; si ese monto incluye IVA, el IVA queda adentro. (El "Importe IVA" del gasto solo alimenta el IVA crédito de Posición fiscal.)',
		},
		secciones: [
			{
				titulo: 'De dónde sale',
				items: [
					'Suma los gastos cargados en el período, por su fecha de carga.',
					'Las comisiones de cobro van en su propia fila, más abajo, para que no se resten dos veces.',
					frase_del_porcentaje(),
				],
			},
		].concat(seccion_de_moneda(model)),
	}

	if (filas.length) {
		explicacion.cuenta = {
			titulo: 'Por categoría en este período',
			filas: filas,
		}
	}

	return explicacion
}

function resultado_operativo(model, formatear) {
	return {
		titulo: 'Resultado operativo',
		resumen: 'Lo que queda después de pagar la mercadería y los gastos del negocio.',
		iva: {
			tono: 'parcial',
			etiqueta: 'Depende de los gastos',
			detalle: 'Las ventas y el costo van sin IVA. Los gastos van por el monto cargado, y si incluye IVA, queda adentro.',
		},
		secciones: [
			{
				titulo: 'De dónde sale',
				items: [
					'Es Resultado bruto menos Gastos operativos. Todavía no descuenta Ingresos Brutos ni las comisiones de cobro.',
					frase_del_porcentaje(),
				],
			},
		].concat(seccion_de_moneda(model)),
		cuenta: {
			titulo: 'Con los números de este período',
			filas: [
				{ etiqueta: 'Resultado bruto', valor: dinero(formatear, model.resultado_bruto) },
				{ etiqueta: '(–) Gastos operativos', valor: dinero(formatear, model.gastos_operativos), tipo: 'resta' },
				{ etiqueta: '= Resultado operativo', valor: dinero(formatear, model.resultado_operativo), tipo: 'total' },
			],
		},
	}
}

function comisiones_de_cobro(model) {
	return {
		titulo: 'Comisiones de cobro',
		resumen: 'Lo que retienen los medios de cobro (por ejemplo Mercado Pago o las tarjetas) en los cobros ' + periodo(model) + '.',
		iva: {
			tono: 'neutro',
			etiqueta: 'Tal como se registró',
			detalle: 'Se toma el importe de cada comisión como quedó registrado; este reporte no le separa IVA.',
		},
		secciones: [
			{
				titulo: 'De dónde sale',
				items: [
					'Cada comisión se registra sola, como un gasto, al cobrar con un medio que tiene la comisión cargada.',
					'Va acá y no en Gastos operativos para que no se reste dos veces, y cuenta por la fecha de ese gasto.',
					frase_del_porcentaje(),
				],
			},
		].concat(seccion_de_moneda(model)),
	}
}

function iibb_determinado(model) {
	let items = [
		'Por cada impuesto sobre ventas activo: precio sin IVA por cantidad de las líneas vendidas en el período a las que aplica (a todas, o solo a los artículos que lo tienen asignado), por su porcentaje. Sin impuestos activos, da cero.',
		'Usa el porcentaje de hoy: si lo cambiaste durante el período, puede no coincidir con lo trasladado en ventas viejas.',
		'Se calcula siempre en pesos y sobre todas las ventas del período, sea cual sea la moneda elegida arriba.',
		frase_del_porcentaje(),
	]
	if (model.moneda == 'dolares') {
		items.push('Por eso en dólares se ve "—" y el resultado neto en dólares no lo descuenta.')
	}
	if (model.moneda == 'consolidado') {
		items.push('En la vista consolidada se suma una sola vez y sin aplicarle la cotización.')
	}

	return {
		titulo: 'IIBB determinado',
		resumen: 'Una estimación de lo que corresponde de Ingresos Brutos por las ventas ' + periodo(model) + '.',
		iva: {
			tono: 'no',
			etiqueta: 'Sobre precios sin IVA',
			detalle: 'La base es el precio sin IVA de cada artículo vendido.',
		},
		secciones: [
			{ titulo: 'Cómo se calcula', items: items },
		],
	}
}

function resultado_neto(model, formatear) {
	let filas = [
		{ etiqueta: 'Resultado operativo', valor: dinero(formatear, model.resultado_operativo) },
	]
	if (model.iibb_determinado !== null && typeof model.iibb_determinado != 'undefined') {
		filas.push({ etiqueta: '(–) IIBB determinado', valor: dinero(formatear, model.iibb_determinado), tipo: 'resta' })
	}
	filas.push({ etiqueta: '(–) Comisiones de cobro', valor: dinero(formatear, model.comisiones_de_cobro), tipo: 'resta' })
	filas.push({ etiqueta: '= Resultado neto', valor: dinero(formatear, model.resultado_neto), tipo: 'total' })

	let items = [
		'Es Resultado operativo menos el IIBB determinado y las comisiones de cobro. El porcentaje entre paréntesis es el margen neto sobre las ventas netas.',
	]
	if (model.moneda == 'dolares') {
		items.push('En dólares no se descuenta el IIBB, porque se calcula siempre en pesos y no se puede atribuir a una moneda.')
	}
	if (Number(model.resultado_neto) < 0) {
		items.push('Es negativo: lo vendido no alcanzó a cubrir la mercadería, los gastos, Ingresos Brutos y las comisiones de cobro.')
	}

	return {
		titulo: 'Resultado neto',
		resumen: 'Lo que le queda al negocio ' + periodo(model) + ', después de la mercadería, los gastos, Ingresos Brutos y las comisiones de cobro.',
		iva: {
			tono: 'parcial',
			etiqueta: 'Depende de los gastos',
			detalle: 'Las ventas y el costo van sin IVA. Los gastos y las comisiones van por el monto registrado, y si incluye IVA, queda adentro.',
		},
		secciones: [
			{ titulo: 'De dónde sale', items: items },
		].concat(seccion_de_moneda(model)),
		cuenta: {
			titulo: 'Con los números de este período',
			filas: filas,
		},
	}
}

/**
 * Punto de entrada: la explicación de una fila.
 *
 * @param {string} concepto ventas_brutas | devoluciones | ventas_netas | costo_mercaderia_vendida |
 *                          costo_mercaderia_devuelta | resultado_bruto | gastos_operativos |
 *                          resultado_operativo | comisiones_de_cobro | iibb_determinado | resultado_neto
 * @param {Object} model Estado de resultados tal como lo devuelve la API.
 * @param {Function} formatear Formato de moneda del reporte.
 * @returns {Object|null} null si el modelo todavía no cargó o el concepto no existe.
 */
export default function explicacion_de_fila(concepto, model, formatear) {
	if (!model || typeof model.ventas_netas == 'undefined') {
		return null
	}
	switch (concepto) {
		case 'ventas_brutas':
			return ventas_brutas(model)
		case 'devoluciones':
			return devoluciones(model)
		case 'ventas_netas':
			return ventas_netas(model, formatear)
		case 'costo_mercaderia_vendida':
			return costo_mercaderia_vendida(model)
		case 'costo_mercaderia_devuelta':
			return costo_mercaderia_devuelta(model)
		case 'resultado_bruto':
			return resultado_bruto(model, formatear)
		case 'gastos_operativos':
			return gastos_operativos(model, formatear)
		case 'resultado_operativo':
			return resultado_operativo(model, formatear)
		case 'comisiones_de_cobro':
			return comisiones_de_cobro(model)
		case 'iibb_determinado':
			return iibb_determinado(model)
		case 'resultado_neto':
			return resultado_neto(model, formatear)
	}
	return null
}
