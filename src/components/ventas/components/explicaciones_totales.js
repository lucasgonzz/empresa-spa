/**
 * Textos de las explicaciones (popover al pasar el mouse / tocar) de las tarjetas de totales del
 * módulo de Ventas. Es un módulo de funciones puras, sin Vue: recibe los números que ya tiene
 * `Total.vue` y devuelve el objeto que dibuja `common/ExplicacionDeNumero.vue`.
 *
 * Dónde vive cada cosa, para quien tenga que corregir un texto (todo en empresa-api):
 *   · qué suma cada tarjeta          → `ListadoVentasHelper::totales()`
 *   · de qué ventas                  → `SaleController::index()` + `ListadoVentasHelper::aplicar_*`
 *   · cuánto IVA declaró una venta   → `IvaDeVentaHelper`
 *   · cuánto IVA trae el costo       → `CostoDeVentaHelper`
 *   · cómo se calcula la ganancia    → `SaleHelper::calcular_ganancia()`
 * Cada frase de acá está escrita leyendo esos archivos. Si el cálculo cambia, se cambia el texto:
 * una explicación que no coincide con el número es peor que no tener ninguna.
 *
 * 🔴 Lo que depende de la configuración del comercio NO se afirma: se condiciona ("si tu cuenta
 * guarda los costos con IVA...") o se toma del dato. `total_sin_iva` y `costos_sin_iva` son claves
 * OPCIONALES que agrega la API dentro de `totales.pesos`; con una API vieja no vienen, y entonces
 * la explicación se escribe sin la cuenta "sin IVA" y sin afirmar nada que dependa de ella.
 *
 * 🔴 Los textos son CORTOS a propósito. Una explicación abre al pasar el mouse y en escritorio no se
 * puede scrollear (el popover no recibe el puntero, para no tapar las tarjetas vecinas): si no entra
 * en la pantalla, lo que sobra no se lee. Antes de sumar un párrafo, sacar otro.
 *
 * 🔴 El panel de Ventas y el Estado de Resultados NO miden exactamente el mismo conjunto de ventas:
 * el panel deja afuera las ventas en revisión y las que tienen un estado de venta, puede fechar por
 * fecha de pedido, y toma como pesos solo las de moneda 1; el reporte cuenta todas las terminadas,
 * por fecha de carga, y trata la moneda vacía como pesos. Por eso ningún texto de acá dice que un
 * número "es el mismo" que el del reporte: dice que usa el mismo criterio de IVA.
 *
 * Lenguaje de comerciante: sin nombres de clases, tablas ni columnas.
 */

/** Primer día posible en que la ganancia guardada de cada venta descuenta el IVA (misión saneo-ganancia-ventas). Un comercio la recibe cuando actualiza. */
const FECHA_DESDE_LA_QUE_LA_GANANCIA_DESCUENTA_IVA = '2026-09-17'

/** Diferencia (en pesos) por debajo de la cual dos números "coinciden": es el redondeo de los centavos. */
const TOLERANCIA = 1

/**
 * ¿Vino un número opcional del servidor? Distingue "no vino" (API vieja) de "vino en cero".
 *
 * @param {*} valor
 * @returns {boolean}
 */
function vino(valor) {
	return valor !== null && typeof valor != 'undefined' && valor !== '' && !isNaN(Number(valor))
}

/**
 * Formatea un importe. Un cero se escribe "$0" y no "-", que es lo que devuelve el `price()` del
 * sistema para un valor falsy: en una cuenta explicada, un guión parece un dato que falta.
 *
 * @param {Function} formatear price() del componente.
 * @param {number} valor
 * @returns {string}
 */
function dinero(formatear, valor) {
	if (Number(valor) === 0) {
		return '$0'
	}
	return formatear(valor)
}

/**
 * Aviso de las ventas con comprobante autorizado cuyo IVA todavía no está registrado en el sistema
 * (en la API: `ventas_con_iva_sin_medir`). `null` si no hay ninguna o si la API vieja no mandó el dato
 * (con `undefined` no se afirma nada). "Medido" es jerga nuestra: al comerciante se le dice
 * "todavía no registrado en el sistema".
 *
 * @param {number|null} cantidad
 * @returns {string|null}
 */
