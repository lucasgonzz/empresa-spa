import moment from 'moment'

/**
 * Cálculo de las cuotas de un plan de pago para la vista previa del modal «Nuevo plan de pago»
 * (misión planes-de-pago-saldo-y-dolares, 21/10/2026).
 *
 * 🔴 Es ESPEJO de empresa-api `App\Services\PaymentPlan\PaymentPlanService`
 * (`importes_de_las_cuotas()` y `fecha_de_la_cuota()`): el back NO recibe los importes ni las
 * fechas de la vista previa, los vuelve a calcular con el mismo algoritmo. Si se cambia uno y no el
 * otro, el modal muestra cuotas distintas de las que se guardan.
 *
 * Fechas siempre como 'YYYY-MM-DD' y con moment(fecha, FORMATO): `new Date('YYYY-MM-DD')` se
 * interpreta en UTC y en Argentina corre la fecha un día para atrás.
 */

/* Formato de fecha que habla la API y el input type="date". */
export const FORMATO = 'YYYY-MM-DD'

/* Tope de cuotas: el mismo que PaymentPlanService::MAXIMO_DE_CUOTAS. */
export const MAXIMO_DE_CUOTAS = 120

/* Tope del importe: el mismo que PaymentPlanService::MAXIMO_IMPORTE (decimal 12,2). */
export const MAXIMO_IMPORTE = 9999999999.99

/**
 * Redondea a centavos, como el round(x, 2) del back. Se aplica al importe ANTES de calcular y de
 * mandar: con tres decimales tipeados (0,285) el back redondeaba primero y la vista previa no, y
 * las cuotas diferían en un centavo.
 *
 * @param {Number|String} importe
 * @returns {Number}
 */
export function redondear_a_centavos(importe) {
	/*
		Por exponente y no por `* 100`: 0.285 * 100 es 28,499999... en float y Math.round daba 28,
		mientras que el round() de PHP da 29. Corriendo la coma en el texto ("0.285e2" = 28,5) los
		dos redondean igual. Si el texto no sirve para eso (ya viene en notación exponencial), se
		cae al cálculo directo.
	*/
	let numero = Number(importe)
	let por_exponente = Number(Math.round(Number(String(numero) + 'e2')) + 'e-2')
	if (isNaN(por_exponente)) {
		return Math.round(numero * 100) / 100
	}
	return por_exponente
}

/* Frecuencias que ofrece el modal (valores del enum `payment_plans.frequency`). */
export const FRECUENCIAS = [
	{ value: 'monthly', text: 'Mensual' },
	{ value: 'biweekly', text: 'Cada 15 días' },
	{ value: 'weekly', text: 'Semanal' },
]

/**
 * Le pone la moneda a un importe ya formateado con price(): "$1.200" queda igual en pesos y pasa a
 * "USD 1.200" en dólares. Misma regla que _check_moneda() de common-vue/mixins/generals.js (la
 * columna Total de Ventas): current_acount_simbolo_moneda() antepone "USD " sin sacar el "$" y
 * dejaba "USD $1.200".
 *
 * @param {String} texto Resultado de price().
 * @param {Number} moneda_id 1 pesos, 2 dólares.
 * @returns {String}
 */
export function con_moneda(texto, moneda_id) {
	if (moneda_id != 2 || typeof texto != 'string') {
		return texto
	}
	let importe = texto.match(/^(-?)\$\s?(.*)$/)
	return importe ? 'USD ' + importe[1] + importe[2] : texto
}

/**
 * Reparte un importe en cuotas iguales en centavos, redondeando hacia abajo; la última absorbe la
 * diferencia para que la suma dé exacto (1.000.000 en 3 → 333.333,33 ×2 y 333.333,34).
 *
 * @param {Number} total Importe a financiar.
 * @param {Number} cantidad_cuotas Entero mayor o igual a 1.
 * @returns {Number[]} Un importe por cuota, en orden.
 */
