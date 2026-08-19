// Informe de un test en rojo, impreso en la consola apenas ese test termina.
//
// 🔴 El problema que resuelve, medido el 17/8/2026:
//
// El reporter "list" imprime la linea con la cruz apenas el test termina, pero el DETALLE del error
// lo junta todo para el resumen del final de la corrida. Una corrida completa son ~12 minutos, asi
// que Lucas ve la cruz y no se entera de nada durante los minutos que siguen; y si corta la corrida
// con Ctrl+C --que es exactamente lo que uno hace cuando ya vio la cruz-- el resumen no llega a
// imprimirse nunca. La consola queda con dos cruces y cero informacion sobre que fallo.
//
// Esto no reemplaza al reporter: lo adelanta. El informe navegable completo, con el trace y la
// captura, sigue quedando en playwright-report/ (reporter "html" de playwright.config.js).
const path = require('path')

/** Cuantas lineas del mensaje de error se imprimen antes de cortar. */
const MAXIMO_DE_LINEAS = 40

/**
 * Imprime en la consola que fue lo que fallo en un test.
 *
 * Se llama desde un afterEach: en e2e/fixtures.js para todos los specs, y en e2e/auth.setup.js
 * para el proyecto de setup (que no usa el fixture porque no navega la aplicacion, solo loguea).
 *
 * @param {import('@playwright/test').TestInfo} testInfo informacion del test que acaba de terminar.
 * @returns {void}
 */
function informar_fallo(testInfo) {
	const error = testInfo.error

	const lineas = []
	lineas.push('')
	lineas.push('─────────────────────────────────────────────────────────────────────')
	lineas.push('FALLO: ' + testInfo.titlePath.slice(1).join(' > '))
	// Es donde arranca el test, no la linea que fallo: testInfo no la trae. La linea exacta sale
	// en el mensaje del error de mas abajo y en el reporte html.
	lineas.push('Test:  ' + path.relative(process.cwd(), testInfo.file) + ':' + testInfo.line)

	if (testInfo.status === 'timedOut') {
		lineas.push('Motivo: se paso del timeout del test (' + testInfo.timeout + ' ms).')
	}

	if (error && error.message) {
		lineas.push('')
		// El mensaje de una asercion de Playwright ya trae arriba lo importante: el locator, lo
		// esperado, lo recibido y el call log. Se corta para que un call log largo no tape las
		// lineas de los otros tests en la consola; el completo esta en el reporte html.
		const mensaje = error.message.split('\n')
		lineas.push(mensaje.slice(0, MAXIMO_DE_LINEAS).join('\n'))
		if (mensaje.length > MAXIMO_DE_LINEAS) {
			lineas.push(
				'  ... (' + (mensaje.length - MAXIMO_DE_LINEAS) +
				' lineas mas; el detalle completo esta en el reporte html)'
			)
		}
	} else if (!error) {
		lineas.push('')
		lineas.push('Playwright no dejo ningun error asociado. Suele ser que el proceso se corto')
		lineas.push('desde afuera (Ctrl+C) o que se cayo el navegador.')
	}

	// Se nombra la CARPETA y no testInfo.attachments a proposito: este informe corre en un
	// afterEach, o sea ANTES de que Playwright cierre la pagina, y tanto la captura de
	// `screenshot: 'only-on-failure'` como el trace de `trace: 'retain-on-failure'` se escriben
	// recien en ese cierre. En attachments todavia no estan; en outputDir van a estar, con nombre
	// fijo.
	lineas.push('')
	lineas.push('Para mirar que paso (se escriben al cerrar el navegador):')
	lineas.push('  captura: ' + path.join(testInfo.outputDir, 'test-failed-1.png'))
	lineas.push('  trace:   npx playwright show-trace "' + path.join(testInfo.outputDir, 'trace.zip') + '"')

	lineas.push('─────────────────────────────────────────────────────────────────────')
	lineas.push('')

	console.log(lineas.join('\n'))
}

/**
 * Informa solo si el test no termino como se esperaba.
 *
 * La comparacion es contra expectedStatus y no contra 'failed' a proposito: asi un test marcado
 * con test.fail() que pasa --o sea, que dejo de fallar-- tambien se informa.
 *
 * @param {import('@playwright/test').TestInfo} testInfo
 * @returns {void}
 */
function informar_si_fallo(testInfo) {
	if (testInfo.status === testInfo.expectedStatus) {
		return
	}
	informar_fallo(testInfo)
}

module.exports = {
	MAXIMO_DE_LINEAS,
	informar_fallo,
	informar_si_fallo,
}