function aviso_de_iva_sin_medir(cantidad) {
	if (!vino(cantidad) || Number(cantidad) <= 0) {
		return null
	}
	if (Number(cantidad) == 1) {
		return '1 venta tiene factura autorizada cuyo IVA todavía no está registrado en el sistema.'
	}
	return Number(cantidad) + ' ventas tienen factura autorizada cuyo IVA todavía no está registrado en el sistema.'
}

/**
 * La aclaración central de "Sin IVA": la duda de fondo de quien mira estos números es qué pasa con
 * lo que se vende sin factura, y la respuesta es que ahí no hay IVA declarado que separar.
 *
 * @returns {string}
 */
function frase_de_sin_iva() {
	return '"Sin IVA" significa sin el IVA que discriminó una factura. Si vendés sin factura, ese IVA queda adentro del número.'
}

/**
 * La frase sobre "qué ventas cuenta" que comparten Total, Costos, Ganancia y Cuenta corriente.
 *
 * @param {Object} c contexto.
 * @returns {string}
 */
function frase_de_que_ventas(c) {
	let frase
	if (c.usa_totales_del_servidor) {
		frase = 'Suma las ventas terminadas que ves, con los filtros elegidos (fechas, sucursal, vendedor, cobradas, factura, método de pago).'
	} else {
		/*
			Con el buscador o un filtro de columna la pantalla suma lo filtrado en TODAS las fechas, no el
			período elegido: por eso acá no se habla de fechas.
		*/
		frase = 'Con el buscador o un filtro de columna activo, suma solo las ventas que quedaron a la vista, de cualquier fecha.'
	}
	if (c.mostrar_consolidadas) {
		frase += ' Como tenés prendido "ver consolidadas", también entran las ventas agrupadoras, que repiten el importe.'
	}
	return frase
}

/**
 * La frase sobre en qué período cae cada venta. Es la misma para todas las tarjetas, y está escrita
 * de forma que sea cierta sin importar quién mire (el dueño o un empleado): la preferencia de fechar
 * por pedido vive en la fila del dueño y el empleado no la ve.
 *
 * @returns {string}
 */
function frase_de_fechas() {
	return 'Cada venta cae en el período por su fecha de carga, o por la de pedido si el comercio lo configuró así.'
}

/**
 * Total en pesos.
 *
 * @param {Object} c contexto.
 * @returns {Object}
 */
function total(c) {
	let items = [
		/* Sin totales del servidor no hay período elegido: la frase de fechas no aplica (ver frase_de_que_ventas). */
		frase_de_que_ventas(c) + (c.usa_totales_del_servidor ? ' ' + frase_de_fechas() : ''),
		'Las notas de crédito no lo bajan: una venta devuelta sigue por su importe completo.',
		'Usa el mismo criterio de IVA que "Ventas brutas" del Estado de Resultados, pero no mide exactamente las mismas ventas: acá quedan afuera las que están en revisión o con estado.',
		frase_de_sin_iva(),
	]

	if (c.tiene_dolares) {
		items.splice(2, 0, 'Las ventas en dólares no se suman: tienen su propio total.')
	}

	if (c.metodo_de_pago && c.metodo_de_pago.total > 0) {
		items.push('Debajo del total se ve cuánto se cobró con ' + c.metodo_de_pago.nombre + ': ' + dinero(c.formatear, c.metodo_de_pago.total) + '.')
	}

	let explicacion = {
		titulo: 'Total',
		resumen: 'Todo lo vendido en pesos en las ventas que estás viendo.',
		iva: {
			tono: 'parcial',
			etiqueta: 'Lleva IVA en lo facturado',
			detalle: 'Las ventas con factura suman con el IVA que discrimina el comprobante. Las ventas sin factura suman su total tal cual: ahí no se declaró IVA, así que no se separa.',
		},
		secciones: [
			{ titulo: 'De dónde sale', items: items },
		],
	}

	if (c.usa_totales_del_servidor && vino(c.total_sin_iva)) {
		let iva_declarado = c.total - c.total_sin_iva
		explicacion.cuenta = {
			titulo: 'Con los números de este período',
			filas: [
				{ etiqueta: 'Total (con IVA de lo facturado)', valor: dinero(c.formatear, c.total) },
				{ etiqueta: '(–) IVA de las facturas emitidas', valor: dinero(c.formatear, iva_declarado), tipo: 'resta' },
				{ etiqueta: '= Total sin IVA', valor: dinero(c.formatear, c.total_sin_iva), tipo: 'total' },
			],
		}
	}

	if (c.usa_totales_del_servidor && aviso_de_iva_sin_medir(c.sin_medir)) {
		explicacion.avisos = [
			aviso_de_iva_sin_medir(c.sin_medir) + ' Entran completas en el "Total sin IVA", con su IVA adentro, así que ese número puede estar algo alto.',
		]
	}

	return explicacion
}