export function importes_de_las_cuotas(total, cantidad_cuotas) {
	/* Importe total en centavos enteros, para que el float no corra la última cuota. */
	let total_en_centavos = Math.round(Number(total) * 100)
	/* Centavos de cada cuota menos la última. */
	let centavos_por_cuota = Math.floor(total_en_centavos / cantidad_cuotas)

	let importes = []
	for (let i = 1; i < cantidad_cuotas; i++) {
		importes.push(centavos_por_cuota / 100)
	}
	// La última se queda con lo que falta para llegar al total.
	importes.push((total_en_centavos - centavos_por_cuota * (cantidad_cuotas - 1)) / 100)

	return importes
}

/**
 * Vencimiento de la cuota N contado desde la fecha de inicio (no encadenado sobre la anterior):
 * un plan que arranca el 31/1 vence 31/1, 28/2, 31/3. moment.add('months') recorta al último día
 * del mes igual que Carbon::addMonthsNoOverflow().
 *
 * @param {String} fecha_inicio YYYY-MM-DD de la primera cuota.
 * @param {Number} numero_cuota Desde 1.
 * @param {String} frequency monthly | biweekly | weekly.
 * @returns {String} YYYY-MM-DD
 */
export function fecha_de_la_cuota(fecha_inicio, numero_cuota, frequency) {
	/* Períodos que pasan desde la primera cuota. */
	let periodos = numero_cuota - 1
	let fecha = moment(fecha_inicio, FORMATO)

	if (frequency == 'weekly') {
		fecha.add(periodos, 'weeks')
	} else if (frequency == 'biweekly') {
		fecha.add(15 * periodos, 'days')
	} else {
		fecha.add(periodos, 'months')
	}

	return fecha.format(FORMATO)
}

/**
 * Las cuotas de la vista previa: número, vencimiento e importe de cada una.
 *
 * Devuelve [] mientras los datos no alcanzan para armar el plan (importe no positivo, cantidad
 * fuera de rango o sin fecha): el modal muestra el estado vacío en lugar de cuotas a medias.
 *
 * @param {Number} total Importe a financiar.
 * @param {Number} cantidad_cuotas
 * @param {String} fecha_inicio YYYY-MM-DD
 * @param {String} frequency
 * @returns {Array<{numero_cuota: Number, fecha_vencimiento: String, amount: Number}>}
 */
export function cuotas_del_plan(total, cantidad_cuotas, fecha_inicio, frequency) {
	let cuotas = []

	if (!datos_validos(total, cantidad_cuotas, fecha_inicio)) {
		return cuotas
	}

	let importes = importes_de_las_cuotas(redondear_a_centavos(total), cantidad_cuotas)
	importes.forEach((amount, indice) => {
		cuotas.push({
			numero_cuota: indice + 1,
			fecha_vencimiento: fecha_de_la_cuota(fecha_inicio, indice + 1, frequency),
			amount: amount,
		})
	})

	return cuotas
}

/**
 * Si los datos alcanzan para armar el plan, con el mismo criterio que el 422 del back.
 *
 * @param {Number} total
 * @param {Number} cantidad_cuotas
 * @param {String} fecha_inicio
 * @returns {Boolean}
 */
export function datos_validos(total, cantidad_cuotas, fecha_inicio) {
	let importe = redondear_a_centavos(total)
	if (!(importe > 0) || importe > MAXIMO_IMPORTE) {
		return false
	}
	if (!Number.isInteger(cantidad_cuotas) || cantidad_cuotas < 1 || cantidad_cuotas > MAXIMO_DE_CUOTAS) {
		return false
	}
	// Cada cuota lleva al menos un centavo: con menos, el reparto deja cuotas en $0 (el back da 422).
	if (Math.round(importe * 100) < cantidad_cuotas) {
		return false
	}
	return !!fecha_inicio && moment(fecha_inicio, FORMATO, true).isValid()
}