/**
 * Costos en pesos.
 *
 * @param {Object} c contexto.
 * @returns {Object}
 */
function costos(c) {
	let iva
	let cuenta = null

	if (c.usa_totales_del_servidor && vino(c.costos_sin_iva)) {
		let credito = c.costos - c.costos_sin_iva

		if (credito > TOLERANCIA) {
			iva = {
				tono: 'si',
				etiqueta: 'Trae IVA de compra',
				detalle: 'Tu cuenta guarda los costos con el IVA de compra incluido. Ese IVA lo recuperás como crédito fiscal, así que no es un costo real: la Ganancia ya lo descuenta.',
			}
			cuenta = {
				titulo: 'Con los números de este período',
				filas: [
					{ etiqueta: 'Costos (con IVA de compra)', valor: dinero(c.formatear, c.costos) },
					{ etiqueta: '(–) IVA de compra recuperable', valor: dinero(c.formatear, credito), tipo: 'resta' },
					{ etiqueta: '= Costos sin IVA', valor: dinero(c.formatear, c.costos_sin_iva), tipo: 'total' },
				],
			}
		} else {
			iva = {
				tono: 'no',
				etiqueta: 'Sin IVA para descontar',
				detalle: 'En tu cuenta no hay IVA de compra para descontarle al costo (o el costo ya se guarda sin IVA, o ese IVA no se recupera): este número es el costo real.',
			}
		}
	} else {
		iva = {
			tono: 'parcial',
			etiqueta: 'Depende de tu configuración',
			detalle: 'Si tu cuenta guarda los costos con el IVA de compra incluido, este número lo trae adentro; si los guarda sin IVA, es el costo real. La Ganancia ya tiene en cuenta esa diferencia.',
		}
	}

	let items_de_costos = [
		'Por cada artículo (y promoción) vendido: el costo que tenía guardado al momento de la venta, por la cantidad. Cuenta las mismas ventas que el Total.',
	]
	if (cuenta) {
		/* La línea "sin IVA" de la tarjeta aparece bajo esta misma condición (Total.vue: mostrar_costos_sin_iva). */
		items_de_costos.push('El número grande no descuenta el IVA de compra; la línea "sin IVA" de abajo, sí.')
	}
	items_de_costos.push('No baja por lo devuelto con notas de crédito. El "Costo de mercadería vendida" del Estado de Resultados usa el mismo criterio de IVA de compra, pero mide un conjunto de ventas algo distinto.')

	let explicacion = {
		titulo: 'Costos',
		resumen: 'Lo que te costó la mercadería de las ventas en pesos que estás viendo.',
		iva: iva,
		secciones: [
			{
				titulo: 'De dónde sale',
				items: items_de_costos,
			},
		],
	}

	if (cuenta) {
		explicacion.cuenta = cuenta
	}

	return explicacion
}

/**
 * Ganancia en pesos.
 *
 * @param {Object} c contexto.
 * @returns {Object}
 */
function ganancia(c) {
	let avisos = []

	let explicacion = {
		titulo: 'Ganancia',
		resumen: 'Lo que ganaste en las ventas en pesos que estás viendo.',
		iva: {
			tono: 'no',
			etiqueta: 'Sin el IVA facturado',
			detalle: 'Ya está sin el IVA de las facturas y, si tu cuenta guarda los costos con IVA, sin el IVA de compra que se recupera. Las ventas sin factura no declararon IVA: entran por su total.',
		},
		secciones: [
			{
				titulo: 'Cómo se calcula',
				items: [
					'En cada venta: el total, menos el IVA de su factura, menos su costo (sin el IVA de compra que recuperás). Esa ganancia queda guardada en la venta y acá se suman todas.',
					'Si el IVA de una factura todavía no está registrado en el sistema, esa venta no tiene ganancia calculada y no suma.',
					'No descuenta devoluciones. El "Resultado bruto" del Estado de Resultados usa el mismo criterio de IVA, pero sí las descuenta y mide un conjunto de ventas algo distinto.',
				],
			},
		],
	}

	if (c.usa_totales_del_servidor && vino(c.total_sin_iva) && vino(c.costos_sin_iva)) {
		let diferencia = c.total_sin_iva - c.costos_sin_iva
		let filas = [
			{ etiqueta: 'Total sin IVA', valor: dinero(c.formatear, c.total_sin_iva) },
			{ etiqueta: '(–) Costos sin IVA', valor: dinero(c.formatear, c.costos_sin_iva), tipo: 'resta' },
			{ etiqueta: '= Diferencia', valor: dinero(c.formatear, diferencia), tipo: 'total' },
		]

		let sin_medir = aviso_de_iva_sin_medir(c.sin_medir)

		if (sin_medir) {
			/*
				Con ventas de IVA sin medir la cuenta NO cierra, y se dice con el número en vez de
				insinuar una causa: esas ventas entran completas en el "Total sin IVA" y su ganancia
				no está calculada, así que no suman en la tarjeta.
			*/
			filas.push({ etiqueta: 'Ganancia de la tarjeta', valor: dinero(c.formatear, c.ganancia) })
			avisos.push(sin_medir + ' Entran completas en el "Total sin IVA" y su ganancia no está calculada, así que no suman en la Ganancia: esta cuenta no tiene por qué dar el mismo número.')
		} else if (Math.abs(diferencia - c.ganancia) > TOLERANCIA) {
			filas.push({ etiqueta: 'Ganancia de la tarjeta', valor: dinero(c.formatear, c.ganancia) })
			avisos.push('Esta cuenta no da exactamente la Ganancia de la tarjeta. Puede pasar si algunas ventas tienen la ganancia guardada con el criterio anterior o todavía sin calcular.')
		}

		explicacion.cuenta = {
			titulo: 'Con los números de este período',
			filas: filas,
		}
	}

	/*
		La fecha NO es la misma para todos: depende de cuándo actualizó cada comercio a la versión que
		descuenta el IVA. Por eso se dice "según cuándo actualizaste" y no se afirma un corte. Sin totales
		del servidor no hay período elegido (el buscador suma de cualquier fecha), así que no se avisa.
	*/
	if (c.usa_totales_del_servidor && typeof c.desde == 'string' && /^\d{4}-\d{2}-\d{2}/.test(c.desde) && c.desde.substr(0, 10) < FECHA_DESDE_LA_QUE_LA_GANANCIA_DESCUENTA_IVA) {
		avisos.push('Las ventas hechas antes de que tu sistema se actualizara a la versión que descuenta el IVA de las facturas (desde el 17/9/2026, según cuándo actualizaste) pueden tener la ganancia guardada con el criterio anterior, hasta que se recalculen.')
	}

	if (avisos.length) {
		explicacion.avisos = avisos
	}

	return explicacion
}

/**
 * Cuenta corriente en pesos.
 *
 * @param {Object} c contexto.
 * @returns {Object}
 */
function cuenta_corriente(c) {
	return {
		titulo: 'Cuenta corriente',
		resumen: 'El importe de las ventas en pesos hechas a un cliente que quedan en su cuenta corriente.',
		iva: {
			tono: 'parcial',
			etiqueta: 'Lleva IVA en lo facturado',
			detalle: 'Es una parte del Total y se calcula igual: las ventas con factura suman con el IVA del comprobante.',
		},
		secciones: [
			{
				titulo: 'De dónde sale',
				items: [
					'Suma el importe de las ventas hechas a un cliente, salvo las marcadas para no pasar por la cuenta corriente. Ya está dentro del Total.',
					'No es lo que los clientes todavía deben: es el importe de esas ventas, y los pagos posteriores no se restan. Las notas de crédito tampoco lo modifican.',
					frase_de_que_ventas(c),
				],
			},
		],
	}
}

/**
 * Cantidad de ventas.
 *
 * @param {Object} c contexto.
 * @returns {Object}
 */
function ventas(c) {
	return {
		titulo: 'Ventas',
		resumen: 'Cuántas ventas hay en pantalla con los filtros elegidos.',
		iva: {
			tono: 'neutro',
			etiqueta: 'Es una cantidad',
			detalle: 'No es un importe, así que no lleva IVA.',
		},
		secciones: [
			{
				titulo: 'De dónde sale',
				items: [
					'Cuenta las ventas terminadas, en pesos y en dólares.',
					frase_de_que_ventas(c),
				],
			},
		],
	}
}

/**
 * Las cuatro tarjetas en dólares. Se explican juntas porque comparten lo esencial: se suman en
 * dólares, no se convierten y no se les abre el IVA.
 *
 * @param {Object} c contexto.
 * @param {string} cual 'total' | 'costos' | 'ganancia' | 'cuenta_corriente'
 * @returns {Object}
 */
function en_dolares(c, cual) {
	let datos = {
		total: {
			titulo: 'Total USD',
			resumen: 'Todo lo vendido en dólares en las ventas que estás viendo.',
			que_suma: 'Suma el importe final de cada venta hecha en dólares, tal como quedó guardado.',
		},
		costos: {
			titulo: 'Costos USD',
			resumen: 'Lo que te costó la mercadería de las ventas en dólares que estás viendo.',
			que_suma: 'Suma el costo guardado de cada artículo vendido, por la cantidad, en las ventas hechas en dólares.',
		},
		ganancia: {
			titulo: 'Ganancia USD',
			resumen: 'Lo que ganaste en las ventas en dólares que estás viendo.',
			que_suma: 'Suma la ganancia guardada en cada venta hecha en dólares.',
			/*
				`set_sale_ganancia` resta el IVA declarado del comprobante sin mirar la moneda de la venta, y
				ese IVA está en pesos: en una venta en dólares con factura la resta mezcla monedas.
			*/
			iva_detalle: 'La ganancia de cada venta en dólares está guardada tal cual. Si la venta tiene factura, el IVA declarado (que ARCA informa en pesos) ya está restado, así que este número puede no ser exacto. Acá no se separa el IVA.',
		},
		cuenta_corriente: {
			titulo: 'Cuenta corriente USD',
			resumen: 'El importe de las ventas en dólares hechas a un cliente que quedan en su cuenta corriente.',
			que_suma: 'Suma el importe de las ventas en dólares hechas a un cliente, salvo las marcadas para no pasar por la cuenta corriente. Ya está dentro del Total USD y no es lo que los clientes todavía deben.',
		},
	}[cual]

	return {
		titulo: datos.titulo,
		resumen: datos.resumen,
		iva: {
			tono: 'neutro',
			etiqueta: 'Sin desglose de IVA',
			detalle: datos.iva_detalle || 'Acá no se separa el IVA de las ventas en dólares: el número es el que quedó guardado en cada venta.',
		},
		secciones: [
			{
				titulo: 'De dónde sale',
				items: [
					datos.que_suma,
					'Está en dólares: no se convierte a pesos ni se suma al total en pesos.',
					frase_de_que_ventas(c),
				],
			},
		],
	}
}

/**
 * Punto de entrada: la explicación de una tarjeta.
 *
 * El contexto que espera (todo lo arma `Total.vue`):
 *   formatear                 función que da formato de moneda (el `price()` del sistema)
 *   usa_totales_del_servidor  true si los números vienen calculados por la API (no del navegador)
 *   total, costos, ganancia   los tres importes en pesos que muestra la pantalla
 *   total_sin_iva             opcional, de la API
 *   costos_sin_iva            opcional, de la API
 *   sin_medir                 opcional, de la API: ventas con factura autorizada cuyo IVA no está registrado
 *   mostrar_consolidadas      true si está prendido "ver consolidadas" (entran las ventas agrupadoras)
 *   desde                     primer día del período (AAAA-MM-DD), para avisar de ventas viejas
 *   tiene_dolares             true si el comercio vende en dólares
 *   metodo_de_pago            { nombre, total } del método elegido en el filtro, o null
 *
 * @param {string} tarjeta total | costos | ganancia | cuenta_corriente | ventas |
 *                         total_usd | costos_usd | ganancia_usd | cuenta_corriente_usd
 * @param {Object} c contexto.
 * @returns {Object|null}
 */
export default function explicacion_de_tarjeta(tarjeta, c) {
	switch (tarjeta) {
		case 'total':
			return total(c)
		case 'costos':
			return costos(c)
		case 'ganancia':
			return ganancia(c)
		case 'cuenta_corriente':
			return cuenta_corriente(c)
		case 'ventas':
			return ventas(c)
		case 'total_usd':
			return en_dolares(c, 'total')
		case 'costos_usd':
			return en_dolares(c, 'costos')
		case 'ganancia_usd':
			return en_dolares(c, 'ganancia')
		case 'cuenta_corriente_usd':
			return en_dolares(c, 'cuenta_corriente')
	}
	return null
}
